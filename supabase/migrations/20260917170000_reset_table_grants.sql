-- ---------------------------------------------------------------------------
-- CRITICAL FIX: every table grant was wider than intended
--
-- WHAT WAS WRONG. Supabase's default privileges grant ALL on a new table in
-- the public schema to both `anon` and `authenticated`. Every migration in
-- this project revoked from `anon` and then ADDED grants for `authenticated`:
--
--     revoke all on public.stock_movements from anon;
--     grant select, insert on public.stock_movements to authenticated;
--
-- The second line looks like it limits what an authenticated user may do. It
-- does not. It adds to a grant that already included DELETE and UPDATE, so it
-- was a no-op, and the comment above it — "append-only" — was simply untrue.
--
-- Proven before this migration: a branch manager could DELETE rows from
-- stock_movements, forge new ones, delete branch_stocks outright, and write
-- cash_sessions.variance directly to close a short drawer as balanced.
--
-- The RLS POLICIES were never wrong. Branch isolation held throughout: the
-- probe could only touch its own branch's rows. What failed is the layer
-- underneath — which operations are possible at all. Policies decide WHICH
-- ROWS; grants decide WHICH VERBS. Getting the policies right while leaving
-- the verbs open means a user can do the wrong thing to the right rows.
--
-- THE FIX. Revoke everything from both roles on every table, then grant back
-- exactly what each one needs. Written out table by table rather than looped,
-- because this list IS the access model and it should be readable as one.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end;
$$;

-- ===========================================================================
-- Reference data: read by everyone, edited by catalogue managers.
-- No DELETE anywhere — everything soft-deletes via deleted_at.
-- ===========================================================================
grant select, insert, update on public.branches to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.medicine_categories to authenticated;
grant select, insert, update on public.medicines to authenticated;
grant select, insert, update on public.suppliers to authenticated;
grant select, insert, update on public.customers to authenticated;

-- profiles rows are created only by the handle_new_user trigger.
revoke insert on public.profiles from authenticated;

-- The money columns are computed, never written. This is the column-level
-- grant that closed the debt-wiping hole; re-applied here because the blanket
-- revoke above dropped it along with everything else.
revoke update on public.customers from authenticated;
grant update (name, phone, address, is_active, deleted_at) on public.customers to authenticated;

revoke update on public.suppliers from authenticated;
grant update (name, phone, address, is_active, deleted_at) on public.suppliers to authenticated;

-- ===========================================================================
-- Stock. branch_stocks is updated by the transaction functions; the ledger is
-- append-only, and now actually is.
-- ===========================================================================
grant select, insert, update on public.branch_stocks to authenticated;
grant select, insert on public.stock_movements to authenticated;
grant select, insert on public.stock_adjustments to authenticated;

-- ===========================================================================
-- Purchasing.
-- ===========================================================================
grant select, insert, update on public.purchases to authenticated;
grant select, insert, update on public.purchase_items to authenticated;
grant select, insert on public.supplier_payments to authenticated;

-- ===========================================================================
-- Selling. Lines and tenders are append-only: a sold line is a financial
-- record, and a tender that can be edited afterwards is a way to make cash
-- disappear from the till.
-- ===========================================================================
grant select, insert, update on public.sales to authenticated;
grant select, insert on public.sale_items to authenticated;
grant select, insert on public.payments to authenticated;
grant select, insert on public.sales_returns to authenticated;
grant select, insert on public.sales_return_items to authenticated;
grant select, insert on public.customer_payments to authenticated;

-- ===========================================================================
-- Transfers.
-- ===========================================================================
grant select, insert, update on public.stock_transfers to authenticated;
grant select, insert, update on public.stock_transfer_items to authenticated;

-- ===========================================================================
-- Operations.
-- ===========================================================================
grant select, insert, update on public.settings to authenticated;
grant select, insert, update on public.expenses to authenticated;

-- Marking read is the only edit; the trigger enforces which columns.
grant select, update on public.notifications to authenticated;

-- ===========================================================================
-- Read-only to everyone. Written by SECURITY DEFINER functions or triggers.
--
--   cash_sessions / cash_movements  expected_cash and variance are computed,
--                                   never supplied — a settable variance lets
--                                   a short drawer close as balanced.
--   audit_logs                      a record the audited party can edit is
--                                   not a record.
--   invoice_counters                nothing may rewind a sequence whose
--                                   numbers are already on printed invoices.
--   transfer_counters               same.
-- ===========================================================================
grant select on public.cash_sessions to authenticated;
grant select on public.cash_movements to authenticated;
grant select on public.audit_logs to authenticated;

-- The offline queue is a staging area, written by its own INVOKER function.
grant select, insert, update on public.offline_sync_queue to authenticated;

-- ===========================================================================
-- Stop the same thing happening to the next table anyone adds.
--
-- Supabase's default privileges are what produced this. Changing them means a
-- future migration that forgets to grant gets a table nobody can read — which
-- fails loudly in development — rather than one everybody can delete from,
-- which fails silently in production.
-- ===========================================================================
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
