-- ---------------------------------------------------------------------------
-- Phase 1 / 1 of 6 — extensions, role enum, shared trigger helpers
--
-- Establishes primitives every later phase reuses. Nothing here is
-- table-specific on purpose.
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Role enum.
--
-- Kept as a Postgres enum (not a roles table) deliberately: v1 has a fixed set
-- of job functions, and an enum makes every RLS policy a cheap equality check
-- with no extra join. A roles/permissions table only earns its complexity once
-- roles become user-definable.
--
-- 'pharmacist' is included now, ahead of the Phase 6 controlled-drug approval
-- flow, because adding an enum value later cannot run inside the same
-- transaction as code that uses it (Postgres restriction) — reserving it up
-- front avoids a two-step migration dance down the line.
-- ---------------------------------------------------------------------------
create type public.user_role as enum (
  'super_admin',
  'branch_manager',
  'cashier',
  'stock_manager',
  'pharmacist'
);

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger function.
--
-- search_path is pinned to '' so a malicious schema earlier on a caller's
-- search_path cannot shadow anything this function resolves. Every object is
-- therefore referenced fully-qualified.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Generic BEFORE UPDATE trigger: stamps updated_at. Attach to every table that has an updated_at column.';
