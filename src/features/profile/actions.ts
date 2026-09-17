"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { updateOwnNameSchema, type UpdateOwnNameInput } from "@/features/profile/schemas";
import { type ActionResult } from "@/features/medicines/schemas";

/**
 * Lets someone change how their own name is shown — not their role, branch or
 * status. The `profiles_update_self` RLS policy and the escalation trigger
 * already draw exactly this line: `name` is one of the few columns a
 * self-update is allowed to touch, so nothing extra needs checking here.
 */
export async function updateOwnNameAction(input: UpdateOwnNameInput): Promise<ActionResult> {
  const parsed = updateOwnNameSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid name" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "You are not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ name: parsed.data.name })
    .eq("auth_id", user.id);

  if (error) return { ok: false, error: "Could not save your name." };

  revalidatePath("/profile");
  revalidatePath("/staff");
  return { ok: true, data: undefined };
}
