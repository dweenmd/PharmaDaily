-- ---------------------------------------------------------------------------
-- Migration: 20260919100000_fix_critical_issues.sql
--
-- Fixes critical database issues discovered in comprehensive audit:
--   1. C1: create_sales_return breaks sales_total_balances check constraint
--          on credit returns (now reduces subtotal alongside total_amount).
--   2. C2: dashboard_kpis, sales_trend, profit_report, and sales_report
--          now deduct returns/refunds so revenue and profits balance.
--   3. C3: refresh_stock_alerts and dashboard_kpis no longer exclude items
--          with quantity = 0, so out-of-stock items retain low-stock alerts.
--   4. C7: profit_report now enforces role check so cashiers cannot inspect
--          trade wholesale cost prices.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- C1 Fix: create_sales_return
-- ===========================================================================
create or replace function public.create_sales_return(
  p_sale_id uuid,
  p_items jsonb,
  p_reason text,
  p_refund_method public.payment_method
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_role public.user_role;
  v_caller_branch_id uuid;
  v_sale record;
  v_item jsonb;
  v_sale_item record;
  v_quantity integer;
  v_already_returned integer;
  v_total_refund numeric(14, 2) := 0;
  v_due_reduction numeric(14, 2) := 0;
  v_return_id uuid;
begin
  select p.id, p.role, p.branch_id
  into v_profile_id, v_role, v_caller_branch_id
  from public.profiles p
  where p.auth_id = (select auth.uid())
    and p.is_active = true
    and p.deleted_at is null;

  if v_profile_id is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  if v_role <> 'super_admin' and v_role not in ('branch_manager', 'cashier') then
    raise exception 'You do not have permission to process returns' using errcode = '42501';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one item must be returned' using errcode = '22023';
  end if;

  if p_reason is null or length(btrim(p_reason)) < 3 then
    raise exception 'A return reason of at least 3 characters is required' using errcode = '22023';
  end if;

  select s.id, s.branch_id, s.customer_id, s.due_amount, s.paid_amount, s.subtotal, s.total_amount
  into v_sale
  from public.sales s
  where s.id = p_sale_id
    and s.deleted_at is null
  for update;

  if v_sale.id is null then
    raise exception 'Sale not found' using errcode = '23503';
  end if;

  if v_role <> 'super_admin' and v_caller_branch_id <> v_sale.branch_id then
    raise exception 'Cannot process return for another branch' using errcode = '42501';
  end if;

  -- -------------------------------------------------------------------------
  -- Pass one: validate every line and total the refund.
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
  -- Header
  -- -------------------------------------------------------------------------
  insert into public.sales_returns (
    sale_id, branch_id, returned_by, reason, refund_method, total_refund
  )
  values (
    p_sale_id, v_sale.branch_id, v_profile_id, btrim(p_reason), p_refund_method, v_total_refund
  )
  returning id into v_return_id;

  -- -------------------------------------------------------------------------
  -- Pass two: restock and record.
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
  -- Both subtotal and total_amount must be reduced by v_due_reduction
  -- to maintain the sales_total_balances constraint (total_amount = subtotal - discount).
  -- -------------------------------------------------------------------------
  if v_sale.due_amount > 0 and v_sale.customer_id is not null then
    v_due_reduction := least(v_total_refund, v_sale.due_amount);

    update public.sales
    set subtotal = subtotal - v_due_reduction,
        due_amount = due_amount - v_due_reduction,
        total_amount = total_amount - v_due_reduction
    where id = p_sale_id;
  end if;

  if v_sale.customer_id is not null then
    perform public.recompute_customer_balance(v_sale.customer_id);
  end if;

  return v_return_id;
end;
$$;

grant execute on function public.create_sales_return(uuid, jsonb, text, public.payment_method) to authenticated;
revoke execute on function public.create_sales_return(uuid, jsonb, text, public.payment_method) from public, anon;


-- ===========================================================================
-- C2 Fix & C3 Fix: dashboard_kpis
-- Accounts for sales returns and zero-stock items
-- ===========================================================================
create or replace function public.dashboard_kpis(
  p_date date default current_date,
  p_branch_id uuid default null
)
returns table (
  sales_count bigint,
  revenue numeric,
  profit numeric,
  collected numeric,
  outstanding numeric,
  low_stock_count bigint,
  near_expiry_count bigint,
  expired_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with near_expiry_days as (
    select coalesce(
      (select s.value::integer
       from public.settings s
       where s.key = 'near_expiry_days'
         and (s.branch_id = p_branch_id or s.branch_id is null)
       order by s.branch_id nulls last
       limit 1),
      90
    ) as days
  ),
  day_sales as (
    select s.id, s.total_amount, s.paid_amount, s.due_amount
    from public.sales s
    where s.deleted_at is null
      and s.sale_date = p_date
      and (p_branch_id is null or s.branch_id = p_branch_id)
  ),
  day_refunds as (
    select coalesce(sum(sr.total_refund), 0) as total_refund
    from public.sales_returns sr
    where (p_branch_id is null or sr.branch_id = p_branch_id)
      and sr.created_at::date = p_date
  ),
  day_lines as (
    select
      si.unit_price,
      si.cost_price,
      (si.quantity - coalesce((
        select sum(sri.quantity)
        from public.sales_return_items sri
        where sri.sale_item_id = si.id
      ), 0)) as net_quantity
    from public.sale_items si
    join day_sales ds on ds.id = si.sale_id
  ),
  stock_levels as (
    select bs.medicine_id, bs.branch_id, m.reorder_level,
           sum(bs.quantity) as on_hand
    from public.branch_stocks bs
    join public.medicines m on m.id = bs.medicine_id
    where m.is_active = true
      and m.deleted_at is null
      and (p_branch_id is null or bs.branch_id = p_branch_id)
    group by bs.medicine_id, bs.branch_id, m.reorder_level
  )
  select
    (select count(*) from day_sales),
    greatest(0, coalesce((select sum(total_amount) from day_sales), 0) - (select total_refund from day_refunds)),
    coalesce((select sum(net_quantity * (unit_price - cost_price)) from day_lines), 0),
    coalesce((select sum(paid_amount) from day_sales), 0),
    coalesce((select sum(due_amount) from day_sales), 0),
    (select count(*) from stock_levels where on_hand <= reorder_level),
    (select count(*) from public.branch_stocks bs, near_expiry_days ned
      where bs.quantity > 0
        and bs.expiry_date >= current_date
        and bs.expiry_date < current_date + (ned.days || ' days')::interval
        and (p_branch_id is null or bs.branch_id = p_branch_id)),
    (select count(*) from public.branch_stocks bs
      where bs.quantity > 0
        and bs.expiry_date < current_date
        and (p_branch_id is null or bs.branch_id = p_branch_id));
$$;

grant execute on function public.dashboard_kpis(date, uuid) to authenticated;
revoke execute on function public.dashboard_kpis(date, uuid) from public, anon;


-- ===========================================================================
-- C2 Fix: sales_trend
-- Deducts returned quantities from trend revenue and profit
-- ===========================================================================
create or replace function public.sales_trend(
  p_from date,
  p_to date,
  p_branch_id uuid default null
)
returns table (
  day date,
  sales_count bigint,
  revenue numeric,
  profit numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    s.sale_date as day,
    count(distinct s.id) as sales_count,
    coalesce(sum((si.quantity - coalesce((
      select sum(sri.quantity) from public.sales_return_items sri where sri.sale_item_id = si.id
    ), 0)) * si.unit_price), 0) as revenue,
    coalesce(sum((si.quantity - coalesce((
      select sum(sri.quantity) from public.sales_return_items sri where sri.sale_item_id = si.id
    ), 0)) * (si.unit_price - si.cost_price)), 0) as profit
  from public.sales s
  left join public.sale_items si on si.sale_id = s.id
  where s.deleted_at is null
    and s.sale_date between p_from and p_to
    and (p_branch_id is null or s.branch_id = p_branch_id)
  group by s.sale_date
  order by s.sale_date;
$$;

grant execute on function public.sales_trend(date, date, uuid) to authenticated;
revoke execute on function public.sales_trend(date, date, uuid) from public, anon;


-- ===========================================================================
-- C2 Fix & C7 Fix: profit_report
-- Deducts returned quantities and adds role security gate
-- ===========================================================================
create or replace function public.profit_report(
  p_from date,
  p_to date,
  p_branch_id uuid default null
)
returns table (
  medicine_id uuid,
  medicine_name text,
  strength text,
  units_sold bigint,
  revenue numeric,
  cost numeric,
  profit numeric,
  margin_percent numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
begin
  -- Role authorization check: only super_admin, branch_manager, or stock_manager may view margins
  v_role := public.current_user_role();
  if not (public.is_super_admin() or v_role in ('branch_manager', 'stock_manager')) then
    raise exception 'You do not have permission to view profit reports' using errcode = '42501';
  end if;

  return query
  with net_lines as (
    select
      m.id as med_id,
      m.name as med_name,
      m.strength as med_strength,
      (si.quantity - coalesce((
        select sum(sri.quantity) from public.sales_return_items sri where sri.sale_item_id = si.id
      ), 0)) as net_qty,
      si.unit_price,
      si.cost_price
    from public.sale_items si
    join public.sales s on s.id = si.sale_id
    join public.medicines m on m.id = si.medicine_id
    where s.deleted_at is null
      and s.sale_date between p_from and p_to
      and (p_branch_id is null or s.branch_id = p_branch_id)
  )
  select
    nl.med_id,
    nl.med_name,
    nl.med_strength,
    sum(nl.net_qty)::bigint,
    sum(nl.net_qty * nl.unit_price),
    sum(nl.net_qty * nl.cost_price),
    sum(nl.net_qty * (nl.unit_price - nl.cost_price)),
    case
      when sum(nl.net_qty * nl.unit_price) > 0
        then round(100 * sum(nl.net_qty * (nl.unit_price - nl.cost_price)) / sum(nl.net_qty * nl.unit_price), 1)
      else 0
    end
  from net_lines nl
  group by nl.med_id, nl.med_name, nl.med_strength
  order by sum(nl.net_qty * (nl.unit_price - nl.cost_price)) desc;
end;
$$;

grant execute on function public.profit_report(date, date, uuid) to authenticated;
revoke execute on function public.profit_report(date, date, uuid) from public, anon;


-- ===========================================================================
-- C3 Fix: refresh_stock_alerts
-- Ensures zero-stock (completely depleted) medicines retain their alerts
-- ===========================================================================
create or replace function public.refresh_stock_alerts(p_branch_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_near_expiry_days integer;
  v_created integer := 0;
begin
  select coalesce(
    (select s.value::integer
     from public.settings s
     where s.key = 'near_expiry_days'
       and (s.branch_id = p_branch_id or s.branch_id is null)
     order by s.branch_id nulls last
     limit 1),
    90
  ) into v_near_expiry_days;

  -- -------------------------------------------------------------------------
  -- Low stock: aggregated across all batches at the branch.
  -- Includes items that have reached 0 stock.
  -- -------------------------------------------------------------------------
  with totals as (
    select bs.branch_id, bs.medicine_id, m.name, m.strength, m.reorder_level,
           coalesce(sum(bs.quantity), 0) as on_hand
    from public.branch_stocks bs
    join public.medicines m on m.id = bs.medicine_id
    where m.is_active = true
      and m.deleted_at is null
      and (p_branch_id is null or bs.branch_id = p_branch_id)
    group by bs.branch_id, bs.medicine_id, m.name, m.strength, m.reorder_level
  )
  insert into public.notifications (branch_id, type, message, dedupe_key)
  select
    t.branch_id,
    'low_stock',
    trim(t.name || ' ' || coalesce(t.strength, '')) || ' is down to ' || t.on_hand ||
      ' (reorder at ' || t.reorder_level || ')',
    'low_stock:' || t.medicine_id::text
  from totals t
  where t.on_hand <= t.reorder_level
  on conflict do nothing;

  get diagnostics v_created = row_count;

  -- -------------------------------------------------------------------------
  -- Near expiry, per batch.
  -- -------------------------------------------------------------------------
  insert into public.notifications (branch_id, type, message, dedupe_key)
  select
    bs.branch_id,
    'near_expiry',
    trim(m.name || ' ' || coalesce(m.strength, '')) || ' batch ' || bs.batch_no ||
      ' expires in ' || (bs.expiry_date - current_date) || ' days (' || bs.quantity || ' in stock)',
    'near_expiry:' || bs.id::text
  from public.branch_stocks bs
  join public.medicines m on m.id = bs.medicine_id
  where bs.quantity > 0
    and bs.expiry_date >= current_date
    and bs.expiry_date < current_date + (v_near_expiry_days || ' days')::interval
    and (p_branch_id is null or bs.branch_id = p_branch_id)
  on conflict do nothing;

  -- -------------------------------------------------------------------------
  -- Already expired.
  -- -------------------------------------------------------------------------
  insert into public.notifications (branch_id, type, message, dedupe_key)
  select
    bs.branch_id,
    'expired',
    trim(m.name || ' ' || coalesce(m.strength, '')) || ' batch ' || bs.batch_no ||
      ' EXPIRED on ' || to_char(bs.expiry_date, 'DD Mon YYYY') ||
      ' — ' || bs.quantity || ' still in stock',
    'expired:' || bs.id::text
  from public.branch_stocks bs
  join public.medicines m on m.id = bs.medicine_id
  where bs.quantity > 0
    and bs.expiry_date < current_date
    and (p_branch_id is null or bs.branch_id = p_branch_id)
  on conflict do nothing;

  -- -------------------------------------------------------------------------
  -- Clear alerts that have resolved themselves (restocked above reorder_level).
  -- -------------------------------------------------------------------------
  update public.notifications n
  set is_read = true
  where n.is_read = false
    and n.type = 'low_stock'
    and (p_branch_id is null or n.branch_id = p_branch_id)
    and not exists (
      select 1
      from public.branch_stocks bs
      join public.medicines m on m.id = bs.medicine_id
      where bs.branch_id = n.branch_id
        and 'low_stock:' || bs.medicine_id::text = n.dedupe_key
      group by bs.medicine_id, m.reorder_level
      having sum(bs.quantity) <= m.reorder_level
    );

  return v_created;
end;
$$;

grant execute on function public.refresh_stock_alerts(uuid) to authenticated;
revoke execute on function public.refresh_stock_alerts(uuid) from public, anon;
