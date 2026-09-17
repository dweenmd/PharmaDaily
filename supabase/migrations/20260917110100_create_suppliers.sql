-- ---------------------------------------------------------------------------
-- Phase 2 / 2 — suppliers
--
-- Global like the catalogue: the same distributor supplies every branch, and
-- the outstanding balance is owed by the business, not by one outlet.
--
-- due_amount is a running total maintained by the purchase transaction, never
-- edited directly by application code. It is derivable from purchases
-- (sum(due_amount)), but kept denormalised because the supplier list shows it
-- on every row and recomputing it per render would not scale.
-- ---------------------------------------------------------------------------

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  phone text,
  address text,

  due_amount numeric(14, 2) not null default 0,

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint suppliers_name_not_blank check (length(btrim(name)) > 0),
  -- A negative balance would mean we have overpaid, which the purchase flow
  -- has no way to produce. If this ever fires, the arithmetic is wrong and it
  -- should fail loudly rather than quietly corrupt the ledger.
  constraint suppliers_due_amount_non_negative check (due_amount >= 0)
);

create unique index suppliers_name_unique_live
  on public.suppliers (lower(btrim(name)))
  where deleted_at is null;

create index suppliers_live_idx on public.suppliers (is_active) where deleted_at is null;

create trigger set_suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

comment on column public.suppliers.due_amount is
  'Running unpaid balance. Maintained only by the purchase transaction — never set directly.';
