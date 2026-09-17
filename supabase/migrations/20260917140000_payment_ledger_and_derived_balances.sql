-- ---------------------------------------------------------------------------
-- Fix: customer and supplier balances were forgeable, and unsettleable
--
-- TWO PROBLEMS, ONE CAUSE.
--
-- 1. SECURITY. The UPDATE grant on customers and suppliers covered every
--    column, so due_amount was editable by anyone who could edit the row. A
--    cashier could zero a customer's debt — their own family's, say — and a
--    stock manager could zero a supplier balance, hiding money the business
--    owes. Proven exploitable before this migration.
--
--    This is the same bug as the Phase 1 privilege escalation on profiles.
--    The rule was even written down there — RLS is row-scoped, not
--    column-scoped — and then not applied here. A comment saying "never set
--    directly" is not an enforcement mechanism.
--
-- 2. FUNCTION. Debt could be incurred but never settled. A customer returning
--    next week with cash, or the business paying a supplier's invoice, had
--    nowhere to be recorded. The only thing that reduced a customer's balance
--    was a sales return.
--
-- THE FIX, which addresses both: a balance stops being a number anyone writes
-- and becomes a PROJECTION of records that are themselves append-only.
--
--   due = (what they still owe on their invoices) - (what they have paid)
--
-- due_amount stays as a cached column so a list of 500 suppliers does not run
-- 500 aggregates, but nothing can set it to an arbitrary value: the column is
-- removed from the UPDATE grant, and the only thing that writes it is a
-- recompute function that DERIVES the figure. Calling that function with bad
-- intent achieves nothing — it recomputes the correct number.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- The ledgers.
-- ===========================================================================
create table public.customer_payments (
  id uuid primary key default gen_random_uuid(),

  customer_id uuid not null references public.customers (id) on delete restrict,
  branch_id uuid not null references public.branches (id) on delete restrict,

  amount numeric(14, 2) not null,
  method public.payment_method not null,
  reference text,
  notes text,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),

  constraint customer_payments_amount_positive check (amount > 0),
  -- 'due' is not a way to pay off a due.
  constraint customer_payments_method_is_tender check (method <> 'due')
);

create index customer_payments_customer_idx
  on public.customer_payments (customer_id, created_at desc);
create index customer_payments_branch_idx
  on public.customer_payments (branch_id, created_at desc);

create table public.supplier_payments (
  id uuid primary key default gen_random_uuid(),

  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  branch_id uuid not null references public.branches (id) on delete restrict,

  amount numeric(14, 2) not null,
  method public.payment_method not null,
  reference text,
  notes text,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),

  constraint supplier_payments_amount_positive check (amount > 0),
  constraint supplier_payments_method_is_tender check (method <> 'due')
);

create index supplier_payments_supplier_idx
  on public.supplier_payments (supplier_id, created_at desc);
create index supplier_payments_branch_idx
  on public.supplier_payments (branch_id, created_at desc);

comment on table public.customer_payments is
  'Append-only record of credit being paid off. Together with sales.due_amount it derives customers.due_amount.';

-- ===========================================================================
-- Recompute functions.
--
-- SECURITY DEFINER so they can write the column nobody else may write, and
-- safe to expose precisely because they take no amount: they read the source
-- records and set the answer. An attacker calling them gets the truth.
-- ===========================================================================
create or replace function public.recompute_customer_balance(p_customer_id uuid)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owed numeric(14, 2);
  v_paid numeric(14, 2);
  v_balance numeric(14, 2);
begin
  select coalesce(sum(s.due_amount), 0) into v_owed
  from public.sales s
  where s.customer_id = p_customer_id
    and s.deleted_at is null;

  select coalesce(sum(cp.amount), 0) into v_paid
  from public.customer_payments cp
  where cp.customer_id = p_customer_id;

  -- Floored at zero: overpayment is change handed back at the counter, not a
  -- negative debt the business owes the customer.
  v_balance := greatest(0, v_owed - v_paid);

  update public.customers
  set due_amount = v_balance
  where id = p_customer_id;

  return v_balance;
end;
$$;

create or replace function public.recompute_supplier_balance(p_supplier_id uuid)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owed numeric(14, 2);
  v_paid numeric(14, 2);
  v_balance numeric(14, 2);
