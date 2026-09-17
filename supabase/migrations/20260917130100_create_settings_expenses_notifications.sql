-- ---------------------------------------------------------------------------
-- Phase 4 / 2 — settings, expenses, notifications
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- settings — key/value, optionally per branch.
--
-- branch_id NULL means "the whole chain". A row with a branch_id overrides the
-- global one for that branch, so head office sets a default and a busy outlet
-- can tighten it without a schema change.
-- ===========================================================================
create table public.settings (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches (id) on delete cascade,
  key text not null,
  value text not null,
  updated_at timestamptz not null default now(),

  constraint settings_key_not_blank check (length(btrim(key)) > 0)
);

-- One row per key per scope. Two partial indexes rather than one, because in
-- Postgres NULLs do not compare equal, so a plain UNIQUE(branch_id, key) would
-- happily allow several global rows for the same key.
create unique index settings_global_key_unique
  on public.settings (key)
  where branch_id is null;

create unique index settings_branch_key_unique
  on public.settings (branch_id, key)
  where branch_id is not null;

create trigger set_settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- Defaults. 90 days matches the usual window for returning stock to a
-- distributor, so it is the point at which near-expiry is still actionable.
insert into public.settings (branch_id, key, value) values
  (null, 'near_expiry_days', '90'),
  (null, 'low_stock_multiplier', '1.0');

-- ===========================================================================
-- expenses — branch-scoped operating costs
-- ===========================================================================
create table public.expenses (
  id uuid primary key default gen_random_uuid(),

  branch_id uuid not null references public.branches (id) on delete restrict,
  category text not null,
  description text,
  amount numeric(14, 2) not null,
  expense_date date not null default current_date,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint expenses_category_not_blank check (length(btrim(category)) > 0),
  constraint expenses_amount_positive check (amount > 0)
);

create index expenses_branch_date_idx
  on public.expenses (branch_id, expense_date desc)
  where deleted_at is null;

create trigger set_expenses_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- notifications — low stock and near expiry, generated rather than typed
-- ===========================================================================
create type public.notification_type as enum (
  'low_stock',
  'near_expiry',
  'expired',
  'transfer',
  'sales',
  'system'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),

  branch_id uuid references public.branches (id) on delete cascade,

  -- NULL means the alert is for everyone at the branch rather than one person.
  -- Stock alerts are the branch's problem, not any individual's.
  user_id uuid references public.profiles (id) on delete cascade,

  type public.notification_type not null,
  message text not null,

  -- What the alert is about, so regenerating does not create a duplicate for
  -- something already on screen. Composed by the generator as, for example,
  -- 'low_stock:<medicine_id>'.
  dedupe_key text not null,

  is_read boolean not null default false,
  created_at timestamptz not null default now(),

  constraint notifications_message_not_blank check (length(btrim(message)) > 0)
);

-- An alert stays one row until it is read. Without this, every refresh would
-- pile up another copy of "Napa is low" and the bell would become noise —
-- which is how staff learn to ignore it.
create unique index notifications_unread_dedupe
  on public.notifications (branch_id, dedupe_key)
  where is_read = false;

create index notifications_branch_unread_idx
  on public.notifications (branch_id, created_at desc)
  where is_read = false;

comment on column public.notifications.dedupe_key is
  'Identifies what the alert is about, so regenerating does not duplicate an alert already showing.';
comment on column public.notifications.user_id is
  'NULL for branch-wide alerts. Stock problems belong to the branch, not to one person.';
