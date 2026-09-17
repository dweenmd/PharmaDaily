-- ---------------------------------------------------------------------------
-- Phase 3 / 1 — customers
--
-- Global like the catalogue: a customer who buys at one branch is the same
-- person at another, and their outstanding credit follows them.
--
-- due_amount is a running total maintained only by the sale and return
-- transactions, never written directly by application code — the same rule as
-- suppliers.due_amount.
-- ---------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  phone text,
  address text,

  due_amount numeric(14, 2) not null default 0,

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint customers_name_not_blank check (length(btrim(name)) > 0),
  constraint customers_due_amount_non_negative check (due_amount >= 0)
);

-- Phone is how a counter looks someone up, so it must identify one person.
-- Partial, so soft-deleted records release the number and the many walk-in
-- customers recorded without a phone do not collide on NULL.
create unique index customers_phone_unique_live
  on public.customers (phone)
  where phone is not null and deleted_at is null;

create index customers_name_idx on public.customers (lower(name)) where deleted_at is null;
create index customers_due_idx on public.customers (due_amount) where due_amount > 0;

create trigger set_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- RLS — global, readable by every authenticated user.
--
-- Unlike stock, customers are deliberately NOT branch-scoped: a customer with
-- credit at one branch must be recognisable at another, or they could run up
-- separate balances at each outlet.
--
-- Any signed-in user may create and edit them, cashiers included — registering
-- a walk-in customer is part of taking a sale.
-- ===========================================================================
alter table public.customers enable row level security;
alter table public.customers force row level security;

revoke all on public.customers from anon;
grant select, insert, update on public.customers to authenticated;

create policy "customers_read_all"
  on public.customers for select
  to authenticated
  using (true);

create policy "customers_insert"
  on public.customers for insert
  to authenticated
  with check (true);

create policy "customers_update"
  on public.customers for update
  to authenticated
  using (true)
  with check (true);

comment on column public.customers.due_amount is
  'Running credit balance. Maintained only by the sale and return transactions — never set directly.';
