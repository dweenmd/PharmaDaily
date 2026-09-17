-- ---------------------------------------------------------------------------
-- Phase 5 / 1 — stock transfers between branches
--
-- A DELIBERATE DEPARTURE FROM THE BRIEF, because the brief contradicts itself.
--
-- It says stock should be deducted at the source AND added at the destination
-- on approval — but it also asks for a Receive screen with expected-versus-
-- received quantities and a "short received" reason. Those cannot both be
-- true: if the destination is credited on approval, it shows stock that is
-- still in a van, and there is nothing left for receiving to correct.
--
-- So this is two steps, which is also how goods actually move:
--
--   approve  -> deduct at source, write transfer_out. The stock has LEFT.
--   receive  -> add at destination, write transfer_in. The stock has ARRIVED.
--
-- Between those, the stock is in transit: absent from both branches' counts
-- and accounted for only by the transfer record. That is the honest position —
-- neither branch can sell it — and it is what makes a shortfall visible rather
-- than silently absorbed. Ten strips dispatched and nine received is a real
-- event that someone has to explain.
--
-- 'approved' is therefore the in-transit state. The interface labels it that
-- way; there is no separate status, because a separate status would have no
-- separate meaning.
-- ---------------------------------------------------------------------------

create type public.transfer_status as enum ('pending', 'approved', 'completed', 'rejected');

create table public.stock_transfers (
  id uuid primary key default gen_random_uuid(),

  from_branch_id uuid not null references public.branches (id) on delete restrict,
  to_branch_id uuid not null references public.branches (id) on delete restrict,

  status public.transfer_status not null default 'pending',

  -- Human-readable, like an invoice number: TRF-YYYY-XXXX.
  reference_no text not null,

  transferred_by uuid references public.profiles (id) on delete set null,
  approved_by uuid references public.profiles (id) on delete set null,
  received_by uuid references public.profiles (id) on delete set null,

  notes text,
  rejection_reason text,

  created_at timestamptz not null default now(),
  approved_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),

  constraint stock_transfers_different_branches check (from_branch_id <> to_branch_id),

  -- A rejection without a reason is not a decision anyone can review later.
  constraint stock_transfers_rejection_has_reason
    check (status <> 'rejected' or length(btrim(coalesce(rejection_reason, ''))) >= 3)
);

create unique index stock_transfers_reference_unique on public.stock_transfers (reference_no);

create index stock_transfers_from_idx
  on public.stock_transfers (from_branch_id, created_at desc);
create index stock_transfers_to_idx
  on public.stock_transfers (to_branch_id, created_at desc);
create index stock_transfers_status_idx on public.stock_transfers (status, created_at desc);

create trigger set_stock_transfers_updated_at
  before update on public.stock_transfers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------

create table public.stock_transfer_items (
  id uuid primary key default gen_random_uuid(),

  transfer_id uuid not null references public.stock_transfers (id) on delete cascade,
  medicine_id uuid not null references public.medicines (id) on delete restrict,

  -- The exact source batch, so the destination inherits its expiry and pricing
  -- rather than guessing. Resolving by medicine + batch_no alone would be
  -- ambiguous once a batch number repeats across suppliers.
  source_stock_id uuid not null references public.branch_stocks (id) on delete restrict,
  batch_no text not null,

  quantity integer not null,

  -- Filled in at receipt. NULL means not yet received; a value below quantity
  -- is a shortfall and requires an explanation.
  received_quantity integer,
  shortfall_reason text,

  created_at timestamptz not null default now(),

  constraint stock_transfer_items_quantity_positive check (quantity > 0),
  constraint stock_transfer_items_received_within_sent
    check (received_quantity is null or (received_quantity >= 0 and received_quantity <= quantity)),
  constraint stock_transfer_items_shortfall_explained
    check (
      received_quantity is null
      or received_quantity = quantity
      or length(btrim(coalesce(shortfall_reason, ''))) >= 3
    )
);

create index stock_transfer_items_transfer_idx on public.stock_transfer_items (transfer_id);

comment on table public.stock_transfers is
  'Movement of stock between branches. "approved" is the in-transit state: deducted at source, not yet at destination.';
comment on column public.stock_transfer_items.received_quantity is
  'NULL until received. Less than quantity is a shortfall and must be explained.';

