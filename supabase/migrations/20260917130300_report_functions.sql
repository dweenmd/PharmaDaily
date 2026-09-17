-- ---------------------------------------------------------------------------
-- Phase 4 / 4 — reporting
--
-- Aggregation happens in the database, not in JavaScript. A year of sales is
-- hundreds of thousands of rows; pulling them to the client to sum them would
-- be slow, memory-hungry, and would hit PostgREST's row limit long before it
-- hit a correctness problem — which is worse, because the numbers would simply
-- be wrong without anything failing.
--
-- Every function here is SECURITY INVOKER, so the same RLS policies apply as
-- to a direct query: a branch manager's report covers their branch, a super
-- admin's covers whatever they ask for. No function re-implements that check.
--
-- Note the deliberate absence of a `p_branch_id` filter that could widen
-- access: passing another branch's id simply returns nothing, because the
-- underlying SELECT is still filtered by policy.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- Dashboard KPIs for a day.
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
  day_lines as (
    select si.total_price, si.cost_price, si.quantity
    from public.sale_items si
    join day_sales ds on ds.id = si.sale_id
  ),
  stock_levels as (
    select bs.medicine_id, bs.branch_id, m.reorder_level,
           sum(bs.quantity) as on_hand
    from public.branch_stocks bs
    join public.medicines m on m.id = bs.medicine_id
    where bs.quantity > 0
      and (p_branch_id is null or bs.branch_id = p_branch_id)
    group by bs.medicine_id, bs.branch_id, m.reorder_level
  )
  select
    (select count(*) from day_sales),
    coalesce((select sum(total_amount) from day_sales), 0),
    -- Profit uses the cost frozen onto each line at sale time, never today's
    -- batch price. Discounts are not apportioned across lines, so this is
    -- gross margin before discount; the sales report shows discount separately.
    coalesce((select sum(total_price - (cost_price * quantity)) from day_lines), 0),
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
-- Daily sales trend, for the dashboard chart and the sales report.
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
    coalesce(sum(si.total_price), 0) as revenue,
    coalesce(sum(si.total_price - (si.cost_price * si.quantity)), 0) as profit
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
-- Profit per medicine.
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
language sql
stable
security invoker
set search_path = ''
as $$
  select
    m.id,
    m.name,
    m.strength,
    sum(si.quantity)::bigint,
    sum(si.total_price),
    sum(si.cost_price * si.quantity),
    sum(si.total_price - (si.cost_price * si.quantity)),
    case
      when sum(si.total_price) > 0
        then round(100 * sum(si.total_price - (si.cost_price * si.quantity)) / sum(si.total_price), 1)
      else 0
    end
  from public.sale_items si
  join public.sales s on s.id = si.sale_id
  join public.medicines m on m.id = si.medicine_id
  where s.deleted_at is null
    and s.sale_date between p_from and p_to
    and (p_branch_id is null or s.branch_id = p_branch_id)
  group by m.id, m.name, m.strength
  order by sum(si.total_price - (si.cost_price * si.quantity)) desc;
$$;

grant execute on function public.profit_report(date, date, uuid) to authenticated;
revoke execute on function public.profit_report(date, date, uuid) from public, anon;

-- ===========================================================================
-- Stock valuation, grouped by category and supplier.
-- ===========================================================================
create or replace function public.stock_report(p_branch_id uuid default null)
returns table (
  branch_id uuid,
  branch_code text,
  category_name text,
  supplier_name text,
  batch_count bigint,
  total_quantity bigint,
  cost_value numeric,
  retail_value numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    bs.branch_id,
    b.code,
    coalesce(mc.name, 'Uncategorised'),
    coalesce(sup.name, 'Unknown supplier'),
    count(*)::bigint,
    sum(bs.quantity)::bigint,
    sum(bs.quantity * bs.purchase_price),
    sum(bs.quantity * bs.selling_price)
  from public.branch_stocks bs
  join public.branches b on b.id = bs.branch_id
  join public.medicines m on m.id = bs.medicine_id
  left join public.medicine_categories mc on mc.id = m.category_id
  left join public.suppliers sup on sup.id = bs.supplier_id
  where bs.quantity > 0
    and (p_branch_id is null or bs.branch_id = p_branch_id)
  group by bs.branch_id, b.code, mc.name, sup.name
  order by sum(bs.quantity * bs.purchase_price) desc;
$$;

grant execute on function public.stock_report(uuid) to authenticated;
revoke execute on function public.stock_report(uuid) from public, anon;

-- ===========================================================================
-- Sales, itemised, for the filterable report and CSV export.
-- ===========================================================================
create or replace function public.sales_report(
  p_from date,
  p_to date,
  p_branch_id uuid default null,
  p_cashier_id uuid default null,
  p_payment_method public.payment_method default null
)
returns table (
  sale_id uuid,
  invoice_no text,
  sale_date date,
  created_at timestamptz,
  branch_code text,
  cashier_name text,
  customer_name text,
  subtotal numeric,
  discount numeric,
  total_amount numeric,
  paid_amount numeric,
  due_amount numeric,
  profit numeric,
  methods text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    s.id,
    s.invoice_no,
    s.sale_date,
    s.created_at,
    b.code,
    coalesce(p.name, 'Unknown'),
    coalesce(c.name, 'Walk-in'),
    s.subtotal,
    s.discount,
    s.total_amount,
    s.paid_amount,
    s.due_amount,
    coalesce(
      (select sum(si.total_price - (si.cost_price * si.quantity))
       from public.sale_items si where si.sale_id = s.id),
      0
    ),
    coalesce(
      (select string_agg(distinct pay.method::text, ', ')
       from public.payments pay where pay.sale_id = s.id),
      'due'
    )
  from public.sales s
  join public.branches b on b.id = s.branch_id
  left join public.profiles p on p.id = s.cashier_id
  left join public.customers c on c.id = s.customer_id
  where s.deleted_at is null
    and s.sale_date between p_from and p_to
    and (p_branch_id is null or s.branch_id = p_branch_id)
    and (p_cashier_id is null or s.cashier_id = p_cashier_id)
    and (
      p_payment_method is null
      or exists (
        select 1 from public.payments pay
        where pay.sale_id = s.id and pay.method = p_payment_method
      )
    )
  order by s.created_at desc
  limit 5000;
$$;

grant execute on function public.sales_report(date, date, uuid, uuid, public.payment_method)
  to authenticated;
revoke execute on function public.sales_report(date, date, uuid, uuid, public.payment_method)
  from public, anon;

comment on function public.dashboard_kpis(date, uuid) is
  'Day KPIs. SECURITY INVOKER, so RLS scopes it to what the caller may see — passing another branch id returns nothing rather than more.';
