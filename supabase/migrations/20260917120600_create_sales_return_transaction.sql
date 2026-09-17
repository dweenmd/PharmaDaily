-- ---------------------------------------------------------------------------
-- Phase 3 / 7 — create_sales_return()
--
-- Reverses part or all of a sale: puts the stock back on the shelf, writes the
-- ledger entries, records the paperwork, and settles the refund.
--
-- The rule that makes this safe is the cap: each line may only be returned up
-- to what was sold, minus what has already come back. Without it the same line
-- could be refunded repeatedly — money out of the till, stock appearing from
-- nowhere, and both sides looking internally consistent.
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
  v_line_refund numeric(14, 2);
  v_due_reduction numeric(14, 2);
begin
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

  -- Locking the sale serialises two clerks processing a return against the
  -- same invoice, which is what stops both of them passing the
  -- already-returned check below.
  select s.id, s.branch_id, s.customer_id, s.due_amount, s.paid_amount
  into v_sale
  from public.sales s
  where s.id = p_sale_id
    and s.deleted_at is null
  for update;

  if v_sale.id is null then
    raise exception 'Sale not found' using errcode = '23503';
  end if;

  insert into public.sales_returns (
    sale_id, branch_id, returned_by, reason, refund_method, total_refund
  )
  values (
    p_sale_id, v_sale.branch_id, v_profile_id, btrim(p_reason), p_refund_method, 0
  )
  returning id into v_return_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Return quantity must be at least 1' using errcode = '22023';
    end if;

    select si.id, si.sale_id, si.medicine_id, si.branch_stock_id, si.batch_no,
           si.quantity, si.unit_price
    into v_sale_item
    from public.sale_items si
    where si.id = (v_item ->> 'sale_item_id')::uuid;

    if v_sale_item.id is null then
      raise exception 'Sale line not found' using errcode = '23503';
    end if;

    -- Guards against a crafted request stitching a line from one invoice onto
    -- a return for another.
    if v_sale_item.sale_id <> p_sale_id then
      raise exception 'That item does not belong to this sale' using errcode = '22023';
    end if;

    v_already_returned := public.returned_quantity(v_sale_item.id);

    if v_quantity > (v_sale_item.quantity - v_already_returned) then
      raise exception 'Only % of that item can still be returned',
        (v_sale_item.quantity - v_already_returned)
        using errcode = '23514';
    end if;

    insert into public.sales_return_items (return_id, sale_item_id, quantity)
    values (v_return_id, v_sale_item.id, v_quantity);

    -- Back to the exact batch it came from — which is why sale_items stores
    -- branch_stock_id rather than resolving medicine + batch_no at return time.
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

    v_line_refund := round(v_sale_item.unit_price * v_quantity, 2);
    v_total_refund := v_total_refund + v_line_refund;
  end loop;

  update public.sales_returns
  set total_refund = v_total_refund
  where id = v_return_id;

  -- -------------------------------------------------------------------------
  -- Settlement.
  --
  -- If the sale was partly on credit, the refund clears that debt first: it
  -- would be wrong to hand over cash while the customer still owes for the
  -- item they just brought back. Only the remainder is refunded outright.
  -- -------------------------------------------------------------------------
  if v_sale.due_amount > 0 and v_sale.customer_id is not null then
    v_due_reduction := least(v_total_refund, v_sale.due_amount);

    update public.sales
    set due_amount = due_amount - v_due_reduction,
        total_amount = total_amount - v_due_reduction
    where id = p_sale_id;

    update public.customers
    set due_amount = greatest(0, due_amount - v_due_reduction)
    where id = v_sale.customer_id;
  end if;

  return v_return_id;
end;
$$;

revoke execute on function public.create_sales_return(uuid, jsonb, text, public.payment_method)
  from public, anon;
grant execute on function public.create_sales_return(uuid, jsonb, text, public.payment_method)
  to authenticated;

comment on function public.create_sales_return(uuid, jsonb, text, public.payment_method) is
  'Processes a full or partial return atomically. Caps each line at what remains returnable so nothing can be refunded twice.';
