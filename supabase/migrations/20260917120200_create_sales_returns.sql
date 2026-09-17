-- ---------------------------------------------------------------------------
-- Phase 3 / 3 — sales_returns and sales_return_items
-- ---------------------------------------------------------------------------

create table public.sales_returns (
  id uuid primary key default gen_random_uuid(),

  sale_id uuid not null references public.sales (id) on delete restrict,
  branch_id uuid not null references public.branches (id) on delete restrict,

  returned_by uuid references public.profiles (id) on delete set null,

  -- Mandatory, like a stock adjustment's reason. An unexplained refund is the
  -- shape of till fraud, so the schema refuses to record one.
  reason text not null,

  refund_method public.payment_method not null,
  total_refund numeric(14, 2) not null,

  created_at timestamptz not null default now(),

  constraint sales_returns_reason_not_blank check (length(btrim(reason)) >= 3),
  constraint sales_returns_refund_non_negative check (total_refund >= 0)
);

create index sales_returns_sale_idx on public.sales_returns (sale_id);
create index sales_returns_branch_created_idx
  on public.sales_returns (branch_id, created_at desc);

-- ---------------------------------------------------------------------------

create table public.sales_return_items (
  id uuid primary key default gen_random_uuid(),

  return_id uuid not null references public.sales_returns (id) on delete cascade,
  sale_item_id uuid not null references public.sale_items (id) on delete restrict,

  quantity integer not null,

  created_at timestamptz not null default now(),

  constraint sales_return_items_quantity_positive check (quantity > 0)
);

create index sales_return_items_return_idx on public.sales_return_items (return_id);
create index sales_return_items_sale_item_idx on public.sales_return_items (sale_item_id);

-- ---------------------------------------------------------------------------
-- How much of a sale line has already come back.
--
-- Partial returns are normal — a customer brings back two strips of five — so
-- "how many are still returnable?" has to be answered against the running
-- total, not against whether a return exists. Without this, the same line
-- could be refunded repeatedly.
-- ---------------------------------------------------------------------------
create or replace function public.returned_quantity(p_sale_item_id uuid)
returns integer
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(sum(ri.quantity), 0)::integer
  from public.sales_return_items ri
  where ri.sale_item_id = p_sale_item_id;
$$;

revoke execute on function public.returned_quantity(uuid) from public, anon;
grant execute on function public.returned_quantity(uuid) to authenticated;

comment on function public.returned_quantity(uuid) is
  'Units of a sale line already returned. Used to cap further returns so a line cannot be refunded twice.';
