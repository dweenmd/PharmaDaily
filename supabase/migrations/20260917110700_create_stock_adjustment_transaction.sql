-- ---------------------------------------------------------------------------
-- Phase 2 / 8 — create_stock_adjustment()
--
-- Corrects a batch's quantity when the shelf and the system disagree: breakage,
-- theft, an expired strip pulled from sale, a miscount at receipt.
--
-- Same reasoning as create_purchase(): the adjustment record, the balance
-- change and the ledger entry have to commit together, so they live in one
-- function and therefore one transaction. SECURITY INVOKER keeps RLS in force.
-- ---------------------------------------------------------------------------

create or replace function public.create_stock_adjustment(
  p_branch_id uuid,
  p_medicine_id uuid,
  p_batch_no text,
  p_type public.stock_adjustment_type,
  p_quantity integer,
  p_reason text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_adjustment_id uuid;
  v_current_quantity integer;
  v_signed_quantity integer;
  v_batch text := btrim(p_batch_no);
begin
  if not public.can_manage_catalogue() then
    raise exception 'You are not allowed to adjust stock'
      using errcode = '42501';
  end if;

  select p.id into v_profile_id
  from public.profiles p
  where p.auth_id = (select auth.uid())
    and p.is_active = true
    and p.deleted_at is null;

  if v_profile_id is null then
    raise exception 'No active profile for the current user'
      using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Adjustment quantity must be greater than zero'
      using errcode = '22023';
  end if;

  if length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'A reason is required for every stock adjustment'
      using errcode = '22023';
  end if;

  -- FOR UPDATE locks the batch row for the rest of the transaction. Without it
  -- two concurrent decreases could both read the same starting quantity and
  -- each subtract from it, letting the total go further down than there was
  -- stock — the classic lost-update race.
  select bs.quantity into v_current_quantity
  from public.branch_stocks bs
  where bs.branch_id = p_branch_id
    and bs.medicine_id = p_medicine_id
    and bs.batch_no = v_batch
  for update;

  if v_current_quantity is null then
    raise exception 'No stock row for that medicine and batch at this branch'
      using errcode = '23503';
  end if;

  v_signed_quantity := case p_type
    when 'increase' then p_quantity
    when 'decrease' then -p_quantity
  end;

  if v_current_quantity + v_signed_quantity < 0 then
    raise exception 'Cannot remove % units — only % in stock', p_quantity, v_current_quantity
      using errcode = '23514';
  end if;

  insert into public.stock_adjustments (
    branch_id, medicine_id, batch_no, type, quantity, reason, created_by
  )
  values (
    p_branch_id, p_medicine_id, v_batch, p_type, p_quantity, btrim(p_reason), v_profile_id
  )
  returning id into v_adjustment_id;

  update public.branch_stocks
  set quantity = quantity + v_signed_quantity
  where branch_id = p_branch_id
    and medicine_id = p_medicine_id
    and batch_no = v_batch;

  insert into public.stock_movements (
    branch_id, medicine_id, batch_no, type, quantity,
    reference_id, reference_type, created_by
  )
  values (
    p_branch_id, p_medicine_id, v_batch, 'adjustment', v_signed_quantity,
    v_adjustment_id, 'stock_adjustment', v_profile_id
  );

  return v_adjustment_id;
end;
$$;

revoke execute on function public.create_stock_adjustment(
  uuid, uuid, text, public.stock_adjustment_type, integer, text
) from public, anon;

grant execute on function public.create_stock_adjustment(
  uuid, uuid, text, public.stock_adjustment_type, integer, text
) to authenticated;

comment on function public.create_stock_adjustment(
  uuid, uuid, text, public.stock_adjustment_type, integer, text
) is
  'Adjusts a batch atomically: adjustment record, balance change and ledger entry. Locks the batch row against concurrent updates.';
