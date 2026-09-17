-- ---------------------------------------------------------------------------
-- Fix: create_sales_return() needed UPDATE on a table that should not have it
--
-- The grant reset revealed this. The function inserted the return header with
-- total_refund = 0, worked through the lines, and then UPDATEd the header with
-- the total it had accumulated. That only worked because the table carried an
-- UPDATE grant nobody had chosen — and the honest fix is not to grant it back.
--
-- A refund record that can be edited after it is written is a refund record
-- worth nothing: the amount handed over is the whole point of the row.
--
-- So the total is computed BEFORE the header is written. Two passes over the
-- lines: the first validates each one and adds up the refund, the second does
-- the physical work. The validation pass has to happen first anyway — a
-- return that is going to be rejected for over-returning should not have
-- restocked half the items before finding out.
-- ---------------------------------------------------------------------------

create or replace function public.create_sales_return(
  p_sale_id uuid,
  p_items jsonb,
  p_reason text,
  p_refund_method public.payment_method
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_return_id uuid;
  v_sale record;
  v_item jsonb;
  v_sale_item record;
  v_quantity integer;
  v_already_returned integer;
  v_total_refund numeric(14, 2) := 0;
  v_due_reduction numeric(14, 2);
begin
  if not public.can_sell() then
    raise exception 'Your role is not permitted to process returns' using errcode = '42501';
  end if;

  select p.id into v_profile_id
  from public.profiles p
  where p.auth_id = (select auth.uid())
    and p.is_active = true
    and p.deleted_at is null;

  if v_profile_id is null then
    raise exception 'No active profile for the current user' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'A reason is required for every return' using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Select at least one item to return' using errcode = '22023';
  end if;

  select s.id, s.branch_id, s.customer_id, s.due_amount, s.paid_amount
  into v_sale
  from public.sales s
  where s.id = p_sale_id
    and s.deleted_at is null
  for update;

  if v_sale.id is null then
    raise exception 'Sale not found' using errcode = '23503';
  end if;

  -- -------------------------------------------------------------------------
  -- Pass one: validate every line and total the refund. Nothing is written
  -- yet, so a rejected return leaves no half-restocked mess behind.
  -- -------------------------------------------------------------------------
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Return quantity must be at least 1' using errcode = '22023';
    end if;

    select si.id, si.sale_id, si.quantity, si.unit_price
    into v_sale_item
    from public.sale_items si
    where si.id = (v_item ->> 'sale_item_id')::uuid;

    if v_sale_item.id is null then
      raise exception 'Sale line not found' using errcode = '23503';
    end if;

    if v_sale_item.sale_id <> p_sale_id then
      raise exception 'That item does not belong to this sale' using errcode = '22023';
    end if;

    v_already_returned := public.returned_quantity(v_sale_item.id);

    if v_quantity > (v_sale_item.quantity - v_already_returned) then
      raise exception 'Only % of that item can still be returned',
        (v_sale_item.quantity - v_already_returned)
        using errcode = '23514';
    end if;

    v_total_refund := v_total_refund + round(v_sale_item.unit_price * v_quantity, 2);
  end loop;

  -- -------------------------------------------------------------------------
  -- The header, written once, with the final figure.
  -- -------------------------------------------------------------------------
  insert into public.sales_returns (
    sale_id, branch_id, returned_by, reason, refund_method, total_refund
  )
  values (
    p_sale_id, v_sale.branch_id, v_profile_id, btrim(p_reason), p_refund_method, v_total_refund
  )
  returning id into v_return_id;

  -- -------------------------------------------------------------------------
  -- Pass two: restock and record. Every line has already been checked.
  -- -------------------------------------------------------------------------
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;

    select si.id, si.medicine_id, si.branch_stock_id, si.batch_no
    into v_sale_item
    from public.sale_items si
    where si.id = (v_item ->> 'sale_item_id')::uuid;

    insert into public.sales_return_items (return_id, sale_item_id, quantity)
    values (v_return_id, v_sale_item.id, v_quantity);

    update public.branch_stocks
    set quantity = quantity + v_quantity
    where id = v_sale_item.branch_stock_id;

    insert into public.stock_movements (
      branch_id, medicine_id, batch_no, type, quantity,
      reference_id, reference_type, created_by
    )
    values (
      v_sale.branch_id, v_sale_item.medicine_id, v_sale_item.batch_no, 'return', v_quantity,
      v_return_id, 'sales_return', v_profile_id
    );
  end loop;

  -- -------------------------------------------------------------------------
  -- Settlement: clear outstanding credit before any cash goes out.
  -- -------------------------------------------------------------------------
  if v_sale.due_amount > 0 and v_sale.customer_id is not null then
    v_due_reduction := least(v_total_refund, v_sale.due_amount);

    update public.sales
    set due_amount = due_amount - v_due_reduction,
        total_amount = total_amount - v_due_reduction
    where id = p_sale_id;
  end if;

  if v_sale.customer_id is not null then
    perform public.recompute_customer_balance(v_sale.customer_id);
  end if;

  return v_return_id;
end;
$$;
