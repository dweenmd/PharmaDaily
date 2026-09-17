-- ---------------------------------------------------------------------------
-- Phase 5 / 2 — the transfer state machine
--
-- Three transitions, each atomic:
--
--   create_stock_transfer   nothing moves. A request, checked against what is
--                           actually on the shelf so it is not approved and
--                           then found to be impossible.
--   approve_stock_transfer  stock LEAVES the source. transfer_out per line.
--   receive_stock_transfer  stock ARRIVES at the destination. transfer_in per
--                           line, for what was actually received.
--   reject_stock_transfer   nothing moves, ever. A rejection must leave the
--                           shelves exactly as it found them.
--
-- Every one of them is SECURITY INVOKER, so RLS decides which branches the
-- caller may act for, and every one re-reads and re-locks the current state
-- rather than trusting what the client believed when the page was rendered.
-- Two managers clicking Approve at the same moment must not dispatch twice.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- Request.
-- ===========================================================================
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

    -- Checked now as well as at approval. Requesting more than exists would
    -- waste a manager's time on a decision that could never be carried out.
    if (v_stock.quantity - v_stock.reserved_quantity) < v_quantity then
      raise exception 'Only % of % is available in batch %',
        (v_stock.quantity - v_stock.reserved_quantity), v_stock.medicine_name, v_stock.batch_no
        using errcode = '23514';
    end if;

    insert into public.stock_transfer_items (
      transfer_id, medicine_id, source_stock_id, batch_no, quantity
    )
    values (v_transfer_id, v_stock.medicine_id, v_stock.id, v_stock.batch_no, v_quantity);
  end loop;

  return v_transfer_id;
end;
$$;

