-- audit_logs is append-only and every UPDATE/DELETE across the audited
-- tables writes one row, in a pharmacy that never stops selling. Left
-- unchecked it is the one table in this schema guaranteed to outgrow every
-- other, and by year two or three it would be the largest table in the
-- database for no operational benefit — nothing reads a three-year-old
-- staff-edit entry.
--
-- purge_old_audit_logs() is the one function allowed to DELETE from an
-- append-only ledger. That is not a contradiction: "append-only" protects the
-- log from being edited or erased by whoever it is watching, which is a
-- different property from "kept forever". Retention is a deliberate, logged
-- decision, not a write path anyone can reach.
create or replace function public.purge_old_audit_logs(p_retention_days int default 730)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted int;
begin
  if p_retention_days < 90 then
    raise exception 'Refusing to purge audit history newer than 90 days.'
      using errcode = '22023';
  end if;

  delete from public.audit_logs
  where created_at < now() - make_interval(days => p_retention_days);

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

comment on function public.purge_old_audit_logs(int) is
  'Deletes audit_logs entries older than p_retention_days (default 730 = 2 years). Run monthly via pg_cron where available, or manually from the SQL editor otherwise — see README for the schedule query.';

-- Only the service role may call this. It is a maintenance operation, not
-- something any signed-in role should be able to trigger from the app —
-- there is no UI button for it, on purpose.
revoke all on function public.purge_old_audit_logs(int) from public, anon, authenticated;
grant execute on function public.purge_old_audit_logs(int) to service_role;

-- Best-effort: pg_cron is available on most hosted Supabase projects but not
-- guaranteed on every plan/region, and is never present on a local `supabase
-- start` stack. Schedule it if the extension exists; if it does not, this
-- block is a no-op and the README documents the manual fallback.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron schema extensions;

    if not exists (
      select 1 from cron.job where jobname = 'purge_old_audit_logs'
    ) then
      perform cron.schedule(
        'purge_old_audit_logs',
        '0 3 1 * *', -- 03:00 on the 1st of every month
        $cron$select public.purge_old_audit_logs(730)$cron$
      );
    end if;
  end if;
exception
  -- Some hosted plans expose pg_available_extensions without granting
  -- permission to actually create it. Falling back to the manual/dashboard
  -- schedule is a better outcome than failing this whole migration.
  when insufficient_privilege then
    raise notice 'pg_cron could not be enabled automatically — schedule purge_old_audit_logs() manually (see README).';
end $$;
