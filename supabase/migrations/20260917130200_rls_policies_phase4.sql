-- ---------------------------------------------------------------------------
-- Phase 4 / 3 — RLS for settings, expenses and notifications
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- settings
--
-- Readable by everyone: the thresholds shape what the POS and the stock
-- screens show, so every signed-in user needs them. Writable only by a branch
-- manager for their own branch, or a super admin anywhere — a cashier changing
-- the low-stock threshold would be changing what the business reorders.
-- ===========================================================================
alter table public.settings enable row level security;
alter table public.settings force row level security;

revoke all on public.settings from anon;
grant select, insert, update on public.settings to authenticated;

create policy "settings_read"
  on public.settings for select
  to authenticated
  using (branch_id is null or public.is_super_admin() or branch_id = public.current_user_branch_id());

create policy "settings_super_admin_all"
  on public.settings for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "settings_branch_manager_insert"
  on public.settings for insert
  to authenticated
  with check (
    public.current_user_role() = 'branch_manager'
    and branch_id = public.current_user_branch_id()
  );

create policy "settings_branch_manager_update"
  on public.settings for update
  to authenticated
  using (
    public.current_user_role() = 'branch_manager'
    and branch_id = public.current_user_branch_id()
  )
  with check (
    public.current_user_role() = 'branch_manager'
    and branch_id = public.current_user_branch_id()
  );

-- ===========================================================================
-- expenses — branch-scoped, recorded by managers
-- ===========================================================================
alter table public.expenses enable row level security;
alter table public.expenses force row level security;

revoke all on public.expenses from anon;
grant select, insert, update on public.expenses to authenticated;

create policy "expenses_super_admin_all"
  on public.expenses for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "expenses_own_branch_select"
  on public.expenses for select
  to authenticated
  using (branch_id = public.current_user_branch_id());

create policy "expenses_branch_manager_insert"
  on public.expenses for insert
  to authenticated
  with check (
    public.current_user_role() = 'branch_manager'
    and branch_id = public.current_user_branch_id()
  );

create policy "expenses_branch_manager_update"
  on public.expenses for update
  to authenticated
  using (
    public.current_user_role() = 'branch_manager'
    and branch_id = public.current_user_branch_id()
  )
  with check (
    public.current_user_role() = 'branch_manager'
    and branch_id = public.current_user_branch_id()
  );

-- ===========================================================================
-- notifications
--
-- Read within your own branch. Writes come from the generator function, which
-- is SECURITY DEFINER, so no INSERT is granted here at all — an alert nobody
-- can forge is an alert worth trusting.
--
-- UPDATE is granted only so a user can mark one read, and the trigger below
-- stops that update touching anything else.
-- ===========================================================================
alter table public.notifications enable row level security;
alter table public.notifications force row level security;

revoke all on public.notifications from anon;
grant select, update on public.notifications to authenticated;

create policy "notifications_select"
  on public.notifications for select
  to authenticated
  using (
    public.is_super_admin()
    or (
      (branch_id is null or branch_id = public.current_user_branch_id())
      and (
        user_id is null
        or user_id in (
          select p.id from public.profiles p where p.auth_id = (select auth.uid())
        )
      )
    )
  );

create policy "notifications_mark_read"
  on public.notifications for update
  to authenticated
  using (
    public.is_super_admin()
    or branch_id = public.current_user_branch_id()
  )
  with check (
    public.is_super_admin()
    or branch_id = public.current_user_branch_id()
  );

-- Marking read is the only edit allowed. Without this, the UPDATE grant above
-- would also let someone rewrite the message of an alert they did not like.
create or replace function public.notifications_only_mark_read()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce((select auth.role()), '') in ('service_role', '') then
    return new;
  end if;

  if new.branch_id is distinct from old.branch_id
     or new.user_id is distinct from old.user_id
     or new.type is distinct from old.type
     or new.message is distinct from old.message
     or new.dedupe_key is distinct from old.dedupe_key
     or new.created_at is distinct from old.created_at then
    raise exception 'Notifications can only be marked as read' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function public.notifications_only_mark_read() from public, anon, authenticated;

create trigger notifications_restrict_update
  before update on public.notifications
  for each row execute function public.notifications_only_mark_read();
