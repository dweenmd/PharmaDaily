-- ---------------------------------------------------------------------------
-- Phase 1 / 4 of 6 — RLS helper functions
--
-- THIS FILE IS THE SECURITY FOUNDATION OF THE WHOLE APPLICATION.
-- Every branch-scoped policy in Phases 2-6 is written in terms of these three
-- functions. Change them carefully; re-run `npm run verify:rls` afterwards.
--
-- Why functions instead of inlining `select branch_id from profiles ...` into
-- each policy:
--
--   1. RECURSION. profiles is itself RLS-protected. A policy that subqueries
--      profiles would re-enter profiles' own policies, which subquery
--      profiles, and so on. These functions are SECURITY DEFINER, so they read
--      profiles with the definer's rights and bypass RLS — breaking the loop.
--
--   2. ONE DEFINITION. Phase 6 will have ~20 tables. Branch isolation must be
--      expressed once, not re-derived (and re-bugged) twenty times.
--
-- Hardening applied to all three:
--   * SECURITY DEFINER + `set search_path = ''` — a caller cannot shadow
--     `public` or `auth` with their own schema to hijack resolution, so every
--     identifier below is fully qualified.
--   * STABLE — result is fixed within a statement, so Postgres evaluates them
--     once per query rather than once per row.
--   * They filter on auth.uid() ONLY. There is no parameter to pass, so a
--     caller cannot ask about somebody else's profile.
--   * Deactivated and soft-deleted profiles resolve to NULL, which makes every
--     policy built on them fail closed rather than open.
--   * EXECUTE is revoked from PUBLIC and anon, then granted to authenticated
--     explicitly. Without the revoke, Postgres' default of granting EXECUTE to
--     PUBLIC would let an unauthenticated request call them.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- current_user_role() -> the caller's role, or NULL when they have no usable
-- profile (not signed in, deactivated, or soft-deleted).
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
stable
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.auth_id = (select auth.uid())
    and p.is_active = true
    and p.deleted_at is null
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- current_user_branch_id() -> the caller's branch, or NULL for a super_admin
-- (who is deliberately unscoped) and for anyone without a usable profile.
--
-- NOTE for Phase 2-6 policy authors: because this can be NULL, a policy of the
-- form `branch_id = public.current_user_branch_id()` evaluates to NULL (not
-- true) for a super_admin — which is exactly why every table also gets a
-- separate is_super_admin() policy rather than relying on this one.
-- ---------------------------------------------------------------------------
create or replace function public.current_user_branch_id()
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select p.branch_id
  from public.profiles p
  where p.auth_id = (select auth.uid())
    and p.is_active = true
    and p.deleted_at is null
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- is_super_admin() -> true only for an active super_admin. Never NULL, so it
-- is safe to use as a bare policy predicate.
-- ---------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(
    (
      select p.role = 'super_admin'
      from public.profiles p
      where p.auth_id = (select auth.uid())
        and p.is_active = true
        and p.deleted_at is null
      limit 1
    ),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Lock down execution. Default Postgres behaviour grants EXECUTE on new
-- functions to PUBLIC; for SECURITY DEFINER functions that is never what we
-- want.
-- ---------------------------------------------------------------------------
revoke execute on function public.current_user_role() from public, anon;
revoke execute on function public.current_user_branch_id() from public, anon;
revoke execute on function public.is_super_admin() from public, anon;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_branch_id() to authenticated;
grant execute on function public.is_super_admin() to authenticated;

comment on function public.current_user_role() is
  'RLS helper: caller''s role, or NULL if their profile is missing/inactive/deleted. Fails closed.';
comment on function public.current_user_branch_id() is
  'RLS helper: caller''s branch_id. NULL for super_admin and for unusable profiles.';
comment on function public.is_super_admin() is
  'RLS helper: true only for an active, non-deleted super_admin. Never NULL.';
