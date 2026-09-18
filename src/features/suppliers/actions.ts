"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { supplierSchema, type SupplierInput } from "@/features/suppliers/schemas";
import { type ActionResult } from "@/features/medicines/schemas";

function friendlyError(code: string | undefined): string {
  if (code === "23505") return "A supplier with this name already exists.";
  if (code === "42501") return "You do not have permission to do that.";
  return "Could not save. Please try again.";
}

export async function createSupplierAction(input: SupplierInput): Promise<ActionResult<string>> {
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid input", field: issue?.path[0] as string };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) return { ok: false, error: friendlyError(error.code) };

  revalidatePath("/suppliers");
  return { ok: true, data: data.id };
}

export async function updateSupplierAction(
  id: string,
  input: SupplierInput,
): Promise<ActionResult<string>> {
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid input", field: issue?.path[0] as string };
  }

  const supabase = await createClient();

  // parsed.data cannot contain due_amount — the schema has no such field — so
  // there is no path from this form to the supplier ledger.
  const { data, error } = await supabase
    .from("suppliers")
    .update(parsed.data)
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: friendlyError(error.code) };
  if (!data) return { ok: false, error: "Supplier not found or you do not have permission to edit it." };

  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
  return { ok: true, data: id };
}

/**
 * Soft delete, and only when nothing is owed.
 *
 * Archiving a supplier the business still owes money to would hide a liability
 * from every report, so the outstanding balance has to be settled first.
 */
export async function archiveSupplierAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("due_amount")
    .eq("id", id)
    .maybeSingle();

  if (supplier && Number(supplier.due_amount) > 0) {
    return {
      ok: false,
      error: "This supplier still has an outstanding balance. Settle it before archiving.",
    };
  }

  const { data, error } = await supabase
    .from("suppliers")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: friendlyError(error.code) };
  if (!data) return { ok: false, error: "Supplier not found or you do not have permission to archive it." };

  revalidatePath("/suppliers");
  return { ok: true, data: undefined };
}
