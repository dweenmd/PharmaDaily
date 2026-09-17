"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/features/medicines/schemas";
import { type CashMovementType } from "@/types";

function friendly(error: { code?: string; message?: string }): string {
  if (error.code === "42501") return "Your role is not permitted to operate the till.";
  // The cash functions raise messages with the actual figures in them —
  // "The drawer is out by 340" — which is what the person closing needs.
  return error.message || "Something went wrong. Please try again.";
}

export async function openSessionAction(
  branchId: string,
  openingFloat: number,
  notes: string | null,
): Promise<ActionResult<string>> {
  if (openingFloat < 0) return { ok: false, error: "Opening float cannot be negative." };

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("open_cash_session", {
    p_branch_id: branchId,
    p_opening_float: openingFloat,
    p_notes: notes ?? undefined,
  });

  if (error) return { ok: false, error: friendly(error) };

  revalidatePath("/cash");
  return { ok: true, data: data as unknown as string };
}

/**
 * Closes the till.
 *
 * The variance is computed inside the database in the same transaction as the
 * close, so the expected figure cannot drift between being shown on screen and
 * being committed — a sale rung up while the cashier was counting would
 * otherwise make the reconciliation wrong the moment it was saved.
 */
export async function closeSessionAction(
  sessionId: string,
  countedCash: number,
  varianceReason: string | null,
): Promise<ActionResult<number>> {
  if (countedCash < 0) return { ok: false, error: "Enter the amount counted in the drawer." };

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("close_cash_session", {
    p_session_id: sessionId,
    p_counted_cash: countedCash,
    p_variance_reason: varianceReason ?? undefined,
  });

  if (error) return { ok: false, error: friendly(error) };

  revalidatePath("/cash");
  return { ok: true, data: Number(data ?? 0) };
}

export async function recordCashMovementAction(
  sessionId: string,
  type: CashMovementType,
  amount: number,
  reason: string,
): Promise<ActionResult<string>> {
  if (amount <= 0) return { ok: false, error: "Amount must be greater than zero." };
  if (reason.trim().length < 3) return { ok: false, error: "Say what this cash is for." };

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("record_cash_movement", {
    p_session_id: sessionId,
    p_type: type,
    p_amount: amount,
    p_reason: reason.trim(),
  });

  if (error) return { ok: false, error: friendly(error) };

  revalidatePath("/cash");
  return { ok: true, data: data as unknown as string };
}
