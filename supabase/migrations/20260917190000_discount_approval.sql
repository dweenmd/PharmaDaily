-- A cashier discounting freely is exactly how "how much discount is he
-- giving" stops having an answer. max_discount_percent (a settings row, same
-- branch-override pattern as near_expiry_days) draws the line a cashier may
-- cross alone; above it, create_sale() now refuses unless the sale carries a
-- token proving a manager approved it.
--
-- The token is minted by a server action that verifies the manager's own
-- password through Supabase Auth itself — not reimplemented in SQL, which
-- would bypass Auth's own rate limiting and lockouts — and is single-use,
-- branch-locked and short-lived so it cannot be replayed or borrowed.
create table public.discount_overrides (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id),
  approved_by uuid not null references public.profiles (id),
  requested_discount_percent numeric(5, 2) not null,
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '5 minutes')
);

comment on table public.discount_overrides is
  'One-time tokens proving a manager approved a discount above max_discount_percent. Minted by requestDiscountOverrideAction (which verifies the password), consumed by create_sale(). Never reachable directly — no grants, no policies.';

create index discount_overrides_pending_idx
  on public.discount_overrides (branch_id)
  where consumed_at is null;

alter table public.discount_overrides enable row level security;

-- Deliberately no policies and no grants to anon/authenticated: the only
-- path that touches this table from application code is
-- consume_discount_override() below, which is SECURITY DEFINER. create_sale()
-- itself runs SECURITY INVOKER (as the calling cashier) — this table staying
-- completely ungrantable to `authenticated` is what makes that safe, so
-- create_sale() reaches it only through that one narrow, audited door.
revoke all on public.discount_overrides from anon, authenticated;

-- ---------------------------------------------------------------------------

