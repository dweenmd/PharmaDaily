-- ---------------------------------------------------------------------------
-- Cash management — till sessions and reconciliation
--
-- Not in the original brief, and the gap it fills is the obvious one once the
-- rest exists: the system knows every taka it EXPECTS to be in the drawer and
-- has never once asked anyone to count it.
--
-- Everything else here is a record of intent — this sale was for 450, that
-- customer paid 200. A till session is the only place the system meets
-- physical reality: someone opens the drawer with a float, works a shift, and
-- counts what is actually there at the end. The difference between expected
-- and counted is the number that matters, because it is the only one that can
-- reveal a mistake nobody reported.
--
-- Expected cash is DERIVED, never stored as a running total:
--
--   opening float
--     + cash taken at the till during the session
--     + cash collected against customer credit
--     - cash refunded on returns
--     - cash paid out (petty expenses, supplier payments, bank deposits)
--
-- Same reasoning as customer balances: a figure computed from records cannot
-- be quietly adjusted to make a shortfall disappear.
-- ---------------------------------------------------------------------------

create type public.cash_movement_type as enum (
  'pay_out',      -- money leaving the drawer for a legitimate purpose
  'pay_in',       -- money added mid-shift that is not a sale
  'bank_deposit'  -- money removed and banked
);

-- ===========================================================================
-- Till sessions.
-- ===========================================================================
create table public.cash_sessions (
  id uuid primary key default gen_random_uuid(),

  branch_id uuid not null references public.branches (id) on delete restrict,
  opened_by uuid references public.profiles (id) on delete set null,
  closed_by uuid references public.profiles (id) on delete set null,

  opening_float numeric(14, 2) not null,

  -- Filled in at close. counted_cash is what was physically in the drawer;
  -- expected_cash is what the records say should have been. Both are frozen
  -- at close so a later backdated entry cannot silently rewrite a reconciled
  -- shift.
  counted_cash numeric(14, 2),
  expected_cash numeric(14, 2),
  variance numeric(14, 2),
  variance_reason text,

  opened_at timestamptz not null default now(),
  closed_at timestamptz,

  notes text,

  constraint cash_sessions_opening_float_non_negative check (opening_float >= 0),
  constraint cash_sessions_counted_non_negative check (counted_cash is null or counted_cash >= 0),

  -- A closed session has all three figures or none of them.
  constraint cash_sessions_close_is_complete check (
    closed_at is null
    or (counted_cash is not null and expected_cash is not null and variance is not null)
  ),

  -- A discrepancy without an explanation is the shape of theft being written
  -- off. Small rounding is tolerated; anything above it has to be accounted
  -- for by a person.
  constraint cash_sessions_variance_explained check (
    closed_at is null
    or abs(coalesce(variance, 0)) <= 1
    or length(btrim(coalesce(variance_reason, ''))) >= 3
  )
);

-- One open session per branch. Two tills open at once would make "expected
-- cash" ambiguous — neither session could say which sales belonged to it.
create unique index cash_sessions_one_open_per_branch
  on public.cash_sessions (branch_id)
  where closed_at is null;

create index cash_sessions_branch_opened_idx
  on public.cash_sessions (branch_id, opened_at desc);

-- ===========================================================================
-- Money moving in or out of the drawer for reasons other than a sale.
-- ===========================================================================
create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),

  session_id uuid not null references public.cash_sessions (id) on delete restrict,
  branch_id uuid not null references public.branches (id) on delete restrict,

  type public.cash_movement_type not null,
  amount numeric(14, 2) not null,
  reason text not null,

  -- What this was for, when it corresponds to something else in the system:
  -- an expense, a supplier payment. Deliberately not a foreign key, since it
  -- points at different tables.
  reference_id uuid,
  reference_type text,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),

  constraint cash_movements_amount_positive check (amount > 0),
  constraint cash_movements_reason_not_blank check (length(btrim(reason)) >= 3)
);

create index cash_movements_session_idx on public.cash_movements (session_id, created_at);

comment on table public.cash_movements is
  'Cash in or out of the drawer other than through a sale. Append-only: a correction is another movement, not an edit.';

