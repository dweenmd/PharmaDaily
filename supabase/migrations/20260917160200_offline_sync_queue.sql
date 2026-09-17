-- ---------------------------------------------------------------------------
-- Phase 6 / 3 — offline sync queue
--
-- A sale made while the counter is offline exists only in the browser until
-- the connection returns. This table is where it lands on the way back in, and
-- the record of whether it made it.
--
-- THE IDEMPOTENCY PROBLEM, and why the client generates the id.
--
-- A till reconnects, sends a queued sale, and the response is lost. Did the
-- sale commit? The client cannot tell, and retrying is the natural thing to
-- do — which is how one sale becomes two, stock is deducted twice, and the
-- customer is charged twice.
--
-- The fix is that the CLIENT mints a UUID for the sale before it ever goes
-- offline, and that id is the primary key of the queue row. Replaying is then
-- an insert that either succeeds or hits a duplicate key, and a duplicate key
-- means "already recorded" rather than an error. Retrying becomes safe by
-- construction instead of by hoping the first attempt failed cleanly.
-- ---------------------------------------------------------------------------

create type public.sync_status as enum ('pending', 'synced', 'failed');

create table public.offline_sync_queue (
  -- Supplied by the client, not generated here. See above.
  id uuid primary key,

  branch_id uuid not null references public.branches (id) on delete restrict,
  created_by uuid references public.profiles (id) on delete set null,

  -- What kind of operation this replays. Only sales for now; the column exists
  -- so adding offline returns later does not need a migration.
  operation text not null default 'sale',

  payload jsonb not null,

  status public.sync_status not null default 'pending',

  -- The record the replay produced, once it succeeds.
  result_id uuid,

  error_message text,
  attempts integer not null default 0,

  -- When the sale actually happened, as opposed to when it reached the server.
  -- A sale made at 14:02 and synced at 18:30 belongs to the afternoon it was
  -- made, or every report and till reconciliation will disagree with reality.
  occurred_at timestamptz not null,

  created_at timestamptz not null default now(),
  synced_at timestamptz,

  constraint offline_sync_queue_operation_valid check (operation in ('sale')),
  constraint offline_sync_queue_attempts_non_negative check (attempts >= 0),
  constraint offline_sync_queue_failed_has_reason
    check (status <> 'failed' or length(btrim(coalesce(error_message, ''))) > 0)
);

create index offline_sync_queue_branch_status_idx
  on public.offline_sync_queue (branch_id, status, occurred_at);

create index offline_sync_queue_pending_idx
  on public.offline_sync_queue (occurred_at)
  where status = 'pending';

comment on table public.offline_sync_queue is
  'Sales taken while offline, on the way back in. The id comes from the client so a retry after a lost response is a duplicate key rather than a duplicate sale.';
comment on column public.offline_sync_queue.occurred_at is
  'When the sale was made, not when it synced. Reports and till reconciliation use this.';

-- ===========================================================================
-- Replay.
--
-- Takes one queued entry and turns it into a real sale. SECURITY INVOKER, so
-- the replaying user must themselves be allowed to sell at that branch — an
-- offline sale is not a way to bypass the checks a live one faces.
-- ===========================================================================
create or replace function public.sync_offline_sale(
  p_queue_id uuid,
  p_branch_id uuid,
  p_payload jsonb,
  p_occurred_at timestamptz
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_existing record;
  v_sale_id uuid;
begin
  if not public.can_sell() then
    raise exception 'Your role is not permitted to complete sales' using errcode = '42501';
  end if;

  select p.id into v_profile_id
  from public.profiles p
  where p.auth_id = (select auth.uid())
    and p.is_active = true
    and p.deleted_at is null;

  if v_profile_id is null then
    raise exception 'No active profile for the current user' using errcode = '42501';
  end if;

  -- The idempotency check. A queue row that already synced means this is a
  -- retry after a lost response: return what it produced rather than selling
  -- the same items again.
  select q.id, q.status, q.result_id into v_existing
  from public.offline_sync_queue q
  where q.id = p_queue_id
  for update;

  if v_existing.id is not null and v_existing.status = 'synced' then
    return v_existing.result_id;
  end if;

  if v_existing.id is null then
    insert into public.offline_sync_queue (
      id, branch_id, created_by, payload, occurred_at, attempts
    )
    values (p_queue_id, p_branch_id, v_profile_id, p_payload, p_occurred_at, 0);
  end if;

  update public.offline_sync_queue
  set attempts = attempts + 1
  where id = p_queue_id;

  begin
    -- The sale is created through the ordinary path, so an offline sale gets
    -- the same stock checks, the same server-side pricing and the same ledger
    -- entries as one rung up live. p_sale_date carries the original date.
    v_sale_id := public.create_sale(
      p_branch_id,
      nullif(p_payload ->> 'customer_id', '')::uuid,
      coalesce((p_payload ->> 'discount')::numeric, 0),
      coalesce(p_payload -> 'items', '[]'::jsonb),
      coalesce(p_payload -> 'payments', '[]'::jsonb),
      p_occurred_at::date
    );
  exception
    when others then
      -- Recorded as failed rather than lost. Someone has to decide what to do
      -- with a sale that cannot be replayed — usually because the stock went
      -- while the till was offline — and they can only do that if they can
      -- see it.
      update public.offline_sync_queue
      set status = 'failed',
          error_message = sqlerrm
      where id = p_queue_id;

      raise;
  end;

  update public.offline_sync_queue
  set status = 'synced',
      result_id = v_sale_id,
      synced_at = now(),
      error_message = null
  where id = p_queue_id;

  return v_sale_id;
end;
$$;

revoke execute on function public.sync_offline_sale(uuid, uuid, jsonb, timestamptz)
  from public, anon;
grant execute on function public.sync_offline_sale(uuid, uuid, jsonb, timestamptz)
  to authenticated;

-- ===========================================================================
-- RLS
-- ===========================================================================
alter table public.offline_sync_queue enable row level security;
alter table public.offline_sync_queue force row level security;

revoke all on public.offline_sync_queue from anon;
grant select on public.offline_sync_queue to authenticated;

-- Written only by sync_offline_sale(), so there is no INSERT or UPDATE grant.
-- A queue row that could be hand-edited to 'synced' would be a way to make an
-- unsold sale disappear.
create policy "offline_sync_queue_select"
  on public.offline_sync_queue for select
  to authenticated
  using (public.is_super_admin() or branch_id = public.current_user_branch_id());