-- ===========================================================================
-- Approve — stock leaves the source.
-- ===========================================================================
create or replace function public.approve_stock_transfer(p_transfer_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_transfer record;
  v_item record;
  v_available integer;
begin
  select p.id into v_profile_id
  from public.profiles p
  where p.auth_id = (select auth.uid())
    and p.is_active = true
    and p.deleted_at is null;

  if v_profile_id is null then
    raise exception 'No active profile for the current user' using errcode = '42501';
  end if;

  -- Approving is a management decision. A stock manager may request a transfer
  -- out of their branch; letting them also approve it would mean one person
  -- could move stock between branches unobserved.
  if not public.can_approve_transfers() then
    raise exception 'Only a branch manager or super admin can approve a transfer'
      using errcode = '42501';
  end if;

  -- Locked and re-read: two managers clicking Approve together must not both
  -- dispatch the same consignment.
  select t.id, t.status, t.from_branch_id, t.to_branch_id
  into v_transfer
  from public.stock_transfers t
  where t.id = p_transfer_id
  for update;

  if v_transfer.id is null then
    raise exception 'Transfer not found' using errcode = '23503';
  end if;

  if v_transfer.status <> 'pending' then
    raise exception 'This transfer is already %', v_transfer.status using errcode = '22023';
  end if;

  -- Approval happens at the SENDING branch: it is their stock going out.
  if not public.is_super_admin() and v_transfer.from_branch_id <> public.current_user_branch_id() then
    raise exception 'Only the sending branch can approve this transfer' using errcode = '42501';
  end if;

  for v_item in
    select ti.id, ti.medicine_id, ti.source_stock_id, ti.batch_no, ti.quantity
    from public.stock_transfer_items ti
    where ti.transfer_id = p_transfer_id
  loop
    -- Re-checked at dispatch, because the request may have sat pending while
    -- the counter sold the same batch.
    select (bs.quantity - bs.reserved_quantity) into v_available
    from public.branch_stocks bs
    where bs.id = v_item.source_stock_id
    for update;

    if v_available is null then
      raise exception 'A batch in this transfer no longer exists' using errcode = '23503';
    end if;

    if v_available < v_item.quantity then
      raise exception 'Batch % now has only % available — this transfer can no longer be approved',
        v_item.batch_no, v_available
        using errcode = '23514';
    end if;

    update public.branch_stocks
    set quantity = quantity - v_item.quantity
    where id = v_item.source_stock_id;

    insert into public.stock_movements (
      branch_id, medicine_id, batch_no, type, quantity,
      reference_id, reference_type, created_by
    )
    values (
      v_transfer.from_branch_id, v_item.medicine_id, v_item.batch_no, 'transfer_out',
      -v_item.quantity, p_transfer_id, 'stock_transfer', v_profile_id
    );
  end loop;

  update public.stock_transfers
  set status = 'approved',
      approved_by = v_profile_id,
      approved_at = now()
  where id = p_transfer_id;
end;
$$;

-- ===========================================================================
-- Reject — nothing moves.
-- ===========================================================================
create or replace function public.reject_stock_transfer(p_transfer_id uuid, p_reason text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_transfer record;
begin
  select p.id into v_profile_id
  from public.profiles p
  where p.auth_id = (select auth.uid())
    and p.is_active = true
    and p.deleted_at is null;

  if v_profile_id is null then
    raise exception 'No active profile for the current user' using errcode = '42501';
  end if;

  if not public.can_approve_transfers() then
    raise exception 'Only a branch manager or super admin can reject a transfer'
      using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Give a reason for rejecting this transfer' using errcode = '22023';
  end if;

  select t.id, t.status, t.from_branch_id into v_transfer
  from public.stock_transfers t
  where t.id = p_transfer_id
  for update;

  if v_transfer.id is null then
    raise exception 'Transfer not found' using errcode = '23503';
  end if;

  -- Only a pending transfer can be rejected. Once approved the stock has
  -- physically left; undoing that is a receipt with a shortfall, or a return
  -- transfer — not a status change.
  if v_transfer.status <> 'pending' then
    raise exception 'Only a pending transfer can be rejected — this one is %', v_transfer.status
      using errcode = '22023';
  end if;

  if not public.is_super_admin() and v_transfer.from_branch_id <> public.current_user_branch_id() then
    raise exception 'Only the sending branch can reject this transfer' using errcode = '42501';
  end if;

  update public.stock_transfers
  set status = 'rejected',
      approved_by = v_profile_id,
      approved_at = now(),
      rejection_reason = btrim(p_reason)
  where id = p_transfer_id;
end;
$$;

-- ===========================================================================
-- Receive — stock arrives at the destination.
--
-- p_receipts is [{ item_id, received_quantity, shortfall_reason }]. Anything
-- not listed is treated as received in full, so the common case needs no
-- payload at all.
-- ===========================================================================
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
  v_source record;
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

  -- Receiving happens at the DESTINATION. The sender confirming arrival would
  -- defeat the point of counting it in.
  if not public.is_super_admin() and v_transfer.to_branch_id <> public.current_user_branch_id() then
    raise exception 'Only the receiving branch can confirm this transfer' using errcode = '42501';
  end if;

  for v_item in
    select ti.id, ti.medicine_id, ti.source_stock_id, ti.batch_no, ti.quantity
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

    -- A shortfall is stock that left one branch and reached neither. It has to
    -- be explained, because the alternative is quietly losing inventory
    -- between two sets of books.
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
      -- The destination inherits the source batch's expiry and pricing, so the
      -- same physical batch behaves identically wherever it sits.
      select bs.expiry_date, bs.purchase_price, bs.selling_price, bs.mrp, bs.supplier_id
      into v_source
      from public.branch_stocks bs
      where bs.id = v_item.source_stock_id;

      insert into public.branch_stocks (
        branch_id, medicine_id, batch_no, expiry_date, quantity,
        purchase_price, selling_price, mrp, supplier_id, received_date
      )
      values (
        v_transfer.to_branch_id, v_item.medicine_id, v_item.batch_no, v_source.expiry_date,
        v_received, v_source.purchase_price, v_source.selling_price, v_source.mrp,
        v_source.supplier_id, current_date
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

-- ---------------------------------------------------------------------------

create or replace function public.can_approve_transfers()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(
    public.current_user_role() in ('super_admin', 'branch_manager'),
    false
  );
$$;

revoke execute on function public.can_approve_transfers() from public, anon;
grant execute on function public.can_approve_transfers() to authenticated;

revoke execute on function public.create_stock_transfer(uuid, uuid, jsonb, text) from public, anon;
revoke execute on function public.approve_stock_transfer(uuid) from public, anon;
revoke execute on function public.reject_stock_transfer(uuid, text) from public, anon;
revoke execute on function public.receive_stock_transfer(uuid, jsonb) from public, anon;

grant execute on function public.create_stock_transfer(uuid, uuid, jsonb, text) to authenticated;
grant execute on function public.approve_stock_transfer(uuid) to authenticated;
grant execute on function public.reject_stock_transfer(uuid, text) to authenticated;
grant execute on function public.receive_stock_transfer(uuid, jsonb) to authenticated;

comment on function public.approve_stock_transfer(uuid) is
  'Dispatches a transfer: deducts at source, writes transfer_out. Re-checks availability, because the request may have sat pending while the counter sold the same batch.';
