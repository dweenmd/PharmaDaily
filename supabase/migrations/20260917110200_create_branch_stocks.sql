-- ---------------------------------------------------------------------------
-- Phase 2 / 3 — branch_stocks
--
-- Physical stock: one row per (branch, medicine, batch). This is where price
-- lives, because price is a property of the consignment, not the product —
-- the same strip bought last month and this month can differ in cost, selling
-- price and MRP, and both batches sit on the shelf at once.
--
-- It is also what makes FEFO possible: with batches as separate rows carrying
-- their own expiry, the POS can always offer the soonest-expiring one first.
-- ---------------------------------------------------------------------------

create table public.branch_stocks (
  id uuid primary key default gen_random_uuid(),

  branch_id uuid not null references public.branches (id) on delete restrict,
  medicine_id uuid not null references public.medicines (id) on delete restrict,

  batch_no text not null,
  expiry_date date not null,

  quantity integer not null default 0,

  -- Held by an in-progress sale but not yet deducted. Phase 3 uses this so two
  -- cashiers cannot both sell the last strip; Phase 2 only ever leaves it at 0.
  reserved_quantity integer not null default 0,

  purchase_price numeric(12, 2) not null,
  selling_price numeric(12, 2) not null,
  mrp numeric(12, 2) not null,

  supplier_id uuid references public.suppliers (id) on delete set null,
  received_date date not null default current_date,

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint branch_stocks_batch_no_not_blank check (length(btrim(batch_no)) > 0),

  -- Stock can reach zero but never go below it. Any code path that would
  -- oversell has a bug, and the database is the last place to catch it.
  constraint branch_stocks_quantity_non_negative check (quantity >= 0),
  constraint branch_stocks_reserved_non_negative check (reserved_quantity >= 0),
  constraint branch_stocks_reserved_within_quantity check (reserved_quantity <= quantity),

  constraint branch_stocks_prices_non_negative
    check (purchase_price >= 0 and selling_price >= 0 and mrp >= 0)
);

-- One row per batch of a medicine at a branch. This is what lets a purchase
-- upsert into an existing batch instead of creating duplicate rows that would
-- split the same physical stock in two.
create unique index branch_stocks_branch_medicine_batch_unique
  on public.branch_stocks (branch_id, medicine_id, batch_no);

-- FEFO lookup: given a branch and a medicine, find the soonest-expiring batch
-- that still has stock.
create index branch_stocks_fefo_idx
  on public.branch_stocks (branch_id, medicine_id, expiry_date)
  where quantity > 0 and is_active = true;

-- Near-expiry report, branch by branch.
create index branch_stocks_expiry_idx
  on public.branch_stocks (branch_id, expiry_date)
  where quantity > 0;

create index branch_stocks_supplier_idx on public.branch_stocks (supplier_id);

create trigger set_branch_stocks_updated_at
  before update on public.branch_stocks
  for each row execute function public.set_updated_at();

comment on table public.branch_stocks is
  'Physical stock per branch per batch. Holds all pricing; medicines never does.';
comment on column public.branch_stocks.reserved_quantity is
  'Reserved by an in-flight sale (Phase 3). Always 0 in Phase 2.';