-- The one door into discount_overrides for an ordinary signed-in user.
-- Split out from create_sale() specifically so create_sale() itself never
-- has to become SECURITY DEFINER — that would mean re-deriving, by hand,
-- every authorisation check RLS currently gives it for free on branch_stocks,
-- sales and everything else it touches. A single-purpose DEFINER function
-- that does exactly one thing — spend a token, atomically, once — is a much
-- smaller thing to get right and audit than the alternative.
--
-- Possession of a live, unexpired, matching-branch token IS the proof of
-- authorisation here — nothing else checks who is calling. That is fine
-- precisely because nothing but requestDiscountOverrideAction (which
-- verifies a manager's actual password through Supabase Auth) ever mints
-- one, and a uuid is not something worth guessing at.
create or replace function public.consume_discount_override(p_token uuid, p_branch_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.discount_overrides
    where id = p_token
      and branch_id = p_branch_id
      and consumed_at is null
      and expires_at > now()
    for update
  ) then
    return false;
  end if;

  update public.discount_overrides
  set consumed_at = now()
  where id = p_token;

  return true;
end;
$$;

comment on function public.consume_discount_override(uuid, uuid) is
  'Atomically spends a discount-override token: true if it was live and got consumed, false otherwise. Called from create_sale() (SECURITY INVOKER) so that function never needs table access to discount_overrides directly.';

revoke all on function public.consume_discount_override(uuid, uuid) from public, anon;
grant execute on function public.consume_discount_override(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------

create or replace function public.create_sale(
  p_branch_id uuid,
  p_customer_id uuid,
  p_discount numeric,
  p_items jsonb,
  p_payments jsonb,
  p_sale_date date default null,
  p_discount_override_token uuid default null
)
returns uuid
language plpgsql
set search_path = ''
as $function$
declare
  v_profile_id uuid;
  v_sale_id uuid;
  v_invoice_no text;
  v_subtotal numeric(14, 2) := 0;
  v_discount numeric(14, 2) := coalesce(p_discount, 0);
  v_discount_percent numeric;
  v_max_discount_percent numeric;
  v_total numeric(14, 2);
  v_paid numeric(14, 2) := 0;
  v_due numeric(14, 2);
  v_item jsonb;
  v_payment jsonb;
  v_stock record;
  v_quantity integer;
  v_line_total numeric(14, 2);
begin
  if not public.can_sell() then
    raise exception 'Your role is not permitted to complete sales' using errcode = '42501';
  end if;

  select p.id into v_profile_id
  from public.profiles p
  where p.auth_id = (select auth.uid())
    and p.is_active = true
    and p.deleted_at is null;

  if v_profile_id is null then
    raise exception 'No active profile for the current user' using errcode = '42501';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A sale must have at least one item' using errcode = '22023';
  end if;

  if v_discount < 0 then
    raise exception 'Discount cannot be negative' using errcode = '22023';
  end if;

  -- Checked before anything is written, so the cashier is told to fetch the
  -- pharmacist rather than finding out after an invoice number has been
  -- claimed and half the sale recorded.
  if not public.can_dispense_controlled() then
    if exists (
      select 1
      from jsonb_array_elements(p_items) as item
      join public.branch_stocks bs on bs.id = (item.value ->> 'branch_stock_id')::uuid
      join public.medicines m on m.id = bs.medicine_id
      where m.controlled_drug = true
    ) then
      raise exception 'A pharmacist must complete a sale containing a controlled drug'
        using errcode = '42501';
    end if;
  end if;

  v_invoice_no := public.next_invoice_no(p_branch_id);

  insert into public.sales (
    branch_id, customer_id, cashier_id, invoice_no,
    subtotal, discount, total_amount, paid_amount, due_amount, sale_date
  )
  values (
    p_branch_id, p_customer_id, v_profile_id, v_invoice_no,
    0, 0, 0, 0, 0, coalesce(p_sale_date, current_date)
  )
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Quantity must be at least 1 for every item' using errcode = '22023';
    end if;

    select bs.id, bs.medicine_id, bs.batch_no, bs.quantity, bs.reserved_quantity,
           bs.selling_price, bs.purchase_price, bs.branch_id, m.name as medicine_name
    into v_stock
    from public.branch_stocks bs
    join public.medicines m on m.id = bs.medicine_id
    where bs.id = (v_item ->> 'branch_stock_id')::uuid
    for update of bs;

    if v_stock.id is null then
      raise exception 'That batch no longer exists' using errcode = '23503';
    end if;

    if v_stock.branch_id <> p_branch_id then
      raise exception 'Cannot sell stock belonging to another branch' using errcode = '42501';
    end if;

    if (v_stock.quantity - v_stock.reserved_quantity) < v_quantity then
      raise exception 'Only % of % left in batch %',
        (v_stock.quantity - v_stock.reserved_quantity), v_stock.medicine_name, v_stock.batch_no
        using errcode = '23514';
    end if;

    v_line_total := round(v_stock.selling_price * v_quantity, 2);
    v_subtotal := v_subtotal + v_line_total;

    insert into public.sale_items (
      sale_id, medicine_id, branch_stock_id, batch_no, quantity,
      unit_price, total_price, cost_price
    )
    values (
      v_sale_id, v_stock.medicine_id, v_stock.id, v_stock.batch_no, v_quantity,
      v_stock.selling_price, v_line_total, v_stock.purchase_price
    );

    update public.branch_stocks
    set quantity = quantity - v_quantity
    where id = v_stock.id;

    insert into public.stock_movements (
      branch_id, medicine_id, batch_no, type, quantity,
      reference_id, reference_type, created_by
    )
    values (
      p_branch_id, v_stock.medicine_id, v_stock.batch_no, 'sale', -v_quantity,
      v_sale_id, 'sale', v_profile_id
    );
  end loop;

  if v_discount > v_subtotal then
    raise exception 'Discount (%) cannot exceed the subtotal (%)', v_discount, v_subtotal
      using errcode = '22023';
  end if;

  -- Percent of a zero subtotal is undefined and also moot — nothing to
  -- discount, nothing to approve.
  v_discount_percent := case when v_subtotal > 0 then (v_discount / v_subtotal) * 100 else 0 end;

  select coalesce(
    (select s.value::numeric
     from public.settings s
     where s.key = 'max_discount_percent'
       and (s.branch_id = p_branch_id or s.branch_id is null)
     order by s.branch_id nulls last
     limit 1),
    100
  ) into v_max_discount_percent;

  if v_discount_percent > v_max_discount_percent then
    if p_discount_override_token is null then
      -- RAISE placeholders are positional, not printf format specifiers —
      -- rounded to whole percent here rather than via a %.0f that PL/pgSQL
      -- would not understand.
      raise exception 'This discount (% percent) needs a manager''s approval — the limit is % percent',
        round(v_discount_percent), round(v_max_discount_percent)
        using errcode = '42501';
    end if;

    -- Re-checked here rather than trusted from when it was minted: the token
    -- might belong to another branch, have already been spent by a racing
    -- request, or have simply expired while the till was busy.
    -- discount_overrides has no grant for `authenticated` at all — this
    -- SECURITY DEFINER call is the only way an ordinary session reaches it.
    if not public.consume_discount_override(p_discount_override_token, p_branch_id) then
      raise exception 'That approval has expired or was already used — ask a manager to approve again'
        using errcode = '42501';
    end if;
  end if;

  v_total := v_subtotal - v_discount;

  if p_payments is not null and jsonb_typeof(p_payments) = 'array' then
    for v_payment in select * from jsonb_array_elements(p_payments)
    loop
      if (v_payment ->> 'method') = 'due' then
        continue;
      end if;

      if (v_payment ->> 'amount')::numeric <= 0 then
        raise exception 'Payment amounts must be greater than zero' using errcode = '22023';
      end if;

      insert into public.payments (sale_id, branch_id, method, amount, reference)
      values (
        v_sale_id,
        p_branch_id,
        (v_payment ->> 'method')::public.payment_method,
        (v_payment ->> 'amount')::numeric,
        nullif(btrim(coalesce(v_payment ->> 'reference', '')), '')
      );

      v_paid := v_paid + (v_payment ->> 'amount')::numeric;
    end loop;
  end if;

  if v_paid > v_total then
    v_paid := v_total;
  end if;

  v_due := v_total - v_paid;

  if v_due > 0 and p_customer_id is null then
    raise exception 'Select a customer before leaving an amount due' using errcode = '22023';
  end if;

  update public.sales
  set subtotal = v_subtotal,
      discount = v_discount,
      total_amount = v_total,
      paid_amount = v_paid,
      due_amount = v_due
  where id = v_sale_id;

  if p_customer_id is not null then
    perform public.recompute_customer_balance(p_customer_id);
  end if;

  return v_sale_id;
end;
$function$;
