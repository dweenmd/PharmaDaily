-- ---------------------------------------------------------------------------
-- Phase 2 / 7 — create_purchase()
--
-- Receiving a consignment touches five things and they must all happen or none
-- of them must:
--
--   1. the purchase header
--   2. one purchase_items row per line
--   3. branch_stocks created or topped up per line
--   4. one stock_movements row per line
--   5. the supplier's running balance
--
-- Doing this as five separate calls from the application is not an option. The
-- PostgREST client has no client-side transaction, so a dropped connection
-- between step 3 and step 4 would leave stock that exists on the shelf but not
-- in the ledger — and the ledger is what every report and every audit is
-- reconciled against. A single function call is one statement, and therefore
-- one transaction, which either commits whole or rolls back whole.
--
-- SECURITY INVOKER (the default) is deliberate: the function runs as the
-- caller, so every INSERT and UPDATE inside it is checked against the same RLS
-- policies the caller would face directly. Writing a purchase into another
-- branch fails here exactly as it would fail from the client. A SECURITY
-- DEFINER function would have to re-implement all of that by hand, and would
-- become a privilege-escalation hole the day it got one check wrong.
-- ---------------------------------------------------------------------------

create or replace function public.create_purchase(
  p_branch_id uuid,
  p_supplier_id uuid,
  p_purchase_date date,
  p_invoice_no text,
  p_paid_amount numeric,
  p_items jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_purchase_id uuid;
  v_total numeric(14, 2) := 0;
  v_due numeric(14, 2);
  v_item jsonb;
  v_item_count integer;
begin
  -- -------------------------------------------------------------------------
  -- Authorisation. RLS would refuse the writes anyway, but failing here gives
  -- a readable error instead of an opaque policy violation halfway through.
  -- -------------------------------------------------------------------------
  if not public.can_manage_catalogue() then
    raise exception 'You are not allowed to record purchases'
      using errcode = '42501';
  end if;

  select p.id into v_profile_id
  from public.profiles p
  where p.auth_id = (select auth.uid())
    and p.is_active = true
    and p.deleted_at is null;

  if v_profile_id is null then
    raise exception 'No active profile for the current user'
      using errcode = '42501';
  end if;

  -- -------------------------------------------------------------------------
  -- Validate the payload before writing anything.
  -- -------------------------------------------------------------------------
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Purchase items must be a JSON array'
      using errcode = '22023';
  end if;

  v_item_count := jsonb_array_length(p_items);

  if v_item_count = 0 then
    raise exception 'A purchase must have at least one item'
      using errcode = '22023';
  end if;

  -- Compute the total from the lines rather than trusting a figure sent by the
  -- client: the header total must agree with what was actually received, or
  -- the supplier balance drifts away from the stock on the shelf.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if (v_item ->> 'quantity')::integer <= 0 then
      raise exception 'Quantity must be greater than zero for every item'
        using errcode = '22023';
    end if;

    if (v_item ->> 'cost_price')::numeric < 0 then
      raise exception 'Cost price cannot be negative'
        using errcode = '22023';
    end if;

    v_total := v_total + ((v_item ->> 'quantity')::integer * (v_item ->> 'cost_price')::numeric);
  end loop;

  v_total := round(v_total, 2);

  if p_paid_amount < 0 then
    raise exception 'Paid amount cannot be negative' using errcode = '22023';
  end if;

  if p_paid_amount > v_total then
    raise exception 'Paid amount (%) cannot exceed the purchase total (%)', p_paid_amount, v_total
      using errcode = '22023';
  end if;

  v_due := v_total - p_paid_amount;

  -- -------------------------------------------------------------------------
  -- 1. Header. The unique index on (supplier_id, invoice_no) is what stops the
  --    same consignment being received twice and doubling the stock.
  -- -------------------------------------------------------------------------
  insert into public.purchases (
    supplier_id, branch_id, purchase_date, invoice_no,
    total_amount, paid_amount, due_amount, notes, created_by
  )
  values (
    p_supplier_id, p_branch_id, coalesce(p_purchase_date, current_date), btrim(p_invoice_no),
    v_total, p_paid_amount, v_due, nullif(btrim(coalesce(p_notes, '')), ''), v_profile_id
  )
  returning id into v_purchase_id;

  -- -------------------------------------------------------------------------
  -- 2-4. Per line: paperwork, stock, ledger.
  -- -------------------------------------------------------------------------
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.purchase_items (
      purchase_id, medicine_id, batch_no, expiry_date, quantity, cost_price, selling_price, mrp
    )
    values (
      v_purchase_id,
      (v_item ->> 'medicine_id')::uuid,
      btrim(v_item ->> 'batch_no'),
      (v_item ->> 'expiry_date')::date,
      (v_item ->> 'quantity')::integer,
      (v_item ->> 'cost_price')::numeric,
      (v_item ->> 'selling_price')::numeric,
      (v_item ->> 'mrp')::numeric
    );

    -- Top up the batch if it is already on the shelf, otherwise create it.
    -- ON CONFLICT makes this atomic against a second receipt of the same batch
    -- happening concurrently — without it, two sessions could both see "no
    -- row" and insert, splitting one physical batch across two rows.
    --
    -- Prices are overwritten with the new consignment's: the most recent
    -- receipt is the current truth for what that batch costs and sells for.
    insert into public.branch_stocks (
      branch_id, medicine_id, batch_no, expiry_date, quantity,
      purchase_price, selling_price, mrp, supplier_id, received_date
    )
    values (
      p_branch_id,
      (v_item ->> 'medicine_id')::uuid,
      btrim(v_item ->> 'batch_no'),
      (v_item ->> 'expiry_date')::date,
      (v_item ->> 'quantity')::integer,
      (v_item ->> 'cost_price')::numeric,
      (v_item ->> 'selling_price')::numeric,
      (v_item ->> 'mrp')::numeric,
      p_supplier_id,
      coalesce(p_purchase_date, current_date)
    )
    on conflict (branch_id, medicine_id, batch_no) do update
      set quantity = public.branch_stocks.quantity + excluded.quantity,
          purchase_price = excluded.purchase_price,
          selling_price = excluded.selling_price,
          mrp = excluded.mrp,
          expiry_date = excluded.expiry_date,
          supplier_id = excluded.supplier_id,
          received_date = excluded.received_date,
          is_active = true;

    insert into public.stock_movements (
      branch_id, medicine_id, batch_no, type, quantity,
      reference_id, reference_type, created_by
    )
    values (
      p_branch_id,
      (v_item ->> 'medicine_id')::uuid,
      btrim(v_item ->> 'batch_no'),
      'purchase',
      (v_item ->> 'quantity')::integer,
      v_purchase_id,
      'purchase',
      v_profile_id
    );
  end loop;

  -- -------------------------------------------------------------------------
  -- 5. Supplier balance.
  -- -------------------------------------------------------------------------
  if v_due > 0 then
    update public.suppliers
    set due_amount = due_amount + v_due
    where id = p_supplier_id;

    if not found then
      raise exception 'Supplier not found' using errcode = '23503';
    end if;
  end if;

  return v_purchase_id;
end;
$$;

revoke execute on function public.create_purchase(uuid, uuid, date, text, numeric, jsonb, text)
  from public, anon;
grant execute on function public.create_purchase(uuid, uuid, date, text, numeric, jsonb, text)
  to authenticated;

comment on function public.create_purchase(uuid, uuid, date, text, numeric, jsonb, text) is
  'Records a consignment atomically: header, line items, branch_stocks, stock_movements and the supplier balance. Runs as the caller, so RLS applies.';
