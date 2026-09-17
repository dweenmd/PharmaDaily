-- ---------------------------------------------------------------------------
-- Phase 6 / 1 — audit log
--
-- Records who changed what. Not a substitute for the ledgers — stock_movements
-- and the payment tables are the operational record, and they are append-only
-- precisely so they do not need an audit log to be trusted. This covers the
-- rows that CAN be edited: a sale being voided, a batch quantity corrected, a
-- staff member's role changed.
--
-- Written by a trigger, never by application code. Anything the app could
-- choose not to write is not an audit log.
-- ---------------------------------------------------------------------------

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),

  -- The profile, not the auth user: profiles carry the name and branch that
  -- make an entry readable a year later.
  user_id uuid references public.profiles (id) on delete set null,
  branch_id uuid references public.branches (id) on delete set null,

  action text not null,
  table_name text not null,
  record_id uuid,

  old_data jsonb,
  new_data jsonb,

  -- Only the fields that actually changed, so reading an entry does not mean
  -- diffing two blobs by eye.
  changed_fields text[],

  created_at timestamptz not null default now(),

  constraint audit_logs_action_valid check (action in ('INSERT', 'UPDATE', 'DELETE'))
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_table_idx on public.audit_logs (table_name, created_at desc);
create index audit_logs_user_idx on public.audit_logs (user_id, created_at desc);
create index audit_logs_branch_idx on public.audit_logs (branch_id, created_at desc);
create index audit_logs_record_idx on public.audit_logs (table_name, record_id);

comment on table public.audit_logs is
  'Who changed what, written by trigger. The operational ledgers are append-only and do not rely on this; it covers rows that can be edited.';

-- ===========================================================================
-- The trigger.
--
-- SECURITY DEFINER so it can write a table nobody has INSERT on — an audit
-- entry that the audited party could suppress would be worth nothing.
--
-- Deliberately omits columns that change on every write without meaning
-- anything (updated_at), so a one-field edit does not look like a two-field
-- one.
-- ===========================================================================
create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_branch_id uuid;
  v_old jsonb;
  v_new jsonb;
  v_changed text[];
  v_key text;
begin
  select p.id, p.branch_id into v_profile_id, v_branch_id
  from public.profiles p
  where p.auth_id = (select auth.uid())
  limit 1;

  if tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_new := null;
  elsif tg_op = 'INSERT' then
    v_old := null;
    v_new := to_jsonb(new);
  else
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);

    for v_key in select jsonb_object_keys(v_new)
    loop
      if v_key not in ('updated_at') and (v_old -> v_key) is distinct from (v_new -> v_key) then
        v_changed := array_append(v_changed, v_key);
      end if;
    end loop;

    -- Nothing meaningful changed: a touch, not an edit. Recording it would
    -- bury the real entries.
    if v_changed is null or array_length(v_changed, 1) is null then
      return new;
    end if;
  end if;

  -- The audited row's own branch is more useful than the actor's — a super
  -- admin editing a branch's sale should file under that branch.
  insert into public.audit_logs (
    user_id, branch_id, action, table_name, record_id, old_data, new_data, changed_fields
  )
  values (
    v_profile_id,
    coalesce(
      (case when tg_op = 'DELETE' then v_old else v_new end ->> 'branch_id')::uuid,
      v_branch_id
    ),
    tg_op,
    tg_table_name,
    coalesce((v_new ->> 'id')::uuid, (v_old ->> 'id')::uuid),
    v_old,
    v_new,
    v_changed
  );

  return coalesce(new, old);
end;
$$;

revoke execute on function public.write_audit_log() from public, anon, authenticated;

-- ===========================================================================
-- Attach to the tables whose rows can be edited after the fact.
--
-- INSERT is not audited on most of them: creating a sale already writes a
-- sale, its lines, its payments and its ledger entries. Auditing the creation
-- too would double every row in the system to say what the operational tables
-- already say. What matters is what happens to a record AFTER it exists.
--
-- profiles is the exception: who was given which role, and when, is exactly
-- the kind of thing an audit is for, so its creation is recorded too.
-- ===========================================================================
create trigger audit_sales
  after update or delete on public.sales
  for each row execute function public.write_audit_log();

create trigger audit_branch_stocks
  after update or delete on public.branch_stocks
  for each row execute function public.write_audit_log();

create trigger audit_purchases
  after update or delete on public.purchases
  for each row execute function public.write_audit_log();

create trigger audit_profiles
  after insert or update or delete on public.profiles
  for each row execute function public.write_audit_log();

create trigger audit_branches
  after insert or update or delete on public.branches
  for each row execute function public.write_audit_log();

create trigger audit_medicines
  after update or delete on public.medicines
  for each row execute function public.write_audit_log();

create trigger audit_customers
  after update or delete on public.customers
  for each row execute function public.write_audit_log();

create trigger audit_suppliers
  after update or delete on public.suppliers
  for each row execute function public.write_audit_log();

-- ===========================================================================
-- RLS — read-only, and only for people who oversee others.
--
-- No INSERT, UPDATE or DELETE grant to anyone. The log is written by the
-- trigger and is otherwise immutable: a record that the person being audited
-- can edit or remove is not a record.
-- ===========================================================================
alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;

revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;

create policy "audit_logs_super_admin_read"
  on public.audit_logs for select
  to authenticated
  using (public.is_super_admin());

create policy "audit_logs_branch_manager_read"
  on public.audit_logs for select
  to authenticated
  using (
    public.current_user_role() = 'branch_manager'
    and branch_id = public.current_user_branch_id()
  );