-- ===========================================================================
-- Expected cash, derived.
-- ===========================================================================
create or replace function public.cash_session_expected(p_session_id uuid)
returns numeric
language sql
security definer
stable
set search_path = ''
as $$
  with session as (
    select id, branch_id, opening_float, opened_at, coalesce(closed_at, now()) as until
    from public.cash_sessions
    where id = p_session_id
  ),
  -- Cash taken at the till. Only the cash portion of a sale: a card or bKash
  -- payment never reaches the drawer.
  sales_cash as (
    select coalesce(sum(p.amount), 0) as total
    from public.payments p, session s
    where p.branch_id = s.branch_id
      and p.method = 'cash'
      and p.created_at >= s.opened_at
      and p.created_at < s.until
  ),
  -- Credit settled in cash during the shift.
  collections as (
    select coalesce(sum(cp.amount), 0) as total
    from public.customer_payments cp, session s
    where cp.branch_id = s.branch_id
      and cp.method = 'cash'
      and cp.created_at >= s.opened_at
      and cp.created_at < s.until
  ),
  -- Refunds handed back in cash.
  refunds as (
    select coalesce(sum(r.total_refund), 0) as total
    from public.sales_returns r, session s
    where r.branch_id = s.branch_id
      and r.refund_method = 'cash'
      and r.created_at >= s.opened_at
      and r.created_at < s.until
  ),
  movements as (
    select
      coalesce(sum(case when m.type = 'pay_in' then m.amount else 0 end), 0) as in_total,
      coalesce(sum(case when m.type in ('pay_out', 'bank_deposit') then m.amount else 0 end), 0)
        as out_total
    from public.cash_movements m
    where m.session_id = p_session_id
  )
  select
    s.opening_float
      + sc.total
      + c.total
      - r.total
      + mv.in_total
      - mv.out_total
  from session s, sales_cash sc, collections c, refunds r, movements mv;
$$;

revoke execute on function public.cash_session_expected(uuid) from public, anon;
grant execute on function public.cash_session_expected(uuid) to authenticated;

comment on function public.cash_session_expected(uuid) is
  'What should be in the drawer, computed from the records. Never stored while a session is open, so it cannot be nudged to match a count.';

