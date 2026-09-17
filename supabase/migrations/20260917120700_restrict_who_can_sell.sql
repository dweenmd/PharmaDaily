-- ---------------------------------------------------------------------------
-- Phase 3 / 8 — gate selling on role
--
-- Found during the end-of-phase review: create_sale() and
-- create_sales_return() checked only that the caller had an active profile,
-- not what their job is. RLS then allowed the writes because the branch
-- matched. So a stock manager — whose job is receiving deliveries, not
-- handling money — could complete sales and process refunds through the API,
-- even though the interface never offers them the POS.
--
-- That is exactly the gap the whole design is meant not to have: the UI and
-- the database disagreeing about who may do what, with the UI being the only
-- thing enforcing it. Refunds in particular are the classic till-fraud path,
-- so the set of people who can issue one should be deliberate.
-- ---------------------------------------------------------------------------

create or replace function public.can_sell()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(
    public.current_user_role() in ('super_admin', 'branch_manager', 'cashier', 'pharmacist'),
    false
  );
$$;

revoke execute on function public.can_sell() from public, anon;
grant execute on function public.can_sell() to authenticated;

comment on function public.can_sell() is
  'Roles permitted to take payment and issue refunds. Stock managers are deliberately excluded.';

-- ---------------------------------------------------------------------------
-- Apply it. Both functions are otherwise unchanged; only the guard is added.
-- ---------------------------------------------------------------------------

create or replace function public.create_sale(
  p_branch_id uuid,
  p_customer_id uuid,
  p_discount numeric,
  p_items jsonb,
  p_payments jsonb,
  p_sale_date date default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_sale_id uuid;
  v_invoice_no text;
  v_subtotal numeric(14, 2) := 0;
  v_discount numeric(14, 2) := coalesce(p_discount, 0);
  v_total numeric(14, 2);
  v_paid numeric(14, 2) := 0;
  v_due numeric(14, 2);
  v_item jsonb;
  v_payment jsonb;
  v_stock record;
  v_quantity integer;
  v_line_total numeric(14, 2);
begin
  if not public.can_sell() then
    raise exception 'Your role is not permitted to complete sales' using errcode = '42501';
  end if;

  select p.id into v_profile_id
  from public.profiles p
  where p.auth_id = (select auth.uid())
    and p.is_active = true
    and p.deleted_at is null;

  if v_profile_id is null then
    raise exception 'No active profile for the current user' using errcode = '42501';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A sale must have at least one item' using errcode = '22023';
  end if;

  if v_discount < 0 then
    raise exception 'Discount cannot be negative' using errcode = '22023';
  end if;

  v_invoice_no := public.next_invoice_no(p_branch_id);

  insert into public.sales (
    branch_id, customer_id, cashier_id, invoice_no,
    subtotal, discount, total_amount, paid_amount, due_amount, sale_date
  )
  values (
    p_branch_id, p_customer_id, v_profile_id, v_invoice_no,
    0, 0, 0, 0, 0, coalesce(p_sale_date, current_date)
  )
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Quantity must be at least 1 for every item' using errcode = '22023';
    end if;

    select bs.id, bs.medicine_id, bs.batch_no, bs.quantity, bs.reserved_quantity,
           bs.selling_price, bs.branch_id, m.name as medicine_name
    into v_stock
    from public.branch_stocks bs
    join public.medicines m on m.id = bs.medicine_id
    where bs.id = (v_item ->> 'branch_stock_id')::uuid
    for update of bs;

    if v_stock.id is null then
      raise exception 'That batch no longer exists' using errcode = '23503';
    end if;

    if v_stock.branch_id <> p_branch_id then
      raise exception 'Cannot sell stock belonging to another branch' using errcode = '42501';
    end if;

    if (v_stock.quantity - v_stock.reserved_quantity) < v_quantity then
      raise exception 'Only % of % left in batch %',
        (v_stock.quantity - v_stock.reserved_quantity), v_stock.medicine_name, v_stock.batch_no
        using errcode = '23514';
    end if;

    v_line_total := round(v_stock.selling_price * v_quantity, 2);
    v_subtotal := v_subtotal + v_line_total;

    insert into public.sale_items (
      sale_id, medicine_id, branch_stock_id, batch_no, quantity, unit_price, total_price
    )
    values (
      v_sale_id, v_stock.medicine_id, v_stock.id, v_stock.batch_no,
      v_quantity, v_stock.selling_price, v_line_total
    );

    update public.branch_stocks
    set quantity = quantity - v_quantity
    where id = v_stock.id;

    insert into public.stock_movements (
      branch_id, medicine_id, batch_no, type, quantity,
      reference_id, reference_type, created_by
    )
    values (
      p_branch_id, v_stock.medicine_id, v_stock.batch_no, 'sale', -v_quantity,
      v_sale_id, 'sale', v_profile_id
    );
  end loop;

  if v_discount > v_subtotal then
    raise exception 'Discount (%) cannot exceed the subtotal (%)', v_discount, v_subtotal
      using errcode = '22023';
  end if;

  v_total := v_subtotal - v_discount;

  if p_payments is not null and jsonb_typeof(p_payments) = 'array' then
    for v_payment in select * from jsonb_array_elements(p_payments)
    loop
      if (v_payment ->> 'method') = 'due' then
        continue;
      end if;

      if (v_payment ->> 'amount')::numeric <= 0 then
        raise exception 'Payment amounts must be greater than zero' using errcode = '22023';
      end if;

      insert into public.payments (sale_id, branch_id, method, amount, reference)
      values (
        v_sale_id,
        p_branch_id,
        (v_payment ->> 'method')::public.payment_method,
        (v_payment ->> 'amount')::numeric,
        nullif(btrim(coalesce(v_payment ->> 'reference', '')), '')
      );

      v_paid := v_paid + (v_payment ->> 'amount')::numeric;
    end loop;
  end if;

  if v_paid > v_total then
    v_paid := v_total;
  end if;

  v_due := v_total - v_paid;

  if v_due > 0 and p_customer_id is null then
    raise exception 'Select a customer before leaving an amount due' using errcode = '22023';
  end if;

  update public.sales
  set subtotal = v_subtotal,
      discount = v_discount,
      total_amount = v_total,
      paid_amount = v_paid,
      due_amount = v_due
  where id = v_sale_id;

  if v_due > 0 then
    update public.customers
    set due_amount = due_amount + v_due
    where id = p_customer_id;

    if not found then
      raise exception 'Customer not found' using errcode = '23503';
    end if;
  end if;

  return v_sale_id;
end;
$$;

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
