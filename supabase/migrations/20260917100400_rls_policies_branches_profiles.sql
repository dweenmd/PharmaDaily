-- ---------------------------------------------------------------------------
-- Phase 1 / 5 of 6 — RLS policies for branches and profiles
--
-- THE PATTERN (copy this onto every branch-scoped table in Phases 2-6):
--
--   alter table public.<t> enable row level security;
--   alter table public.<t> force row level security;
--   revoke all on public.<t> from anon;
--   grant select, insert, update on public.<t> to authenticated;
--
--   create policy "<t>_super_admin_all" on public.<t>
--     for all to authenticated
--     using (public.is_super_admin()) with check (public.is_super_admin());
--
--   create policy "<t>_branch_select" on public.<t>
--     for select to authenticated
--     using (branch_id = public.current_user_branch_id());
--   ... plus matching insert/update policies with the same predicate.
--
-- Two rules that are easy to get wrong:
--
--   * DELETE is never granted. Everything soft-deletes via deleted_at, so a
--     "delete" is an UPDATE. Not granting DELETE means a bug or a compromised
--     token cannot destroy financial history.
--
--   * A child table with no branch_id of its own (Phase 2's purchase_items,
--     Phase 3's sale_items) scopes through its parent instead:
--         using (exists (select 1 from public.purchases p
--                        where p.id = purchase_items.purchase_id
--                          and p.branch_id = public.current_user_branch_id()))
--
-- FORCE ROW LEVEL SECURITY is set on both tables so that policies apply even
-- to the table owner. Without it, anything connecting as the owning role
-- silently bypasses every policy below.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- branches
-- ===========================================================================
alter table public.branches enable row level security;
alter table public.branches force row level security;

revoke all on public.branches from anon;
grant select, insert, update on public.branches to authenticated;

-- Super admin: unrestricted.
create policy "branches_super_admin_all"
  on public.branches
  for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Everyone else: read-only, and only the single branch they belong to.
-- Soft-deleted branches are invisible to them; only super_admin can see or
-- restore those.
create policy "branches_own_branch_select"
  on public.branches
  for select
  to authenticated
  using (
    id = public.current_user_branch_id()
    and deleted_at is null
  );

-- Deliberately no insert/update policy for non-super-admins: creating,
-- editing, deactivating and restoring branches is a super_admin-only operation
-- (Phase 5 builds the UI for it).

-- ===========================================================================
-- profiles
-- ===========================================================================
alter table public.profiles enable row level security;
alter table public.profiles force row level security;

revoke all on public.profiles from anon;

-- No INSERT grant on purpose. Profile rows are created exclusively by the
-- handle_new_user() trigger (next migration), which runs as the table owner.
-- That makes "sign up and hand yourself a profile" structurally impossible
-- rather than merely policy-forbidden.
grant select, update on public.profiles to authenticated;

create policy "profiles_super_admin_all"
  on public.profiles
  for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Anyone may read their own profile — this is what the app calls on every
-- request to render the current user's name/role/branch.
create policy "profiles_select_self"
  on public.profiles
  for select
  to authenticated
  using (auth_id = (select auth.uid()));

-- A branch manager may see the staff at their own branch (needed for the
-- employee list in later phases), but not staff at any other branch.
create policy "profiles_select_branch_staff"
  on public.profiles
  for select
  to authenticated
  using (
    public.current_user_role() = 'branch_manager'
    and branch_id = public.current_user_branch_id()
    and deleted_at is null
  );

-- Users may edit their own row (e.g. display name). Which COLUMNS they may
-- change is enforced by the trigger in the next migration — RLS alone is
-- row-scoped, not column-scoped, and cannot express that on its own.
create policy "profiles_update_self"
  on public.profiles
  for update
  to authenticated
  using (auth_id = (select auth.uid()))
  with check (auth_id = (select auth.uid()));
