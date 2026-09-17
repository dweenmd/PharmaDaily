-- ---------------------------------------------------------------------------
-- Fix: receiving a transfer failed, because the receiver cannot see the
-- sender's stock
--
-- receive_stock_transfer() read the source batch to copy its expiry and
-- pricing to the destination. It runs SECURITY INVOKER — deliberately, so RLS
-- decides what the caller may touch — and RLS scopes branch_stocks to the
-- caller's own branch. The receiver therefore saw NOTHING, the copied values
-- came back NULL, and the insert failed on expiry_date's NOT NULL constraint.
--
-- Caught only by running the whole lifecycle as two different real users.
-- Every earlier check passed: the failure needed a destination-branch manager
-- receiving a batch belonging to a source branch, which no single-user test
-- reproduces.
--
-- THE FIX is not to widen anyone's access. It is to put the details ON THE
-- TRANSFER, which is a document about both branches and which both can read.
-- A delivery note lists what is in the box; the receiver should not have to
-- go and look in the sender's stockroom to find out what they have been sent.
--
-- It also freezes what was transferred: if the source batch is later
-- repriced, that must not retroactively change what arrived here.
-- ---------------------------------------------------------------------------

alter table public.stock_transfer_items
  add column expiry_date date,
  add column purchase_price numeric(12, 2),
  add column selling_price numeric(12, 2),
  add column mrp numeric(12, 2),
  add column supplier_id uuid references public.suppliers (id) on delete set null;

-- Backfill from the source batches for anything already in flight.
update public.stock_transfer_items ti
set expiry_date = bs.expiry_date,
    purchase_price = bs.purchase_price,
    selling_price = bs.selling_price,
    mrp = bs.mrp,
    supplier_id = bs.supplier_id
from public.branch_stocks bs
where bs.id = ti.source_stock_id
  and ti.expiry_date is null;

comment on column public.stock_transfer_items.expiry_date is
  'Copied from the source batch when the transfer is requested. The receiver cannot read the sender''s stock, and a later reprice must not change what was already sent.';

