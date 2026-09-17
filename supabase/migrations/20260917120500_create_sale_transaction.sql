-- ---------------------------------------------------------------------------
-- Phase 3 / 6 — create_sale()
--
-- Completing a sale writes: the sale header, its line items, its payments,
-- a deduction from each batch, and a ledger entry per line. Plus the customer's
-- balance when any of it is on credit. All or nothing, for the same reason as
-- create_purchase(): a half-written sale means money taken for stock the system
-- still believes is on the shelf.
--
-- TWO THINGS HERE ARE SECURITY-RELEVANT, not just correctness:
--
--   1. PRICES ARE READ FROM THE DATABASE, NOT ACCEPTED FROM THE CLIENT.
--      The caller sends a batch and a quantity; unit_price comes from
--      branch_stocks.selling_price. If the client supplied the price, anyone
--      who can open the browser console could sell themselves a ৳2,000 item
--      for ৳1 and the books would balance perfectly.
--
--   2. EVERY BATCH ROW IS LOCKED FOR UPDATE BEFORE ITS QUANTITY IS CHECKED.
--      Two cashiers selling the last strip at the same instant would otherwise
--      both read "1 in stock", both pass the check and both deduct, leaving
--      -1. The lock makes the second one wait and see the real remaining
--      quantity.
--
-- SECURITY INVOKER, so RLS decides which branch the caller may sell from.
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
  -- -------------------------------------------------------------------------
  -- Who is selling.
  -- -------------------------------------------------------------------------
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

  -- -------------------------------------------------------------------------
  -- Reserve the header so line items have something to reference. Totals are
  -- corrected at the end, once the lines have been priced from the database.
  -- -------------------------------------------------------------------------
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

  -- -------------------------------------------------------------------------
  -- Lines: lock the batch, check stock, price it, deduct, record.
  -- -------------------------------------------------------------------------
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Quantity must be at least 1 for every item' using errcode = '22023';
    end if;

    -- FOR UPDATE: see the note at the top. This is what makes overselling
    -- impossible rather than merely unlikely.
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

    -- Available excludes anything another in-flight sale is holding.
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

  -- -------------------------------------------------------------------------
  -- Money.
  -- -------------------------------------------------------------------------
  if v_discount > v_subtotal then
    raise exception 'Discount (%) cannot exceed the subtotal (%)', v_discount, v_subtotal
      using errcode = '22023';
  end if;

  v_total := v_subtotal - v_discount;

  if p_payments is not null and jsonb_typeof(p_payments) = 'array' then
    for v_payment in select * from jsonb_array_elements(p_payments)
    loop
      -- 'due' is not a tender: it is the absence of one. Recording it as a
      -- payment row would make the till appear to balance on money that was
      -- never handed over.
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

  -- Overpayment is change handed back at the counter, not revenue, so it is
  -- capped rather than recorded. The till reconciles against what was kept.
  if v_paid > v_total then
    v_paid := v_total;
  end if;

  v_due := v_total - v_paid;

  -- Anonymous credit is untraceable debt: there would be nobody to pursue it
  -- from and no balance to attach it to.
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

revoke execute on function public.create_sale(uuid, uuid, numeric, jsonb, jsonb, date)
  from public, anon;
grant execute on function public.create_sale(uuid, uuid, numeric, jsonb, jsonb, date)
  to authenticated;

comment on function public.create_sale(uuid, uuid, numeric, jsonb, jsonb, date) is
  'Completes a sale atomically. Prices come from branch_stocks, never from the client; batch rows are locked before their quantity is checked.';
