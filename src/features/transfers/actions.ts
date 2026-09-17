"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/features/medicines/schemas";

export const transferItemSchema = z.object({
  source_stock_id: z.string().uuid("Select a batch"),
  quantity: z.coerce.number().int("Whole units only").positive("Quantity must be at least 1"),
});

export const transferSchema = z.object({
  from_branch_id: z.string().uuid("Select the sending branch"),
  to_branch_id: z.string().uuid("Select the receiving branch"),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  items: z.array(transferItemSchema).min(1, "Add at least one item"),
});

export type TransferFormValues = z.input<typeof transferSchema>;
export type TransferInput = z.output<typeof transferSchema>;

function friendly(error: { code?: string; message?: string }): string {
  if (error.code === "42501") return "You do not have permission to do that.";
  // The transfer functions raise messages written for staff — "Batch B12 now
  // has only 3 available" — so they go straight to the screen.
  return error.message || "Something went wrong. Please try again.";
}

export async function createTransferAction(input: TransferInput): Promise<ActionResult<string>> {
  const parsed = transferSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid transfer", field: issue?.path.join(".") };
  }

  if (parsed.data.from_branch_id === parsed.data.to_branch_id) {
    return { ok: false, error: "A transfer needs two different branches.", field: "to_branch_id" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_stock_transfer", {
    p_from_branch_id: parsed.data.from_branch_id,
    p_to_branch_id: parsed.data.to_branch_id,
    p_items: parsed.data.items,
    p_notes: parsed.data.notes ?? undefined,
  });

  if (error) return { ok: false, error: friendly(error) };

  revalidatePath("/transfers");
  return { ok: true, data: data as unknown as string };
}

/** Dispatch: stock leaves the sending branch and is in transit. */
export async function approveTransferAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_stock_transfer", { p_transfer_id: id });

  if (error) return { ok: false, error: friendly(error) };

  revalidatePath("/transfers");
  revalidatePath(`/transfers/${id}`);
  revalidatePath("/stock");
  return { ok: true, data: undefined };
}

export async function rejectTransferAction(id: string, reason: string): Promise<ActionResult> {
  if (reason.trim().length < 3) {
    return { ok: false, error: "Give a reason for rejecting this transfer." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_stock_transfer", {
    p_transfer_id: id,
    p_reason: reason.trim(),
  });

  if (error) return { ok: false, error: friendly(error) };

  revalidatePath("/transfers");
  revalidatePath(`/transfers/${id}`);
  return { ok: true, data: undefined };
}

export type ReceiptLine = {
  item_id: string;
  received_quantity: number;
  shortfall_reason: string | null;
};

/**
 * Confirms arrival at the destination.
 *
 * Lines received in full need not be listed — the function treats anything
 * absent from the payload as complete, so the common case sends nothing.
 */
export async function receiveTransferAction(
  id: string,
  receipts: ReceiptLine[],
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("receive_stock_transfer", {
    p_transfer_id: id,
    p_receipts: receipts,
  });

  if (error) return { ok: false, error: friendly(error) };

  revalidatePath("/transfers");
  revalidatePath(`/transfers/${id}`);
  revalidatePath("/stock");
  return { ok: true, data: undefined };
}
