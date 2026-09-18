"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { purchaseSchema, type PurchaseInput } from "@/features/purchases/schemas";
import { type ActionResult } from "@/features/medicines/schemas";

/**
 * Records a consignment.
 *
 * Everything happens inside the create_purchase() database function, in one
 * transaction: header, line items, stock, ledger entries and the supplier
 * balance. Doing it as separate PostgREST calls from here would risk a dropped
 * connection leaving stock on the shelf that the ledger does not know about,
 * and there is no way to roll that back afterwards.
 *
 * The function runs as the caller, so RLS decides whether this branch is one
 * they may write to. No branch check is repeated here.
 */
export async function createPurchaseAction(input: PurchaseInput): Promise<ActionResult<string>> {
  const parsed = purchaseSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Invalid input",
      field: issue?.path.join(".") ?? undefined,
    };
  }

  if (parsed.data.action_type === "draft") {
    return { ok: true, data: "draft" };
  }

  const supabase = await createClient();

  const notesParts = [
    parsed.data.payment_method ? `Method: ${parsed.data.payment_method}` : null,
    parsed.data.action_type === "receive" ? "Status: Received at Dock" : "Status: Completed",
    parsed.data.notes,
  ].filter(Boolean);

  const { data, error } = await supabase.rpc("create_purchase", {
    p_branch_id: parsed.data.branch_id,
    p_supplier_id: parsed.data.supplier_id,
    p_purchase_date: parsed.data.purchase_date,
    p_invoice_no: parsed.data.invoice_no,
    p_paid_amount: parsed.data.paid_amount,
    p_notes: notesParts.join(" | ") || undefined,
    p_items: parsed.data.items.map((item) => {
      const baseCost = Number(item.unit_cost ?? item.cost_price) || 0;
      const discountPct = Number(item.discount) || 0;
      const effectiveCost =
        discountPct > 0 ? Number((baseCost * (1 - discountPct / 100)).toFixed(2)) : baseCost;
      return {
        medicine_id: item.medicine_id,
        batch_no: item.batch_no.trim().toUpperCase(),
        expiry_date: item.expiry_date,
        quantity: Number(item.quantity),
        cost_price: effectiveCost,
        selling_price: Number(item.selling_price),
        mrp: Number(item.mrp || item.selling_price),
      };
    }),
  });

  if (error) {
    // The unique index on (supplier_id, invoice_no) is the guard against
    // receiving the same consignment twice and doubling the stock, so it gets
    // a message that says exactly that.
    if (error.code === "23505") {
      return {
        ok: false,
        error: "A purchase with this invoice number already exists for this supplier.",
        field: "invoice_no",
      };
    }
    if (error.code === "42501") {
      return { ok: false, error: "You do not have permission to record purchases." };
    }
    // Messages raised by create_purchase() itself are written for staff, so
    // they are safe and useful to pass through.
    return { ok: false, error: error.message || "Could not save the purchase." };
  }

  revalidatePath("/purchases");
  revalidatePath("/stock");
  return { ok: true, data: data as unknown as string };
}