begin
  select coalesce(sum(p.due_amount), 0) into v_owed
  from public.purchases p
  where p.supplier_id = p_supplier_id
    and p.deleted_at is null;

  select coalesce(sum(sp.amount), 0) into v_paid
  from public.supplier_payments sp
  where sp.supplier_id = p_supplier_id;

  v_balance := greatest(0, v_owed - v_paid);

  update public.suppliers
  set due_amount = v_balance
  where id = p_supplier_id;

  return v_balance;
end;
$$;

revoke execute on function public.recompute_customer_balance(uuid) from public, anon;
revoke execute on function public.recompute_supplier_balance(uuid) from public, anon;
grant execute on function public.recompute_customer_balance(uuid) to authenticated;
grant execute on function public.recompute_supplier_balance(uuid) to authenticated;

-- ===========================================================================
-- Close the hole: due_amount leaves the UPDATE grant.
--
-- Postgres checks column privileges against the columns named in the SET
-- clause, so this stops the write at the grant layer — before RLS, before any
-- trigger. PostgREST sends exactly the columns in the request body, so an
-- attempt to include due_amount is refused outright.
-- ===========================================================================
revoke update on public.customers from authenticated;
grant update (name, phone, address, is_active, deleted_at) on public.customers to authenticated;

revoke update on public.suppliers from authenticated;
grant update (name, phone, address, is_active, deleted_at) on public.suppliers to authenticated;

-- ===========================================================================
-- RLS for the new ledgers.
--
-- Branch-scoped and append-only, like payments. Collecting a debt is a till
-- operation, so can_sell() governs customer payments; paying a supplier is a
-- management decision, so that is narrower.
-- ===========================================================================
alter table public.customer_payments enable row level security;
alter table public.customer_payments force row level security;
revoke all on public.customer_payments from anon;
grant select, insert on public.customer_payments to authenticated;

create policy "customer_payments_select"
  on public.customer_payments for select
  to authenticated
  using (public.is_super_admin() or branch_id = public.current_user_branch_id());

create policy "customer_payments_insert"
  on public.customer_payments for insert
  to authenticated
  with check (
    public.can_sell()
    and (public.is_super_admin() or branch_id = public.current_user_branch_id())
  );

alter table public.supplier_payments enable row level security;
alter table public.supplier_payments force row level security;
revoke all on public.supplier_payments from anon;
grant select, insert on public.supplier_payments to authenticated;

create policy "supplier_payments_select"
  on public.supplier_payments for select
  to authenticated
  using (public.is_super_admin() or branch_id = public.current_user_branch_id());

create policy "supplier_payments_insert"
  on public.supplier_payments for insert
  to authenticated
  with check (
    public.current_user_role() in ('super_admin', 'branch_manager')
    and (public.is_super_admin() or branch_id = public.current_user_branch_id())
  );

