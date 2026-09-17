"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  categorySchema,
  medicineSchema,
  type ActionResult,
  type CategoryInput,
  type MedicineInput,
} from "@/features/medicines/schemas";

/**
 * Turns a Postgres error into something a pharmacist can act on.
 *
 * Raw driver messages name constraints and columns, which is both unhelpful at
 * the counter and more than an untrusted caller should learn about the schema.
 */
function friendlyError(code: string | undefined, message: string): string {
  if (code === "23505") {
    if (message.includes("barcode")) return "Another medicine already uses this barcode.";
    if (message.includes("name")) return "A record with this name already exists.";
    return "This record already exists.";
  }
  if (code === "42501") return "You do not have permission to do that.";
  if (code === "23503") return "A referenced record no longer exists.";
  return "Could not save. Please try again.";
}

export async function createMedicineAction(input: MedicineInput): Promise<ActionResult<string>> {
  const parsed = medicineSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid input", field: issue?.path[0] as string };
  }

  const supabase = await createClient();

  // No role check here: the medicines RLS policy requires can_manage_catalogue()
  // on insert, so an unauthorised caller is refused by the database rather than
  // by a check this code could forget to make.
  const { data, error } = await supabase
    .from("medicines")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) return { ok: false, error: friendlyError(error.code, error.message) };

  revalidatePath("/medicines");
  return { ok: true, data: data.id };
}

export async function updateMedicineAction(
  id: string,
  input: MedicineInput,
): Promise<ActionResult<string>> {
  const parsed = medicineSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid input", field: issue?.path[0] as string };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("medicines")
    .update(parsed.data)
    .eq("id", id)
    .is("deleted_at", null);

  if (error) return { ok: false, error: friendlyError(error.code, error.message) };

  revalidatePath("/medicines");
  revalidatePath(`/medicines/${id}/edit`);
  return { ok: true, data: id };
}

/**
 * Soft delete. Stock, purchase history and past sales all reference this row,
 * so it is hidden rather than removed — the database does not grant DELETE on
 * this table at all.
 */
export async function archiveMedicineAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("medicines")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id);

  if (error) return { ok: false, error: friendlyError(error.code, error.message) };

  revalidatePath("/medicines");
  return { ok: true, data: undefined };
}

export async function createCategoryAction(input: CategoryInput): Promise<ActionResult<string>> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("medicine_categories")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) return { ok: false, error: friendlyError(error.code, error.message) };

  revalidatePath("/medicines");
  return { ok: true, data: data.id };
}
