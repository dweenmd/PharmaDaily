"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/features/medicines/schemas";

export type OfflineSalePayload = {
  id: string;
  branch_id: string;
  occurred_at: string;
  payload: {
    customer_id: string | null;
    discount: number;
    items: { branch_stock_id: string; quantity: number }[];
    payments: { method: string; amount: number; reference: string | null }[];
  };
};

/**
 * Replays one offline sale.
 *
 * The queue id comes from the client and was minted before the sale was taken,
 * so calling this twice with the same id is safe: the database recognises an
 * already-synced entry and returns what it produced rather than selling the
 * items again.
 *
 * Errors are returned rather than thrown so the caller can keep going. One
 * unsellable sale — usually because the stock went while the till was offline
 * — must not block the queue behind it.
 */
export async function syncOfflineSaleAction(
  sale: OfflineSalePayload,
): Promise<ActionResult<string>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("sync_offline_sale", {
    p_queue_id: sale.id,
    p_branch_id: sale.branch_id,
    p_payload: sale.payload,
    p_occurred_at: sale.occurred_at,
  });

  if (error) {
    if (error.code === "42501") {
      return { ok: false, error: "You are not permitted to complete sales." };
    }
    // create_sale()'s own messages come through — "Only 3 of Napa left in
    // batch B12" is exactly what the person clearing the queue needs to read.
    return { ok: false, error: error.message || "Could not sync this sale." };
  }

  revalidatePath("/sales");
  revalidatePath("/stock");
  return { ok: true, data: data as unknown as string };
}
