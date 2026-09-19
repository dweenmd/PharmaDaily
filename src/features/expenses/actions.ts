"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { type ActionResult } from "@/features/medicines/schemas";
import { expenseSchema, type ExpenseInput } from "@/features/expenses/schemas";

export async function createExpenseAction(
  branchId: string,
  input: ExpenseInput,
): Promise<ActionResult<string>> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid input", field: issue?.path[0] as string };
  }

  const supabase = await createClient();
  const profile = await getCurrentProfile();

  // Combine description, payment method, notes, and attachment info for storage
  const metadataParts: string[] = [];
  if (parsed.data.description) metadataParts.push(parsed.data.description);
  if (parsed.data.payment_method && parsed.data.payment_method !== "Cash") {
    metadataParts.push(`[Payment: ${parsed.data.payment_method}]`);
  }
  if (parsed.data.notes) {
    metadataParts.push(`[Notes: ${parsed.data.notes}]`);
  }
  if (parsed.data.attachment_name) {
    metadataParts.push(`[Attachment: ${parsed.data.attachment_name}]`);
  }

  const finalDescription = metadataParts.length > 0 ? metadataParts.join(" ") : null;

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      branch_id: branchId,
      category: parsed.data.category,
      description: finalDescription,
      amount: parsed.data.amount,
      expense_date: parsed.data.expense_date,
      created_by: profile?.id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "42501") {
      return { ok: false, error: "Only a branch manager or administrator can record expenses." };
    }
    return { ok: false, error: "Could not save the expense record." };
  }

  revalidatePath("/expenses");
  revalidatePath("/reports/profit");
  return { ok: true, data: data.id };
}

export async function archiveExpenseAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("expenses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: "Could not remove the expense." };

  revalidatePath("/expenses");
  revalidatePath("/reports/profit");
  return { ok: true, data: undefined };
}
