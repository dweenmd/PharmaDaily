-- ---------------------------------------------------------------------------
-- Phase 2 / 6 — RLS policies
--
-- Applies the pattern established in Phase 1 to the new tables. Two shapes:
--
--   GLOBAL tables (medicine_categories, medicines, suppliers) — shared across
--   the chain. Every authenticated user may READ them; only catalogue managers
--   may write. There is nothing branch-specific to isolate: a medicine's name
--   and a distributor's phone number are not one outlet's secret.
--
--   BRANCH-SCOPED tables (branch_stocks, purchases, purchase_items,
--   stock_movements, stock_adjustments) — these carry the numbers that matter.
--   Stock levels, cost prices and supplier invoices are exactly what one
--   branch must not see about another, so each is scoped to
--   current_user_branch_id(), with super_admin exempt.
--
-- As in Phase 1: RLS is FORCED, DELETE is never granted, and anon is revoked.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Who may edit the shared catalogue.
--
-- A cashier must be able to read every medicine (they sell them) but must not
-- be able to edit the catalogue or invent a supplier. A pharmacist advises on
-- drugs rather than administering the catalogue, so they are read-only too.
-- ---------------------------------------------------------------------------
create or replace function public.can_manage_catalogue()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(
    public.current_user_role() in ('super_admin', 'branch_manager', 'stock_manager'),
    false
  );
$$;

revoke execute on function public.can_manage_catalogue() from public, anon;
grant execute on function public.can_manage_catalogue() to authenticated;

-- ===========================================================================
-- medicine_categories — global, read by all, written by catalogue managers
-- ===========================================================================
alter table public.medicine_categories enable row level security;
alter table public.medicine_categories force row level security;

revoke all on public.medicine_categories from anon;
grant select, insert, update on public.medicine_categories to authenticated;

create policy "medicine_categories_read_all"
  on public.medicine_categories for select
  to authenticated
  using (true);

create policy "medicine_categories_manage"
  on public.medicine_categories for insert
  to authenticated
  with check (public.can_manage_catalogue());

create policy "medicine_categories_update"
  on public.medicine_categories for update
  to authenticated
  using (public.can_manage_catalogue())
  with check (public.can_manage_catalogue());

-- ===========================================================================
-- medicines — global
-- ===========================================================================
alter table public.medicines enable row level security;
alter table public.medicines force row level security;

revoke all on public.medicines from anon;
grant select, insert, update on public.medicines to authenticated;

create policy "medicines_read_all"
  on public.medicines for select
  to authenticated
  using (true);

create policy "medicines_manage"
  on public.medicines for insert
  to authenticated
  with check (public.can_manage_catalogue());

create policy "medicines_update"
  on public.medicines for update
  to authenticated
  using (public.can_manage_catalogue())
  with check (public.can_manage_catalogue());

-- ===========================================================================
-- suppliers — global
-- ===========================================================================
alter table public.suppliers enable row level security;
alter table public.suppliers force row level security;

revoke all on public.suppliers from anon;
grant select, insert, update on public.suppliers to authenticated;

create policy "suppliers_read_all"
  on public.suppliers for select
  to authenticated
  using (true);

create policy "suppliers_manage"
  on public.suppliers for insert
  to authenticated
  with check (public.can_manage_catalogue());

create policy "suppliers_update"
  on public.suppliers for update
  to authenticated
  using (public.can_manage_catalogue())
  with check (public.can_manage_catalogue());

-- ===========================================================================
-- branch_stocks — branch-scoped
-- ===========================================================================
alter table public.branch_stocks enable row level security;
alter table public.branch_stocks force row level security;

revoke all on public.branch_stocks from anon;
grant select, insert, update on public.branch_stocks to authenticated;

create policy "branch_stocks_super_admin_all"
  on public.branch_stocks for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "branch_stocks_own_branch_select"
  on public.branch_stocks for select
  to authenticated
  using (branch_id = public.current_user_branch_id());

create policy "branch_stocks_own_branch_insert"
  on public.branch_stocks for insert
  to authenticated
  with check (branch_id = public.current_user_branch_id());

