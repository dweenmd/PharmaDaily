-- ---------------------------------------------------------------------------
-- Phase 2 / 1 — medicine catalogue
--
-- The catalogue is GLOBAL, not per branch: "Napa 500mg" is the same product in
-- Dhaka and Chattogram. What differs per branch is the physical stock — batch,
-- expiry, quantity and price — which lives in branch_stocks.
--
-- Consequently there is NO price column anywhere in this file. The same
-- medicine is bought at different costs in different consignments, so a price
-- on the catalogue row would be a lie the moment a second batch arrives.
-- ---------------------------------------------------------------------------

create table public.medicine_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint medicine_categories_name_not_blank check (length(btrim(name)) > 0)
);

create unique index medicine_categories_name_unique
  on public.medicine_categories (lower(btrim(name)));

create trigger set_medicine_categories_updated_at
  before update on public.medicine_categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------

create table public.medicines (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  generic_name text,
  brand_name text,
  category_id uuid references public.medicine_categories (id) on delete set null,

  dosage_form text,
  strength text,
  unit text,
  pack_size text,

  barcode text,
  manufacturer text,

  -- Drives the non-blocking POS warnings in Phase 3, and the pharmacist
  -- approval flow in Phase 6.
  prescription_required boolean not null default false,
  controlled_drug boolean not null default false,

  -- Quantity at or below which the Low Stock view flags this medicine.
  --
  -- NOT in the original Phase 2 column list: the low-stock screen needs a
  -- threshold to compare against, and Phase 4's settings table does not exist
  -- yet. Kept on the catalogue because a sensible reorder level is a property
  -- of the product (a fast-moving painkiller vs. a rare antibiotic), and
  -- Phase 4 can layer a per-branch override on top via settings.
  reorder_level integer not null default 10,

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint medicines_name_not_blank check (length(btrim(name)) > 0),
  constraint medicines_reorder_level_non_negative check (reorder_level >= 0)
);

-- A barcode must identify exactly one live medicine, or scanning at the POS is
-- ambiguous. Partial so that soft-deleted rows release their barcode, and so
-- that the many medicines with no barcode at all do not collide on NULL.
create unique index medicines_barcode_unique_live
  on public.medicines (barcode)
  where barcode is not null and deleted_at is null;

create index medicines_category_idx on public.medicines (category_id) where deleted_at is null;
create index medicines_live_idx on public.medicines (is_active) where deleted_at is null;

-- Backs the medicine search box: matches on brand, generic or manufacturer in
-- one index rather than three ILIKE scans.
create index medicines_search_idx on public.medicines
  using gin (
    to_tsvector(
      'simple',
      coalesce(name, '') || ' ' || coalesce(generic_name, '') || ' ' ||
      coalesce(brand_name, '') || ' ' || coalesce(manufacturer, '')
    )
  );

create trigger set_medicines_updated_at
  before update on public.medicines
  for each row execute function public.set_updated_at();

comment on table public.medicines is
  'Global medicine catalogue. Prices deliberately absent — they live on branch_stocks, per batch.';
comment on column public.medicines.reorder_level is
  'Low-stock threshold. Phase 4 may override per branch via settings.';
