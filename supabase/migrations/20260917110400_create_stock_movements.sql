-- ---------------------------------------------------------------------------
-- Phase 2 / 5 — stock_movements and stock_adjustments
--
-- stock_movements is THE SINGLE SOURCE OF TRUTH for inventory history. Every
-- change to branch_stocks.quantity — from a purchase, a sale, a transfer, an
-- adjustment or a return — writes a row here in the same transaction.
--
-- branch_stocks.quantity is therefore a running balance that must always equal
-- the sum of movements for that batch. If the two ever disagree, the movements
-- are right and the balance is the thing to repair.
--
-- The table is append-only: no UPDATE or DELETE grant is ever given. Correcting
-- a mistake means writing a compensating movement, exactly as a ledger works.
-- ---------------------------------------------------------------------------

create type public.stock_movement_type as enum (
  'purchase',
  'sale',
  'transfer_in',
  'transfer_out',
  'adjustment',
  'return'
);

create type public.stock_adjustment_type as enum ('increase', 'decrease');

-- ---------------------------------------------------------------------------

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),

  branch_id uuid not null references public.branches (id) on delete restrict,
  medicine_id uuid not null references public.medicines (id) on delete restrict,
  batch_no text not null,

  type public.stock_movement_type not null,

  -- SIGNED. Positive adds stock, negative removes it, so the running balance
  -- for a batch is a plain sum() with no per-type CASE. A zero movement would
  -- be a no-op row and is rejected.
  quantity integer not null,

  -- Points back at whatever caused this movement: a purchase, a sale, a
  -- transfer, an adjustment. Deliberately NOT a foreign key — it targets
  -- different tables depending on reference_type, and a polymorphic FK is not
  -- expressible. reference_type says which table to look in.
  reference_id uuid,
  reference_type text,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),

  constraint stock_movements_quantity_non_zero check (quantity <> 0),
  constraint stock_movements_batch_no_not_blank check (length(btrim(batch_no)) > 0),

  -- Directions that cannot make sense: a purchase or transfer_in that removes
  -- stock, a sale or transfer_out that adds it. Catches a sign error at the
  -- point it happens rather than three reports later.
  constraint stock_movements_direction_matches_type check (
    case type
      when 'purchase' then quantity > 0
      when 'transfer_in' then quantity > 0
      when 'return' then quantity > 0
      when 'sale' then quantity < 0
      when 'transfer_out' then quantity < 0
      else true -- 'adjustment' goes either way
    end
  )
);

create index stock_movements_branch_created_idx
  on public.stock_movements (branch_id, created_at desc);

create index stock_movements_batch_idx
  on public.stock_movements (branch_id, medicine_id, batch_no, created_at desc);

create index stock_movements_reference_idx
  on public.stock_movements (reference_type, reference_id);

-- ---------------------------------------------------------------------------

create table public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),

  branch_id uuid not null references public.branches (id) on delete restrict,
  medicine_id uuid not null references public.medicines (id) on delete restrict,
  batch_no text not null,

  type public.stock_adjustment_type not null,

  -- Always positive; `type` carries the direction. Storing the magnitude
  -- separately from the direction keeps the reason/quantity pair readable in
  -- an audit, while the signed value goes into stock_movements.
  quantity integer not null,

  -- Mandatory. An unexplained stock correction in a pharmacy is exactly the
  -- shape of shrinkage being covered up, so the schema refuses to record one.
  reason text not null,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),

  constraint stock_adjustments_quantity_positive check (quantity > 0),
  constraint stock_adjustments_reason_not_blank check (length(btrim(reason)) >= 3),
  constraint stock_adjustments_batch_no_not_blank check (length(btrim(batch_no)) > 0)
);

create index stock_adjustments_branch_created_idx
  on public.stock_adjustments (branch_id, created_at desc);

comment on table public.stock_movements is
  'Append-only inventory ledger. Every branch_stocks.quantity change writes a row here in the same transaction.';
comment on column public.stock_movements.quantity is
  'Signed: positive adds stock, negative removes it. Sum per batch equals the running balance.';
comment on column public.stock_movements.reference_id is
  'Polymorphic pointer to the causing record; read together with reference_type. Not an FK by design.';
