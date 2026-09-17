-- ---------------------------------------------------------------------------
-- Phase 4 / 5 — automated stock alerts
--
-- Scans stock and writes notification rows for anything low, near expiry or
-- already expired. Idempotent: the partial unique index on unread
-- (branch_id, dedupe_key) means running it repeatedly refreshes rather than
-- duplicates, so it is safe to call on every dashboard load as well as from a
-- scheduler.
--
-- SECURITY DEFINER, because it must scan every branch regardless of who
-- triggered it — and because an alert nobody can forge is an alert worth
-- trusting. No INSERT is granted on notifications to anyone else.
--
-- Thresholds come from settings: a branch row overrides the global one, so
-- head office sets a default and a busy outlet can tighten it.
-- ---------------------------------------------------------------------------

create or replace function public.refresh_stock_alerts(p_branch_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_created integer := 0;
  v_near_expiry_days integer;
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
  -- Low stock, judged on the TOTAL across batches. Five strips in one batch
  -- and five in another is ten in hand; alerting per batch would raise two
  -- alerts for stock that is not actually low, and staff would stop reading
  -- them.
  -- -------------------------------------------------------------------------
  with totals as (
    select bs.branch_id, bs.medicine_id, m.name, m.strength, m.reorder_level,
           sum(bs.quantity) as on_hand
    from public.branch_stocks bs
    join public.medicines m on m.id = bs.medicine_id
    where bs.quantity > 0
      and m.is_active = true
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
  -- Near expiry, per batch — here the batch IS the unit of action, because it
  -- is a specific batch that has to be pulled or discounted.
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
  -- Already expired. Separate type, because this is not a warning to plan
  -- around — it is stock that must come off the shelf today.
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
  -- Clear alerts that have resolved themselves. A restocked medicine should
  -- not leave a stale "running low" sitting in the bell — an alert list that
  -- is not trustworthy gets ignored wholesale.
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

  update public.notifications n
  set is_read = true
  where n.is_read = false
    and n.type in ('near_expiry', 'expired')
    and (p_branch_id is null or n.branch_id = p_branch_id)
    and not exists (
      select 1 from public.branch_stocks bs
      where bs.quantity > 0
        and (n.dedupe_key = 'near_expiry:' || bs.id::text
             or n.dedupe_key = 'expired:' || bs.id::text)
    );

  return v_created;
end;
$$;

revoke execute on function public.refresh_stock_alerts(uuid) from public, anon;
grant execute on function public.refresh_stock_alerts(uuid) to authenticated;

comment on function public.refresh_stock_alerts(uuid) is
  'Generates low-stock, near-expiry and expired alerts, and clears ones that have resolved. Idempotent — safe to call on every dashboard load or from a scheduler.';
