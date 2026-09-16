-- ---------------------------------------------------------------------------
-- Phase 1 / 6 of 6 — auto-provision profiles, and block privilege escalation
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- handle_new_user() — create the matching profiles row on signup.
--
-- SECURITY: this function deliberately does NOT read `role` or `branch_id`
-- from new.raw_user_meta_data. That metadata is attacker-controlled — it is
-- whatever the client passed to signUp() — so trusting it would let anyone
-- post {"role":"super_admin"} and own every branch in the system from their
-- first request.
--
-- Instead every new profile lands in the weakest possible state:
--     role = 'cashier', branch_id = NULL, is_active = false
-- which the RLS helpers resolve to NULL, granting access to nothing. Role and
-- branch are assigned afterwards, out of band, by a service-role caller
-- (the seed script, or the admin "add employee" action in a later phase).
--
-- Only `name` is taken from metadata, and it is harmless: it is a display
-- string with no authorisation meaning.
-- ===========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (auth_id, name, role, branch_id, is_active)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(new.email, '@', 1)
    ),
    'cashier',
    null,
    false
  )
  on conflict (auth_id) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

comment on function public.handle_new_user() is
  'Creates a locked-down profile row for every new auth user. Never trusts client-supplied role/branch metadata.';

-- ===========================================================================
-- prevent_profile_privilege_escalation() — column-level guard on profiles.
--
-- WHY A TRIGGER AND NOT A POLICY: RLS decides which ROWS you may touch, not
-- which COLUMNS. The "profiles_update_self" policy lets a user update their
-- own row so they can change their display name — but on its own it would
-- equally happily accept `set role = 'super_admin'` in that same statement.
-- Postgres has column-level GRANTs, but they cannot express "only when you are
-- not the owner of this row", so a BEFORE UPDATE trigger is the right tool.
--
-- Triggers fire regardless of RLS, including for callers that bypass RLS —
-- which is why service_role has to be allowed through explicitly here rather
-- than being exempt automatically.
-- ===========================================================================
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  jwt_role text := coalesce((select auth.role()), '');
begin
  -- Trusted callers, allowed to set role/branch/status:
  --   * service_role — the seed script and admin server actions.
  --   * a direct database connection (no JWT at all) — migrations, psql,
  --     Supabase Studio. Anyone holding those credentials already has full
  --     control of the database, so there is nothing left to protect here.
  if jwt_role = 'service_role' or jwt_role = '' then
    return new;
  end if;

  -- An active super_admin may administer other people's profiles.
  if public.is_super_admin() then
    return new;
  end if;

  -- Everyone else: authorisation-bearing columns are frozen.
  if new.role is distinct from old.role then
    raise exception 'Not allowed to change your own role'
      using errcode = '42501';
  end if;

  if new.branch_id is distinct from old.branch_id then
    raise exception 'Not allowed to change your own branch'
      using errcode = '42501';
  end if;

  if new.is_active is distinct from old.is_active then
    raise exception 'Not allowed to change your own account status'
      using errcode = '42501';
  end if;

  if new.deleted_at is distinct from old.deleted_at then
    raise exception 'Not allowed to change your own deletion status'
      using errcode = '42501';
  end if;

  -- auth_id is the link to the credential record; repointing it at another
  -- user would be an account takeover.
  if new.auth_id is distinct from old.auth_id then
    raise exception 'Not allowed to change the auth link of a profile'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function public.prevent_profile_privilege_escalation()
  from public, anon, authenticated;

create trigger profiles_prevent_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_escalation();

comment on function public.prevent_profile_privilege_escalation() is
  'Freezes role/branch_id/is_active/deleted_at/auth_id against self-service updates. RLS is row-scoped and cannot do this.';