create policy "branch_stocks_own_branch_update"
  on public.branch_stocks for update
  to authenticated
  using (branch_id = public.current_user_branch_id())
  with check (branch_id = public.current_user_branch_id());

-- ===========================================================================
-- purchases — branch-scoped
-- ===========================================================================
alter table public.purchases enable row level security;
alter table public.purchases force row level security;

revoke all on public.purchases from anon;
grant select, insert, update on public.purchases to authenticated;

create policy "purchases_super_admin_all"
  on public.purchases for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "purchases_own_branch_select"
  on public.purchases for select
  to authenticated
  using (branch_id = public.current_user_branch_id());

create policy "purchases_own_branch_insert"
  on public.purchases for insert
  to authenticated
  with check (branch_id = public.current_user_branch_id());

create policy "purchases_own_branch_update"
  on public.purchases for update
  to authenticated
  using (branch_id = public.current_user_branch_id())
  with check (branch_id = public.current_user_branch_id());

-- ===========================================================================
-- purchase_items — no branch_id of its own, so it scopes through its parent.
--
-- This is the "indirect branch pattern" Phase 1 documented. Without it, line
-- items would be readable chain-wide even though their parent purchase is not,
-- leaking every branch's cost prices — the most commercially sensitive numbers
-- in the system.
-- ===========================================================================
alter table public.purchase_items enable row level security;
alter table public.purchase_items force row level security;

revoke all on public.purchase_items from anon;
grant select, insert, update on public.purchase_items to authenticated;

create policy "purchase_items_via_parent_select"
  on public.purchase_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.purchases p
      where p.id = purchase_items.purchase_id
        and (public.is_super_admin() or p.branch_id = public.current_user_branch_id())
    )
  );

create policy "purchase_items_via_parent_insert"
  on public.purchase_items for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.purchases p
      where p.id = purchase_items.purchase_id
        and (public.is_super_admin() or p.branch_id = public.current_user_branch_id())
    )
  );

create policy "purchase_items_via_parent_update"
  on public.purchase_items for update
  to authenticated
  using (
    exists (
      select 1
      from public.purchases p
      where p.id = purchase_items.purchase_id
        and (public.is_super_admin() or p.branch_id = public.current_user_branch_id())
    )
  )
  with check (
    exists (
      select 1
      from public.purchases p
      where p.id = purchase_items.purchase_id
        and (public.is_super_admin() or p.branch_id = public.current_user_branch_id())
    )
  );

-- ===========================================================================
-- stock_movements — branch-scoped AND append-only.
--
-- Only SELECT and INSERT are granted. No UPDATE, no DELETE, for anyone
-- including super_admin: this is the ledger the stock balances are reconciled
-- against, and a ledger you can edit proves nothing. Mistakes are corrected by
-- writing a compensating movement.
-- ===========================================================================
alter table public.stock_movements enable row level security;
alter table public.stock_movements force row level security;

revoke all on public.stock_movements from anon;
grant select, insert on public.stock_movements to authenticated;

create policy "stock_movements_select"
  on public.stock_movements for select
  to authenticated
  using (public.is_super_admin() or branch_id = public.current_user_branch_id());

create policy "stock_movements_insert"
  on public.stock_movements for insert
  to authenticated
  with check (public.is_super_admin() or branch_id = public.current_user_branch_id());

-- ===========================================================================
-- stock_adjustments — branch-scoped, append-only for the same reason
-- ===========================================================================
alter table public.stock_adjustments enable row level security;
alter table public.stock_adjustments force row level security;

revoke all on public.stock_adjustments from anon;
grant select, insert on public.stock_adjustments to authenticated;

create policy "stock_adjustments_select"
  on public.stock_adjustments for select
  to authenticated
  using (public.is_super_admin() or branch_id = public.current_user_branch_id());

create policy "stock_adjustments_insert"
  on public.stock_adjustments for insert
  to authenticated
  with check (public.is_super_admin() or branch_id = public.current_user_branch_id());
