-- ---------------------------------------------------------------------------
-- Phase 4 / 1 — capture cost of goods at the moment of sale
--
-- Found while designing the profit report. Profit is revenue minus the cost of
-- what was sold, and until now sale_items recorded only the revenue side. The
-- obvious workaround — joining back to branch_stocks for purchase_price —
-- gives the WRONG answer, because create_purchase() overwrites a batch's
-- prices when the same batch is received again at a new cost. Every historical
-- sale of that batch would be re-costed at today's price, silently restating
-- last month's profit.
--
-- Cost has to be frozen into the line at the moment of sale, the same way
-- unit_price already is. This is the standard accounting treatment: a sale
-- records what the item cost when it left the shelf, not what it costs now.
-- ---------------------------------------------------------------------------

alter table public.sale_items
  add column cost_price numeric(12, 2) not null default 0;

-- Backfill from current batch prices. Approximate by definition — the true
-- figure at the time was not recorded — so it is done once, explicitly, rather
-- than pretending the history is exact.
update public.sale_items si
set cost_price = coalesce(bs.purchase_price, 0)
from public.branch_stocks bs
where bs.id = si.branch_stock_id
  and si.cost_price = 0;

alter table public.sale_items
  add constraint sale_items_cost_price_non_negative check (cost_price >= 0);

comment on column public.sale_items.cost_price is
  'Cost of goods at the moment of sale, frozen. Never re-derived from branch_stocks, whose prices change when a batch is restocked.';

-- ---------------------------------------------------------------------------
-- create_sale() now records it. Everything else is unchanged.
-- ---------------------------------------------------------------------------
create or replace function public.create_sale(
  p_branch_id uuid,
  p_customer_id uuid,
  p_discount numeric,
  p_items jsonb,
  p_payments jsonb,
  p_sale_date date default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_sale_id uuid;
  v_invoice_no text;
  v_subtotal numeric(14, 2) := 0;
  v_discount numeric(14, 2) := coalesce(p_discount, 0);
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

  if v_due > 0 then
    update public.customers
    set due_amount = due_amount + v_due
    where id = p_customer_id;

    if not found then
      raise exception 'Customer not found' using errcode = '23503';
    end if;
  end if;

  return v_sale_id;
end;
$$;