-- ===========================================================================
-- Opening and closing.
-- ===========================================================================
create or replace function public.open_cash_session(
  p_branch_id uuid,
  p_opening_float numeric,
  p_notes text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_session_id uuid;
begin
  if not public.can_sell() then
    raise exception 'Your role is not permitted to operate the till' using errcode = '42501';
  end if;

  select p.id into v_profile_id
  from public.profiles p
  where p.auth_id = (select auth.uid())
    and p.is_active = true
    and p.deleted_at is null;

  if v_profile_id is null then
    raise exception 'No active profile for the current user' using errcode = '42501';
  end if;

  if p_opening_float is null or p_opening_float < 0 then
    raise exception 'Opening float cannot be negative' using errcode = '22023';
  end if;

  insert into public.cash_sessions (branch_id, opened_by, opening_float, notes)
  values (p_branch_id, v_profile_id, p_opening_float, nullif(btrim(coalesce(p_notes, '')), ''))
  returning id into v_session_id;

  return v_session_id;
exception
  -- The partial unique index. A clearer message than the raw constraint name.
  when unique_violation then
    raise exception 'A till session is already open at this branch. Close it first.'
      using errcode = '23505';
end;
$$;

create or replace function public.close_cash_session(
  p_session_id uuid,
  p_counted_cash numeric,
  p_variance_reason text default null
)
returns numeric
language plpgsql
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_session record;
  v_expected numeric(14, 2);
  v_variance numeric(14, 2);
begin
  if not public.can_sell() then
    raise exception 'Your role is not permitted to close the till' using errcode = '42501';
  end if;

  select p.id into v_profile_id
  from public.profiles p
  where p.auth_id = (select auth.uid())
    and p.is_active = true
    and p.deleted_at is null;

  if v_profile_id is null then
    raise exception 'No active profile for the current user' using errcode = '42501';
  end if;

  if p_counted_cash is null or p_counted_cash < 0 then
    raise exception 'Enter the amount counted in the drawer' using errcode = '22023';
  end if;

  select cs.id, cs.branch_id, cs.closed_at into v_session
  from public.cash_sessions cs
  where cs.id = p_session_id
  for update;

  if v_session.id is null then
    raise exception 'Till session not found' using errcode = '23503';
  end if;

  if v_session.closed_at is not null then
    raise exception 'This till session is already closed' using errcode = '22023';
  end if;

  -- Computed here, inside the same transaction as the close, so the figure
  -- cannot drift between being shown and being committed.
  v_expected := public.cash_session_expected(p_session_id);
  v_variance := p_counted_cash - v_expected;

  if abs(v_variance) > 1 and length(btrim(coalesce(p_variance_reason, ''))) < 3 then
    raise exception 'The drawer is out by %. Explain the difference before closing.',
      abs(v_variance)
      using errcode = '22023';
  end if;

  update public.cash_sessions
  set closed_by = v_profile_id,
      closed_at = now(),
      counted_cash = p_counted_cash,
      expected_cash = v_expected,
      variance = v_variance,
      variance_reason = nullif(btrim(coalesce(p_variance_reason, '')), '')
  where id = p_session_id;

  return v_variance;
end;
$$;

create or replace function public.record_cash_movement(
  p_session_id uuid,
  p_type public.cash_movement_type,
  p_amount numeric,
  p_reason text,
  p_reference_id uuid default null,
  p_reference_type text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_session record;
  v_movement_id uuid;
  v_available numeric(14, 2);
begin
  if not public.can_sell() then
    raise exception 'Your role is not permitted to move cash' using errcode = '42501';
  end if;

  select p.id into v_profile_id
  from public.profiles p
  where p.auth_id = (select auth.uid())
    and p.is_active = true
    and p.deleted_at is null;

  if v_profile_id is null then
    raise exception 'No active profile for the current user' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero' using errcode = '22023';
  end if;

  if length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Say what this cash is for' using errcode = '22023';
  end if;

  select cs.id, cs.branch_id, cs.closed_at into v_session
  from public.cash_sessions cs
  where cs.id = p_session_id
  for update;

  if v_session.id is null then
    raise exception 'Till session not found' using errcode = '23503';
  end if;

  if v_session.closed_at is not null then
    raise exception 'That till session is closed' using errcode = '22023';
  end if;

  -- Taking out more than is in the drawer is not a data-entry slip worth
  -- allowing: it means the count is already wrong.
  if p_type in ('pay_out', 'bank_deposit') then
    v_available := public.cash_session_expected(p_session_id);

    if p_amount > v_available then
      raise exception 'Only % is in the drawer — cannot take out %', v_available, p_amount
        using errcode = '22023';
    end if;
  end if;

  insert into public.cash_movements (
    session_id, branch_id, type, amount, reason, reference_id, reference_type, created_by
  )
  values (
    p_session_id, v_session.branch_id, p_type, p_amount, btrim(p_reason),
    p_reference_id, nullif(btrim(coalesce(p_reference_type, '')), ''), v_profile_id
  )
  returning id into v_movement_id;

  return v_movement_id;
end;
$$;

revoke execute on function public.open_cash_session(uuid, numeric, text) from public, anon;
revoke execute on function public.close_cash_session(uuid, numeric, text) from public, anon;
revoke execute on function public.record_cash_movement(
  uuid, public.cash_movement_type, numeric, text, uuid, text) from public, anon;

grant execute on function public.open_cash_session(uuid, numeric, text) to authenticated;
grant execute on function public.close_cash_session(uuid, numeric, text) to authenticated;
grant execute on function public.record_cash_movement(
  uuid, public.cash_movement_type, numeric, text, uuid, text) to authenticated;

-- ===========================================================================
-- RLS
-- ===========================================================================
alter table public.cash_sessions enable row level security;
alter table public.cash_sessions force row level security;
revoke all on public.cash_sessions from anon;
grant select on public.cash_sessions to authenticated;

-- No INSERT or UPDATE grant: sessions are opened and closed only through the
-- functions, which compute the expected figure themselves. A settable
-- expected_cash would make the whole exercise pointless.
create policy "cash_sessions_select"
  on public.cash_sessions for select
  to authenticated
  using (public.is_super_admin() or branch_id = public.current_user_branch_id());

alter table public.cash_movements enable row level security;
alter table public.cash_movements force row level security;
revoke all on public.cash_movements from anon;
grant select on public.cash_movements to authenticated;

create policy "cash_movements_select"
  on public.cash_movements for select
  to authenticated
  using (public.is_super_admin() or branch_id = public.current_user_branch_id());
