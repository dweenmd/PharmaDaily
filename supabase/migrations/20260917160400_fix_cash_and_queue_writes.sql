-- ---------------------------------------------------------------------------
-- Fix: opening a till and syncing an offline sale both failed on RLS
--
-- Both tables were created with SELECT grants only, on the reasoning that
-- "they are written through functions, so nothing else needs INSERT". That
-- reasoning is wrong for a SECURITY INVOKER function: it executes AS THE
-- CALLER, so it faces exactly the grants the caller does. The functions could
-- not write the tables either, and both failed at the first insert.
--
-- Same mistake as the transfer receive bug. Worth naming the pattern: a
-- SECURITY INVOKER function is not a privileged path. It is a convenience and
-- an atomicity boundary. Anything it writes, its caller must be allowed to
-- write.
--
-- Two different fixes, because the two tables need different things.
--
-- CASH SESSIONS stay ungranted and the functions become SECURITY DEFINER. The
-- reason for keeping the table closed was never authorisation — it was that
-- expected_cash and variance must be computed, never supplied. A direct UPDATE
-- grant would let a cashier close a till by typing in whatever figure made the
-- drawer balance, which defeats the entire point of counting it.
--
-- That makes the branch check this function's own responsibility. As an
-- INVOKER function it got that for free from RLS; as DEFINER it has to do it
-- explicitly, and forgetting is how a DEFINER function becomes a
-- privilege-escalation hole. So it is done first, in all three.
--
-- THE OFFLINE QUEUE is granted normally instead. It is a staging area, not a
-- financial record: a row in it is a sale that does not exist on the server
-- yet, and forging one achieves nothing, because replay still goes through
-- create_sale() with every stock check and price lookup intact. Keeping
-- sync_offline_sale() as INVOKER also matters — it calls create_sale(), and a
-- SECURITY INVOKER function called from inside a DEFINER one would run with
-- the definer's rights and quietly bypass RLS on the sale itself.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- The offline queue: ordinary grants, branch-scoped.
-- ===========================================================================
grant insert, update on public.offline_sync_queue to authenticated;

create policy "offline_sync_queue_insert"
  on public.offline_sync_queue for insert
  to authenticated
  with check (
    public.can_sell()
    and (public.is_super_admin() or branch_id = public.current_user_branch_id())
  );

create policy "offline_sync_queue_update"
  on public.offline_sync_queue for update
  to authenticated
  using (public.is_super_admin() or branch_id = public.current_user_branch_id())
  with check (public.is_super_admin() or branch_id = public.current_user_branch_id());

-- ===========================================================================
-- Cash: SECURITY DEFINER, with the branch check written out.
-- ===========================================================================
create or replace function public.open_cash_session(
  p_branch_id uuid,
  p_opening_float numeric,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_branch_id uuid;
  v_session_id uuid;
begin
  if not public.can_sell() then
    raise exception 'Your role is not permitted to operate the till' using errcode = '42501';
  end if;

  select p.id, p.branch_id into v_profile_id, v_branch_id
  from public.profiles p
  where p.auth_id = (select auth.uid())
    and p.is_active = true
    and p.deleted_at is null;

  if v_profile_id is null then
    raise exception 'No active profile for the current user' using errcode = '42501';
  end if;

  -- The check RLS used to make. A till belongs to the branch its operator
  -- stands in; a super admin may act anywhere.
  if not public.is_super_admin() and p_branch_id is distinct from v_branch_id then
    raise exception 'You can only open the till at your own branch' using errcode = '42501';
  end if;

  if p_opening_float is null or p_opening_float < 0 then
    raise exception 'Opening float cannot be negative' using errcode = '22023';
  end if;

  insert into public.cash_sessions (branch_id, opened_by, opening_float, notes)
  values (p_branch_id, v_profile_id, p_opening_float, nullif(btrim(coalesce(p_notes, '')), ''))
  returning id into v_session_id;

  return v_session_id;
exception
  when unique_violation then
    raise exception 'A till session is already open at this branch. Close it first.'
      using errcode = '23505';
end;
$$;

-- ---------------------------------------------------------------------------

create or replace function public.close_cash_session(
  p_session_id uuid,
  p_counted_cash numeric,
  p_variance_reason text default null
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_branch_id uuid;
  v_session record;
  v_expected numeric(14, 2);
  v_variance numeric(14, 2);
begin
  if not public.can_sell() then
    raise exception 'Your role is not permitted to close the till' using errcode = '42501';
  end if;

  select p.id, p.branch_id into v_profile_id, v_branch_id
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

  if not public.is_super_admin() and v_session.branch_id is distinct from v_branch_id then
    raise exception 'That till belongs to another branch' using errcode = '42501';
  end if;

  if v_session.closed_at is not null then
    raise exception 'This till session is already closed' using errcode = '22023';
  end if;

  -- Computed here, inside the same transaction as the close, so the figure
  -- cannot drift between being shown on screen and being committed.
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

-- ---------------------------------------------------------------------------

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
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_branch_id uuid;
  v_session record;
  v_movement_id uuid;
  v_available numeric(14, 2);
begin
  if not public.can_sell() then
    raise exception 'Your role is not permitted to move cash' using errcode = '42501';
  end if;

  select p.id, p.branch_id into v_profile_id, v_branch_id
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

  if not public.is_super_admin() and v_session.branch_id is distinct from v_branch_id then
    raise exception 'That till belongs to another branch' using errcode = '42501';
  end if;

  if v_session.closed_at is not null then
    raise exception 'That till session is closed' using errcode = '22023';
  end if;

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
