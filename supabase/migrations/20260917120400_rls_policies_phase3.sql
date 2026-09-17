-- ---------------------------------------------------------------------------
-- Phase 3 / 5 — RLS policies for sales
--
-- Sales are branch-scoped, following the Phase 1 pattern. sale_items,
-- payments and return items have no branch_id of their own where their parent
-- already carries it, so they scope through the parent — the indirect pattern.
--
-- Takings, discounts and customer debt are precisely what one branch must not
-- see about another, so this is the same isolation as stock, applied to money.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- sales
-- ===========================================================================
alter table public.sales enable row level security;
alter table public.sales force row level security;

revoke all on public.sales from anon;
grant select, insert, update on public.sales to authenticated;

create policy "sales_super_admin_all"
  on public.sales for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "sales_own_branch_select"
  on public.sales for select
  to authenticated
  using (branch_id = public.current_user_branch_id());

create policy "sales_own_branch_insert"
  on public.sales for insert
  to authenticated
  with check (branch_id = public.current_user_branch_id());

create policy "sales_own_branch_update"
  on public.sales for update
  to authenticated
  using (branch_id = public.current_user_branch_id())
  with check (branch_id = public.current_user_branch_id());

-- ===========================================================================
-- sale_items — scoped through the parent sale
-- ===========================================================================
alter table public.sale_items enable row level security;
alter table public.sale_items force row level security;

revoke all on public.sale_items from anon;
grant select, insert on public.sale_items to authenticated;

-- No UPDATE grant: a sold line is a financial record. Correcting one means
-- processing a return, which leaves a trail, rather than quietly editing what
-- the customer was charged.
create policy "sale_items_via_parent_select"
  on public.sale_items for select
  to authenticated
  using (
    exists (
      select 1 from public.sales s
      where s.id = sale_items.sale_id
        and (public.is_super_admin() or s.branch_id = public.current_user_branch_id())
    )
  );

create policy "sale_items_via_parent_insert"
  on public.sale_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.sales s
      where s.id = sale_items.sale_id
        and (public.is_super_admin() or s.branch_id = public.current_user_branch_id())
    )
  );

-- ===========================================================================
-- payments — carries its own branch_id, so it scopes directly
-- ===========================================================================
alter table public.payments enable row level security;
alter table public.payments force row level security;

revoke all on public.payments from anon;
grant select, insert on public.payments to authenticated;

-- Append-only, like the stock ledger. A tender that can be edited after the
-- fact is a way to make cash disappear from the till.
create policy "payments_select"
  on public.payments for select
  to authenticated
  using (public.is_super_admin() or branch_id = public.current_user_branch_id());

create policy "payments_insert"
  on public.payments for insert
  to authenticated
  with check (public.is_super_admin() or branch_id = public.current_user_branch_id());

-- ===========================================================================
-- sales_returns
-- ===========================================================================
alter table public.sales_returns enable row level security;
alter table public.sales_returns force row level security;

revoke all on public.sales_returns from anon;
grant select, insert on public.sales_returns to authenticated;

create policy "sales_returns_select"
  on public.sales_returns for select
  to authenticated
  using (public.is_super_admin() or branch_id = public.current_user_branch_id());

create policy "sales_returns_insert"
  on public.sales_returns for insert
  to authenticated
  with check (public.is_super_admin() or branch_id = public.current_user_branch_id());

-- ===========================================================================
-- sales_return_items — scoped through the parent return
-- ===========================================================================
alter table public.sales_return_items enable row level security;
alter table public.sales_return_items force row level security;

revoke all on public.sales_return_items from anon;
grant select, insert on public.sales_return_items to authenticated;

create policy "sales_return_items_via_parent_select"
  on public.sales_return_items for select
  to authenticated
  using (
    exists (
      select 1 from public.sales_returns r
      where r.id = sales_return_items.return_id
        and (public.is_super_admin() or r.branch_id = public.current_user_branch_id())
    )
  );

create policy "sales_return_items_via_parent_insert"
  on public.sales_return_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.sales_returns r
      where r.id = sales_return_items.return_id
        and (public.is_super_admin() or r.branch_id = public.current_user_branch_id())
    )
  );
