-- ---------------------------------------------------------------------------
-- Phase 1 / 2 of 6 — branches
--
-- The tenancy root. Every operational table from Phase 2 onward carries a
-- branch_id pointing here, and every RLS policy is written against it.
-- ---------------------------------------------------------------------------

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  address text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  -- Feeds the BRANCHCODE-YYYY-XXXX invoice format (Phase 3), so it must stay
  -- short, uppercase and free of characters that would make an invoice number
  -- ambiguous.
  constraint branches_code_format check (code ~ '^[A-Z0-9]{2,10}$'),
  constraint branches_name_not_blank check (length(btrim(name)) > 0)
);

-- Branch codes must be unique among *live* branches only. A partial unique
-- index (rather than a plain UNIQUE constraint) lets a soft-deleted branch
-- release its code for reuse, while still making duplicates impossible among
-- active ones.
create unique index branches_code_unique_live
  on public.branches (code)
  where deleted_at is null;

create index branches_live_idx
  on public.branches (is_active)
  where deleted_at is null;

create trigger set_branches_updated_at
  before update on public.branches
  for each row execute function public.set_updated_at();

comment on table public.branches is
  'Pharmacy outlets. Soft-deleted via deleted_at — never hard-deleted, because sales/stock history references them.';
comment on column public.branches.code is
  'Short uppercase branch code used as the invoice-number prefix, e.g. DHK.';
