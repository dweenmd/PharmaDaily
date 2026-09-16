-- ---------------------------------------------------------------------------
-- Phase 1 / 3 of 6 — profiles
--
-- Application metadata for a Supabase Auth user: which job they do and which
-- branch they do it at. Credentials live exclusively in auth.users — this
-- table never stores a password, hash, or token.
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null,
  role public.user_role not null default 'cashier',

  -- No ON DELETE CASCADE: branches are soft-deleted, so a hard delete here
  -- would mean something has gone wrong and should fail loudly rather than
  -- silently orphan or remove staff records.
  branch_id uuid references public.branches (id) on delete restrict,

  -- Secure by default: a profile grants nothing until an admin explicitly
  -- provisions it. The RLS helpers resolve an inactive profile to NULL, so an
  -- unprovisioned account can read nothing at all.
  is_active boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  -- A super_admin is branch-less by design (they see every branch). Every
  -- other ACTIVE user must be pinned to exactly one branch, otherwise
  -- branch-scoped RLS would evaluate against NULL and silently match nothing.
  --
  -- Inactive profiles are exempt: that is the state a freshly-created auth
  -- user sits in, after handle_new_user() has made their row but before an
  -- admin has assigned a role and a branch.
  constraint profiles_branch_required_when_active
    check (
      is_active = false
      or role = 'super_admin'
      or branch_id is not null
    ),
  constraint profiles_name_not_blank check (length(btrim(name)) > 0)
);

create index profiles_branch_id_idx on public.profiles (branch_id);
create index profiles_role_idx on public.profiles (role);

-- The RLS helper functions look a profile up by auth_id on every policy
-- evaluation, so that lookup must stay index-only fast. (auth_id already has a
-- unique index from the UNIQUE constraint above.)
create index profiles_live_idx
  on public.profiles (auth_id)
  where deleted_at is null and is_active = true;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

comment on table public.profiles is
  'Role/branch metadata for an auth.users row. Never stores credentials — Supabase Auth owns those.';
comment on column public.profiles.branch_id is
  'NULL only for super_admin, who is not scoped to a single branch.';