-- ===========================================================================
-- Reference numbering, same pattern as invoices: a counter row claimed with
-- ON CONFLICT DO UPDATE, so two simultaneous requests cannot take the same
-- number and have one rejected afterwards.
-- ===========================================================================
create table public.transfer_counters (
  year integer primary key,
  last_number integer not null default 0,
  constraint transfer_counters_last_number_non_negative check (last_number >= 0)
);

alter table public.transfer_counters enable row level security;
alter table public.transfer_counters force row level security;
revoke all on public.transfer_counters from anon, authenticated;

create or replace function public.next_transfer_no()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year integer := extract(year from current_date)::integer;
  v_number integer;
begin
  insert into public.transfer_counters (year, last_number)
  values (v_year, 1)
  on conflict (year) do update
    set last_number = public.transfer_counters.last_number + 1
  returning last_number into v_number;

  return 'TRF-' || v_year::text || '-' || lpad(v_number::text, 4, '0');
end;
$$;

revoke execute on function public.next_transfer_no() from public, anon;
grant execute on function public.next_transfer_no() to authenticated;

-- ===========================================================================
-- RLS
--
-- A transfer concerns two branches, so both must see it — the sender to track
-- what they dispatched, the receiver to know what is coming. That is the one
-- place in this system where a row is legitimately visible to two branches,
-- and it is visible because the row is ABOUT both of them.
-- ===========================================================================
alter table public.stock_transfers enable row level security;
alter table public.stock_transfers force row level security;

revoke all on public.stock_transfers from anon;
grant select, insert, update on public.stock_transfers to authenticated;

create policy "stock_transfers_super_admin_all"
  on public.stock_transfers for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "stock_transfers_involved_select"
  on public.stock_transfers for select
  to authenticated
  using (
    from_branch_id = public.current_user_branch_id()
    or to_branch_id = public.current_user_branch_id()
  );

-- Requests originate at the sending branch: you cannot ask another branch to
-- send you stock by creating the record on their behalf.
create policy "stock_transfers_request_from_own_branch"
  on public.stock_transfers for insert
  to authenticated
  with check (
    from_branch_id = public.current_user_branch_id()
    and public.can_manage_catalogue()
  );

-- The state machine lives in the transition functions; this policy only says
-- who may touch a row at all.
create policy "stock_transfers_involved_update"
  on public.stock_transfers for update
  to authenticated
  using (
    from_branch_id = public.current_user_branch_id()
    or to_branch_id = public.current_user_branch_id()
  )
  with check (
    from_branch_id = public.current_user_branch_id()
    or to_branch_id = public.current_user_branch_id()
  );

-- ---------------------------------------------------------------------------

alter table public.stock_transfer_items enable row level security;
alter table public.stock_transfer_items force row level security;

revoke all on public.stock_transfer_items from anon;
grant select, insert, update on public.stock_transfer_items to authenticated;

create policy "stock_transfer_items_via_parent_select"
  on public.stock_transfer_items for select
  to authenticated
  using (
    exists (
      select 1 from public.stock_transfers t
      where t.id = stock_transfer_items.transfer_id
        and (
          public.is_super_admin()
          or t.from_branch_id = public.current_user_branch_id()
          or t.to_branch_id = public.current_user_branch_id()
        )
    )
  );

create policy "stock_transfer_items_via_parent_insert"
  on public.stock_transfer_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.stock_transfers t
      where t.id = stock_transfer_items.transfer_id
        and (public.is_super_admin() or t.from_branch_id = public.current_user_branch_id())
    )
  );

create policy "stock_transfer_items_via_parent_update"
  on public.stock_transfer_items for update
  to authenticated
  using (
    exists (
      select 1 from public.stock_transfers t
      where t.id = stock_transfer_items.transfer_id
        and (
          public.is_super_admin()
          or t.from_branch_id = public.current_user_branch_id()
          or t.to_branch_id = public.current_user_branch_id()
        )
    )
  )
  with check (
    exists (
      select 1 from public.stock_transfers t
      where t.id = stock_transfer_items.transfer_id
        and (
          public.is_super_admin()
          or t.from_branch_id = public.current_user_branch_id()
          or t.to_branch_id = public.current_user_branch_id()
        )
    )
  );
