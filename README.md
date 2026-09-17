# PharmaDaily

Multi-branch pharmacy management system — inventory, point of sale, purchasing and reporting, built as an installable PWA so billing keeps working when the counter loses its internet connection.

**Stack:** Next.js 16 (App Router, TypeScript) · Supabase (Postgres, Auth, Row Level Security) · Tailwind CSS + shadcn/ui · Serwist (service worker) · Vercel

---

## Security model

The one rule everything else follows: **branch isolation is enforced by the database, not the user interface.**

Every table carries a `branch_id`, Row Level Security is enabled *and forced* on all of them, and policies are written against three `SECURITY DEFINER` helper functions:

| Function | Returns |
| --- | --- |
| `public.current_user_role()` | The caller's role, or `NULL` if their profile is inactive or deleted |
| `public.current_user_branch_id()` | The caller's branch, `NULL` for a super admin |
| `public.is_super_admin()` | `true` only for an active super admin; never `NULL` |

Consequences worth knowing before you change anything:

- A tampered-with frontend, a stolen anon key or a hand-written `curl` request all hit the same policies. None of them can read another branch's rows.
- Deactivating a user takes effect immediately, even if their browser still holds a valid session — the helpers resolve an inactive profile to `NULL`, so every policy fails closed.
- `DELETE` is never granted to application users. Everything soft-deletes via `deleted_at`, which keeps financial history intact.
- Profile rows are created only by the `handle_new_user()` trigger, which never reads `role` or `branch_id` from signup metadata. A new account is inert until an administrator provisions it.
- A `BEFORE UPDATE` trigger freezes `role`, `branch_id`, `is_active`, `deleted_at` and `auth_id` against self-service updates — the column-level gap that row-scoped RLS cannot express on its own.

`npm run verify:rls` proves all of this against a real database. Run it after any migration that adds a table or touches a policy.

## Inventory integrity

`branch_stocks.quantity` is a running balance. `stock_movements` is the append-only ledger it must agree with — every quantity change writes a signed row there in the same transaction, and no `UPDATE` or `DELETE` is granted on it to anyone, super admin included. Correcting a mistake means writing a compensating movement, exactly as a ledger works.

Recording a consignment touches five things: the purchase header, its line items, `branch_stocks`, `stock_movements`, and the supplier's balance. PostgREST has no client-side transaction, so these happen inside the `create_purchase()` database function — one call, one statement, one transaction. A dropped connection cannot leave stock on the shelf that the ledger does not know about. `create_stock_adjustment()` works the same way, and takes a row lock so two concurrent decreases cannot both subtract from the same starting quantity.

Both functions run `SECURITY INVOKER`, so every write inside them is checked against the caller's own RLS policies. A consequence worth knowing: they gate on `auth.uid()`, so a service-role caller has no identity and is refused. Nothing server-side can record a purchase without acting as a real user.

`npm run verify:tx` proves this, including that a purchase which fails partway leaves nothing behind.

## Money

Completing a sale is the same shape: header, line items, payments, a deduction from each batch and a ledger entry per line, all inside `create_sale()`.

Two details there are security decisions, not just correctness ones:

- **Prices are read from the database, never accepted from the client.** The browser sends a batch and a quantity; `unit_price` comes from `branch_stocks.selling_price`. If the client supplied it, anyone who can open a console could set their own prices and the books would still balance. `verify:tx` sends a deliberately tampered price and asserts it is ignored.
- **Every batch row is locked `FOR UPDATE` before its quantity is checked.** Two cashiers selling the last strip at the same instant would otherwise both read "1 in stock" and both deduct.

Invoice numbers (`BRANCHCODE-YYYY-XXXX`) come from a counter table incremented with `ON CONFLICT DO UPDATE`. `max(invoice_no)+1` would let concurrent sales claim the same number and reject one *after* the customer had paid; a Postgres sequence is not transactional, so a rolled-back sale would burn a number and leave a gap indistinguishable from a deleted invoice. `verify:tx` fires ten simultaneous sales and asserts every one gets a distinct number.

`payments`, `sale_items` and the return tables are append-only — no `UPDATE` or `DELETE` grant to anyone. A tender that can be edited after the fact is a way to make cash disappear from the till. Returns cap each line at what was sold minus what has already come back, and settle against outstanding credit before any cash goes out.

`public.can_sell()` decides who may take payment or issue a refund: super admin, branch manager, cashier and pharmacist. Stock managers are deliberately excluded — their job is receiving deliveries, not handling money.

### Balances are derived, never written

`customers.due_amount` and `suppliers.due_amount` look like editable columns and are not:

```
due = what is still owed on their invoices - what they have paid
```

Both columns are **removed from the `UPDATE` grant**. Postgres checks column privileges against the `SET` clause, so an attempt to write one is refused at the privilege layer — before RLS, before any trigger. The only thing that writes them is a `recompute_*_balance()` function, which is safe to expose precisely because it takes no amount: it reads the source records and sets the answer, so calling it with bad intent just recomputes the truth.

