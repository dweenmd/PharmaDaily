"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/features/medicines/schemas";

/**
 * Marks alerts read.
 *
 * "Read" is the only field a user may change — a trigger on the table rejects
 * an update that touches the message, type or scope, so an inconvenient alert
 * cannot be quietly reworded rather than acted on.
 */
export async function markNotificationsReadAction(ids?: string[]): Promise<ActionResult> {
  const supabase = await createClient();

  let query = supabase.from("notifications").update({ is_read: true }).eq("is_read", false);

  if (ids && ids.length > 0) query = query.in("id", ids);

  const { error } = await query;

  if (error) return { ok: false, error: "Could not update notifications." };

  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}
