"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/features/medicines/schemas";
import { branchSchema, type BranchInput } from "@/features/branches/schemas";

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

  const { data, error } = await supabase
    .from("branches")
    .update(parsed.data)
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: friendly(error.code) };
  if (!data) return { ok: false, error: "Branch not found or you do not have permission to edit it." };

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

  const { data, error } = await supabase
    .from("branches")
    .update({ is_active: false })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: friendly(error.code) };
  if (!data) return { ok: false, error: "Branch not found or you do not have permission to deactivate it." };

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