-- ===========================================================================
-- Recording a payment.
--
-- SECURITY INVOKER, so the RLS policies above decide who and where. The
-- balance is recomputed rather than decremented, so a double-submitted request
-- cannot drive it below what is actually owed.
-- ===========================================================================
create or replace function public.record_customer_payment(
  p_customer_id uuid,
  p_branch_id uuid,
  p_amount numeric,
  p_method public.payment_method,
  p_reference text default null,
  p_notes text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_payment_id uuid;
  v_owed numeric(14, 2);
begin
  select p.id into v_profile_id
  from public.profiles p
  where p.auth_id = (select auth.uid())
    and p.is_active = true
    and p.deleted_at is null;

  if v_profile_id is null then
    raise exception 'No active profile for the current user' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero' using errcode = '22023';
  end if;

  select due_amount into v_owed from public.customers where id = p_customer_id for update;

  if v_owed is null then
    raise exception 'Customer not found' using errcode = '23503';
  end if;

  -- Taking more than is owed would turn the balance into a liability the
  -- business does not actually have. Overpayment is change at the counter.
  if p_amount > v_owed then
    raise exception 'That customer owes % — cannot accept a payment of %', v_owed, p_amount
      using errcode = '22023';
  end if;

  insert into public.customer_payments (
    customer_id, branch_id, amount, method, reference, notes, created_by
  )
  values (
    p_customer_id, p_branch_id, p_amount, p_method,
    nullif(btrim(coalesce(p_reference, '')), ''),
    nullif(btrim(coalesce(p_notes, '')), ''),
    v_profile_id
  )
  returning id into v_payment_id;

  perform public.recompute_customer_balance(p_customer_id);

  return v_payment_id;
end;
$$;

create or replace function public.record_supplier_payment(
  p_supplier_id uuid,
  p_branch_id uuid,
  p_amount numeric,
  p_method public.payment_method,
  p_reference text default null,
  p_notes text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_payment_id uuid;
  v_owed numeric(14, 2);
begin
  select p.id into v_profile_id
  from public.profiles p
  where p.auth_id = (select auth.uid())
    and p.is_active = true
    and p.deleted_at is null;

  if v_profile_id is null then
    raise exception 'No active profile for the current user' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero' using errcode = '22023';
  end if;

  select due_amount into v_owed from public.suppliers where id = p_supplier_id for update;

  if v_owed is null then
    raise exception 'Supplier not found' using errcode = '23503';
  end if;

  if p_amount > v_owed then
    raise exception 'Only % is outstanding with that supplier — cannot pay %', v_owed, p_amount
      using errcode = '22023';
  end if;

  insert into public.supplier_payments (
    supplier_id, branch_id, amount, method, reference, notes, created_by
  )
  values (
    p_supplier_id, p_branch_id, p_amount, p_method,
    nullif(btrim(coalesce(p_reference, '')), ''),
    nullif(btrim(coalesce(p_notes, '')), ''),
    v_profile_id
  )
  returning id into v_payment_id;

  perform public.recompute_supplier_balance(p_supplier_id);

  return v_payment_id;
end;
$$;

revoke execute on function public.record_customer_payment(
  uuid, uuid, numeric, public.payment_method, text, text) from public, anon;
grant execute on function public.record_customer_payment(
  uuid, uuid, numeric, public.payment_method, text, text) to authenticated;

revoke execute on function public.record_supplier_payment(
  uuid, uuid, numeric, public.payment_method, text, text) from public, anon;
grant execute on function public.record_supplier_payment(
  uuid, uuid, numeric, public.payment_method, text, text) to authenticated;

-- ===========================================================================
-- Bring the existing transactions onto the derived model.
--
-- They no longer add or subtract a delta; they recompute. Same result when
-- everything is consistent, and self-healing when it is not.
-- ===========================================================================
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
           bs.selling_price, bs.purchase_price, bs.branch_id, m.name as medicine_name
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
      sale_id, medicine_id, branch_stock_id, batch_no, quantity,
      unit_price, total_price, cost_price
    )
    values (
      v_sale_id, v_stock.medicine_id, v_stock.id, v_stock.batch_no, v_quantity,
      v_stock.selling_price, v_line_total, v_stock.purchase_price
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

  if p_customer_id is not null then
    perform public.recompute_customer_balance(p_customer_id);
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
  end if;

  if v_sale.customer_id is not null then
    perform public.recompute_customer_balance(v_sale.customer_id);
  end if;

  return v_return_id;
end;
$$;

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
begin
  if not public.can_manage_catalogue() then
    raise exception 'You are not allowed to record purchases' using errcode = '42501';
  end if;

  select p.id into v_profile_id
  from public.profiles p
  where p.auth_id = (select auth.uid())
    and p.is_active = true
    and p.deleted_at is null;

  if v_profile_id is null then
    raise exception 'No active profile for the current user' using errcode = '42501';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Purchase items must be a JSON array' using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'A purchase must have at least one item' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if (v_item ->> 'quantity')::integer <= 0 then
      raise exception 'Quantity must be greater than zero for every item' using errcode = '22023';
    end if;

    if (v_item ->> 'cost_price')::numeric < 0 then
      raise exception 'Cost price cannot be negative' using errcode = '22023';
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

  insert into public.purchases (
    supplier_id, branch_id, purchase_date, invoice_no,
    total_amount, paid_amount, due_amount, notes, created_by
  )
  values (
    p_supplier_id, p_branch_id, coalesce(p_purchase_date, current_date), btrim(p_invoice_no),
    v_total, p_paid_amount, v_due, nullif(btrim(coalesce(p_notes, '')), ''), v_profile_id
  )
  returning id into v_purchase_id;

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

  perform public.recompute_supplier_balance(p_supplier_id);

  return v_purchase_id;
end;
$$;

-- ===========================================================================
-- Reconcile whatever the old delta-based arithmetic left behind.
-- ===========================================================================
do $$
declare
  r record;
begin
  for r in select id from public.customers loop
    perform public.recompute_customer_balance(r.id);
  end loop;

  for r in select id from public.suppliers loop
    perform public.recompute_supplier_balance(r.id);
  end loop;
end;
$$;
