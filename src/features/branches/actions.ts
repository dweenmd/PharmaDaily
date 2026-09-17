"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/features/medicines/schemas";

export const branchSchema = z.object({
  name: z.string().trim().min(1, "Branch name is required").max(200),
  // Feeds the invoice prefix, so it has to stay short, uppercase and free of
  // anything that would make an invoice number ambiguous.
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Use at least 2 characters")
    .max(10, "Keep it to 10 characters or fewer")
    .regex(/^[A-Z0-9]+$/, "Letters and digits only — it becomes the invoice prefix"),
  address: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+\-\s()]*$/, "Phone may contain only digits and + - ( ) characters")
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  is_active: z.boolean().default(true),
});

export type BranchFormValues = z.input<typeof branchSchema>;
export type BranchInput = z.output<typeof branchSchema>;

function friendly(code: string | undefined): string {
  if (code === "23505") return "Another branch already uses that code.";
  if (code === "42501") return "Only a super admin can manage branches.";
  return "Could not save. Please try again.";
}

export async function createBranchAction(input: BranchInput): Promise<ActionResult<string>> {
  const parsed = branchSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid input", field: issue?.path[0] as string };
  }

  const supabase = await createClient();

  // No role check here: the branches RLS policy grants writes to super admins
  // only, so an unauthorised caller is refused by the database rather than by
  // a check this code could forget.
  const { data, error } = await supabase.from("branches").insert(parsed.data).select("id").single();

  if (error) return { ok: false, error: friendly(error.code) };

  revalidatePath("/branches");
  return { ok: true, data: data.id };
}

export async function updateBranchAction(
  id: string,
  input: BranchInput,
): Promise<ActionResult<string>> {
  const parsed = branchSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid input", field: issue?.path[0] as string };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("branches")
    .update(parsed.data)
    .eq("id", id)
    .is("deleted_at", null);

  if (error) return { ok: false, error: friendly(error.code) };

  revalidatePath("/branches");
  revalidatePath(`/branches/${id}/edit`);
  return { ok: true, data: id };
}

/**
 * Deactivates a branch. Never deletes one.
 *
 * Every sale, purchase and stock movement references it, and the foreign keys
 * are ON DELETE RESTRICT precisely so that history cannot be orphaned.
 * Refusing while stock or staff remain is a softer version of the same rule:
 * a branch with inventory on its shelves has not finished closing.
 */
export async function deactivateBranchAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const [{ count: stockCount }, { count: staffCount }] = await Promise.all([
    supabase
      .from("branch_stocks")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", id)
      .gt("quantity", 0),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", id)
      .eq("is_active", true)
      .is("deleted_at", null),
  ]);

  if ((stockCount ?? 0) > 0) {
    return {
      ok: false,
      error: `This branch still holds ${stockCount} batches. Transfer or write off its stock first.`,
    };
  }

  if ((staffCount ?? 0) > 0) {
    return {
      ok: false,
      error: `${staffCount} active staff are assigned here. Move them to another branch first.`,
    };
  }

  const { error } = await supabase.from("branches").update({ is_active: false }).eq("id", id);

  if (error) return { ok: false, error: friendly(error.code) };

  revalidatePath("/branches");
  return { ok: true, data: undefined };
}

export async function reactivateBranchAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("branches").update({ is_active: true }).eq("id", id);

  if (error) return { ok: false, error: friendly(error.code) };

  revalidatePath("/branches");
  return { ok: true, data: undefined };
}
