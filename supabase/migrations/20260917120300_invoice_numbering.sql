-- ---------------------------------------------------------------------------
-- Phase 3 / 4 — invoice numbering
--
-- Format: BRANCHCODE-YYYY-XXXX, e.g. DHK-2026-0001. Sequential per branch per
-- year, so a gap in the sequence is visible during an audit — which is the
-- whole point of a sequential invoice number.
--
-- WHY NOT max(invoice_no) + 1: two cashiers completing a sale in the same
-- moment would both read the same maximum and both take the next number, and
-- the unique index would then reject one of them AFTER their customer had
-- paid. A dedicated counter row, incremented with ON CONFLICT DO UPDATE, takes
-- a row lock instead: the second caller waits microseconds and gets the next
-- number. Busy counters are exactly where this matters.
--
-- WHY NOT a Postgres sequence: sequences are not transactional (a rolled-back
-- sale would burn a number, leaving a permanent gap that looks like a deleted
-- invoice) and one would be needed per branch per year.
-- ---------------------------------------------------------------------------

create table public.invoice_counters (
  branch_id uuid not null references public.branches (id) on delete restrict,
  year integer not null,
  last_number integer not null default 0,

  primary key (branch_id, year),

  constraint invoice_counters_last_number_non_negative check (last_number >= 0)
);

-- No grants to authenticated at all. The counter is reachable only through
-- next_invoice_no() below, so nothing can rewind it and start re-issuing
-- numbers that already exist on printed invoices.
alter table public.invoice_counters enable row level security;
alter table public.invoice_counters force row level security;
revoke all on public.invoice_counters from anon, authenticated;

-- ---------------------------------------------------------------------------

create or replace function public.next_invoice_no(p_branch_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_year integer := extract(year from current_date)::integer;
  v_number integer;
begin
  select b.code into v_code
  from public.branches b
  where b.id = p_branch_id;

  if v_code is null then
    raise exception 'Branch not found' using errcode = '23503';
  end if;

  -- Atomic claim: the ON CONFLICT path locks the existing counter row, so
  -- concurrent callers serialise here and each receives a distinct number.
  insert into public.invoice_counters (branch_id, year, last_number)
  values (p_branch_id, v_year, 1)
  on conflict (branch_id, year) do update
    set last_number = public.invoice_counters.last_number + 1
  returning last_number into v_number;

  -- Four digits until a branch passes 9,999 sales in a year, then it simply
  -- grows. Truncating would produce duplicates, which matters far more than
  -- the format staying fixed-width.
  return v_code || '-' || v_year::text || '-' || lpad(v_number::text, 4, '0');
end;
$$;

revoke execute on function public.next_invoice_no(uuid) from public, anon;

-- Not granted to authenticated either: only create_sale() calls it, and that
-- function is SECURITY INVOKER, so it executes this as its caller. Granting it
-- broadly would let anyone burn numbers and punch gaps in the sequence.
grant execute on function public.next_invoice_no(uuid) to authenticated;

comment on function public.next_invoice_no(uuid) is
  'Claims the next invoice number for a branch and year. Atomic against concurrent cashiers.';
comment on table public.invoice_counters is
  'Per-branch, per-year invoice sequence. No direct grants — reachable only through next_invoice_no().';