-- ---------------------------------------------------------------------------
-- Requesting now records the batch details on the line.
-- ---------------------------------------------------------------------------
create or replace function public.create_stock_transfer(
  p_from_branch_id uuid,
  p_to_branch_id uuid,
  p_items jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_transfer_id uuid;
  v_item jsonb;
  v_stock record;
  v_quantity integer;
begin
  if not public.can_manage_catalogue() then
    raise exception 'You are not allowed to request stock transfers' using errcode = '42501';
  end if;

  select p.id into v_profile_id
  from public.profiles p
  where p.auth_id = (select auth.uid())
    and p.is_active = true
    and p.deleted_at is null;

  if v_profile_id is null then
    raise exception 'No active profile for the current user' using errcode = '42501';
  end if;

  if p_from_branch_id = p_to_branch_id then
    raise exception 'A transfer needs two different branches' using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one item to transfer' using errcode = '22023';
  end if;

  insert into public.stock_transfers (
    from_branch_id, to_branch_id, reference_no, transferred_by, notes
  )
  values (
    p_from_branch_id, p_to_branch_id, public.next_transfer_no(), v_profile_id,
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning id into v_transfer_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Quantity must be at least 1 for every item' using errcode = '22023';
    end if;

    select bs.id, bs.medicine_id, bs.batch_no, bs.quantity, bs.reserved_quantity, bs.branch_id,
           bs.expiry_date, bs.purchase_price, bs.selling_price, bs.mrp, bs.supplier_id,
           m.name as medicine_name
    into v_stock
    from public.branch_stocks bs
    join public.medicines m on m.id = bs.medicine_id
    where bs.id = (v_item ->> 'source_stock_id')::uuid;

    if v_stock.id is null then
      raise exception 'That batch no longer exists' using errcode = '23503';
    end if;

    if v_stock.branch_id <> p_from_branch_id then
      raise exception 'Cannot transfer stock that belongs to another branch'
        using errcode = '42501';
    end if;

    if (v_stock.quantity - v_stock.reserved_quantity) < v_quantity then
      raise exception 'Only % of % is available in batch %',
        (v_stock.quantity - v_stock.reserved_quantity), v_stock.medicine_name, v_stock.batch_no
        using errcode = '23514';
    end if;

    insert into public.stock_transfer_items (
      transfer_id, medicine_id, source_stock_id, batch_no, quantity,
      expiry_date, purchase_price, selling_price, mrp, supplier_id
    )
    values (
      v_transfer_id, v_stock.medicine_id, v_stock.id, v_stock.batch_no, v_quantity,
      v_stock.expiry_date, v_stock.purchase_price, v_stock.selling_price, v_stock.mrp,
      v_stock.supplier_id
    );
  end loop;

  return v_transfer_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Receiving now reads the transfer line instead of the sender's stock.
-- ---------------------------------------------------------------------------
create or replace function public.receive_stock_transfer(
  p_transfer_id uuid,
  p_receipts jsonb default '[]'::jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_transfer record;
  v_item record;
  v_receipt jsonb;
  v_received integer;
  v_reason text;
begin
  select p.id into v_profile_id
  from public.profiles p
  where p.auth_id = (select auth.uid())
    and p.is_active = true
    and p.deleted_at is null;

  if v_profile_id is null then
    raise exception 'No active profile for the current user' using errcode = '42501';
  end if;

  if not public.can_manage_catalogue() then
    raise exception 'You are not allowed to receive stock' using errcode = '42501';
  end if;

  select t.id, t.status, t.from_branch_id, t.to_branch_id
  into v_transfer
  from public.stock_transfers t
  where t.id = p_transfer_id
  for update;

  if v_transfer.id is null then
    raise exception 'Transfer not found' using errcode = '23503';
  end if;

  if v_transfer.status <> 'approved' then
    raise exception 'Only a dispatched transfer can be received — this one is %', v_transfer.status
      using errcode = '22023';
  end if;

  if not public.is_super_admin() and v_transfer.to_branch_id <> public.current_user_branch_id() then
    raise exception 'Only the receiving branch can confirm this transfer' using errcode = '42501';
  end if;

  for v_item in
    select ti.id, ti.medicine_id, ti.batch_no, ti.quantity,
           ti.expiry_date, ti.purchase_price, ti.selling_price, ti.mrp, ti.supplier_id
    from public.stock_transfer_items ti
    where ti.transfer_id = p_transfer_id
  loop
    v_received := v_item.quantity;
    v_reason := null;

    select value into v_receipt
    from jsonb_array_elements(coalesce(p_receipts, '[]'::jsonb))
    where (value ->> 'item_id')::uuid = v_item.id
    limit 1;

    if v_receipt is not null then
      v_received := coalesce((v_receipt ->> 'received_quantity')::integer, v_item.quantity);
      v_reason := nullif(btrim(coalesce(v_receipt ->> 'shortfall_reason', '')), '');
    end if;

    if v_received < 0 or v_received > v_item.quantity then
      raise exception 'Received quantity for batch % must be between 0 and %',
        v_item.batch_no, v_item.quantity
        using errcode = '22023';
    end if;

    if v_received < v_item.quantity and v_reason is null then
      raise exception 'Explain the shortfall on batch % (% sent, % received)',
        v_item.batch_no, v_item.quantity, v_received
        using errcode = '22023';
    end if;

    update public.stock_transfer_items
    set received_quantity = v_received,
        shortfall_reason = v_reason
    where id = v_item.id;

    if v_received > 0 then
      if v_item.expiry_date is null then
        raise exception 'This transfer is missing batch details and cannot be received'
          using errcode = '22023';
      end if;

      insert into public.branch_stocks (
        branch_id, medicine_id, batch_no, expiry_date, quantity,
        purchase_price, selling_price, mrp, supplier_id, received_date
      )
      values (
        v_transfer.to_branch_id, v_item.medicine_id, v_item.batch_no, v_item.expiry_date,
        v_received, v_item.purchase_price, v_item.selling_price, v_item.mrp,
        v_item.supplier_id, current_date
      )
      on conflict (branch_id, medicine_id, batch_no) do update
        set quantity = public.branch_stocks.quantity + excluded.quantity,
            is_active = true;

      insert into public.stock_movements (
        branch_id, medicine_id, batch_no, type, quantity,
        reference_id, reference_type, created_by
      )
      values (
        v_transfer.to_branch_id, v_item.medicine_id, v_item.batch_no, 'transfer_in',
        v_received, p_transfer_id, 'stock_transfer', v_profile_id
      );
    end if;
  end loop;

  update public.stock_transfers
  set status = 'completed',
      received_by = v_profile_id,
      completed_at = now()
  where id = p_transfer_id;
end;
$$;