This closed a hole that was live until it was found: the grant used to cover every column, so a cashier could zero a customer's debt and a stock manager could zero a supplier balance, hiding money the business owed. It was the same bug as the Phase 1 privilege escalation on `profiles` — the rule was written down there and not applied here. `verify:rls` now asserts both cases.

`record_customer_payment()` and `record_supplier_payment()` write an append-only ledger row and then recompute, so a double-submitted form cannot drive a balance below what is owed, and neither will accept more than is outstanding.

---

## Getting started

### 1. Prerequisites

- Node.js 20 or newer
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — required for the local Supabase stack

### 2. Install

```bash
npm install
cp .env.local.example .env.local
```

### 3. Start the database

```bash
npm run db:start
```

This boots Postgres, Auth and Supabase Studio in Docker, then prints an **API URL**, an **anon key** and a **service_role key**. Copy all three into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

### 4. Apply migrations

```bash
npm run db:reset   # drops, recreates and replays every migration
npm run db:types   # regenerates src/types/database.types.ts from the live schema
```

### 5. Create the first administrator

Set a strong password in `.env.local`:

```
SEED_SUPER_ADMIN_EMAIL=admin@yourpharmacy.com
SEED_SUPER_ADMIN_PASSWORD=<at least 12 characters>
SEED_SUPER_ADMIN_NAME=Your Name
```

Then:

```bash
npm run seed:admin
```

There is deliberately no public sign-up and no "create first admin" page — such an endpoint in production is a backdoor. The first privileged account is minted by this script, and every later staff account is created by an administrator from inside the app.

Clear `SEED_SUPER_ADMIN_PASSWORD` from `.env.local` once you have signed in.

### 6. Run it

```bash
npm run dev
```

Open http://localhost:3000 and sign in.

### 7. Confirm the security model holds

```bash
npm run verify:rls
```

Creates two branches and staff at each, signs in as them over the anon key, and asserts that a branch manager cannot read another branch, cannot promote themselves, cannot create branches, and loses access the moment they are deactivated. Exits non-zero if any check fails.

---

## Connecting a hosted Supabase project

Local development needs nothing hosted. When you are ready to deploy:

1. Create a project at [supabase.com](https://supabase.com) — use **separate projects for staging and production**, never one shared project.
2. **Authentication → Providers → Email**: turn **off** "Allow new users to sign up". This is internal staff software; accounts are provisioned by an administrator.
3. Link and push the schema:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npm run db:push
   ```
4. Copy the project's URL and keys into your deployment environment (for Vercel: Project Settings → Environment Variables). The `service_role` key is server-side only — it must never be given a `NEXT_PUBLIC_` prefix.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build, then compiles the service worker |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run format` | Prettier, write |
| `npm run db:start` / `db:stop` | Local Supabase stack |
| `npm run db:reset` | Replay all migrations from scratch |
| `npm run db:push` | Apply migrations to the linked hosted project |
| `npm run db:types` | Regenerate database types |
| `npm run seed:admin` | Create or promote the super admin |
| `npm run verify:rls` | Access-control regression test |
| `npm run verify:tx` | Inventory transaction regression test |

Both suites run against the live database and exit non-zero on any failure. Current: **49 access-control checks, 33 transaction checks**.

---

## Project layout

```
src/
  app/
    (auth)/login/         Sign-in screen
    (protected)/          Everything behind authentication
      layout.tsx          App shell: sidebar, header, branch switcher
      dashboard/
    offline/              Static fallback served by the service worker
    sw.ts                 Service worker source
    manifest.ts           PWA manifest
  components/
    ui/                   shadcn/ui primitives
    shared/               App shell, empty states, loading skeletons
  features/               One folder per domain: server actions, schemas, components
  lib/
    supabase/             client · server · middleware · admin
    auth/                 Role helpers, current-profile loader
    env.ts                Validated public config
    env.server.ts         Validated server-only config
  proxy.ts                Session refresh and route protection
supabase/migrations/      Schema source of truth
scripts/                  Seeding, RLS verification, icon generation
```

`app/` stays thin — routing and composition. Domain logic lives in `features/*`, so a new module drops in beside the existing ones without restructuring anything.

---

## Roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Setup, authentication, roles, RLS | Complete |
| 2 | Medicines, suppliers, purchases, stock | Complete |
| 3 | POS, billing, sales returns | Complete |
| 4 | Dashboard and reports | Complete |
| 5 | Multi-branch operations and stock transfers | Next |
| 6 | Offline sync, mobile payments, audit log | Planned |

Every table has carried `branch_id` since Phase 1, so multi-branch support in Phase 5 is a user-interface and workflow exercise rather than a migration.

---

## Conventions

- **Migrations are append-only.** Never edit one that has been pushed; write a new one.
- **Every new table repeats the RLS pattern** documented at the top of `supabase/migrations/*_rls_policies_branches_profiles.sql`. Child tables without their own `branch_id` scope through their parent.
- **Re-run `npm run verify:rls` and `npm run verify:tx`** after any policy or transaction change, and extend them to cover new tables.
- **Prices live on `branch_stocks`,** never on `medicines` — the same medicine costs different amounts in different batches.
