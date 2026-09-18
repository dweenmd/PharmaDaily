"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { type ActionResult } from "@/features/medicines/schemas";

/**
 * Exact Categories requested:
 * Rent, Utilities, Salary, Transport, Maintenance, Supplies, Other
 */
export const EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Salary",
  "Transport",
  "Maintenance",
  "Supplies",
  "Other",
] as const;

export const PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "bKash / MFS",
  "Cheque",
  "Corporate Card",
  "Other",
] as const;

export const expenseSchema = z.object({
  category: z.preprocess(
    (val) => (val === "Salaries" ? "Salary" : val),
    z.enum(EXPENSE_CATEGORIES),
  ),
  description: z
    .string()
    .trim()
    .max(400)
    .nullable()
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  payment_method: z.string().optional().default("Cash"),
  notes: z
    .string()
    .trim()
    .max(400)
    .nullable()
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  attachment_name: z.string().nullable().optional(),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  expense_date: z.string().min(1, "Date is required"),
});

export type ExpenseFormValues = z.input<typeof expenseSchema>;
export type ExpenseInput = z.output<typeof expenseSchema>;

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
