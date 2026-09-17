"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/features/medicines/schemas";

/**
 * Preset categories, so expenses can be grouped in a report rather than
 * arriving as a hundred spellings of "electricity".
 */
export const EXPENSE_CATEGORIES = [
  "Rent",
  "Salaries",
  "Utilities",
  "Transport",
  "Maintenance",
  "Licences & fees",
  "Marketing",
  "Other",
] as const;

export const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  description: z
    .string()
    .trim()
    .max(300)
    .nullable()
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();

  const { data, error } = await supabase
    .from("expenses")
    .insert({ ...parsed.data, branch_id: branchId, created_by: profile?.id ?? null })
    .select("id")
    .single();

  if (error) {
    if (error.code === "42501") {
      return { ok: false, error: "Only a branch manager can record expenses." };
    }
    return { ok: false, error: "Could not save the expense." };
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
