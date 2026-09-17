"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { stockAdjustmentSchema, type StockAdjustmentInput } from "@/features/stock/schemas";
import { type ActionResult } from "@/features/medicines/schemas";

/**
 * Adjusts a batch.
 *
 * Delegates to create_stock_adjustment(), which writes the adjustment record,
 * moves the balance and appends to the ledger in one transaction, and takes a
 * row lock so two concurrent decreases cannot both subtract from the same
 * starting quantity.
 */
export async function createStockAdjustmentAction(
  input: StockAdjustmentInput,
): Promise<ActionResult<string>> {
  const parsed = stockAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Invalid input",
      field: issue?.path.join(".") ?? undefined,
    };
  }

  // The preset and the free-text explanation are stored as one string, so the
  // reason column always carries the full justification on its own.
  const reason = parsed.data.reason_detail
    ? `${parsed.data.reason}: ${parsed.data.reason_detail}`
    : parsed.data.reason;

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_stock_adjustment", {
    p_branch_id: parsed.data.branch_id,
    p_medicine_id: parsed.data.medicine_id,
    p_batch_no: parsed.data.batch_no,
    p_type: parsed.data.type,
    p_quantity: parsed.data.quantity,
    p_reason: reason,
  });

  if (error) {
    if (error.code === "42501") {
      return { ok: false, error: "You do not have permission to adjust stock." };
    }
    // create_stock_adjustment() raises messages written for staff — including
    // "Cannot remove N units — only M in stock" — so they pass through as-is.
    return { ok: false, error: error.message || "Could not adjust stock." };
  }

  revalidatePath("/stock");
  revalidatePath("/stock/low");
  return { ok: true, data: data as unknown as string };
}
