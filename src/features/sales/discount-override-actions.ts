"use server";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createEphemeralClient } from "@/lib/supabase/ephemeral";
import { type ActionResult } from "@/features/medicines/schemas";

// Not exported — a value export from a "use server" file loses its real
// shape crossing into a Client Component (see the branches/transfers fix:
// zodResolver got a stripped reference instead of a real Zod schema). This
// schema is only ever used on the server, right here, so that never matters.
const requestSchema = z.object({
  branchId: z.string().uuid(),
  discountPercent: z.coerce.number().min(0).max(100),
  email: z.string().trim().min(1).email(),
  password: z.string().min(1),
});

export type RequestDiscountOverrideInput = z.input<typeof requestSchema>;

/**
 * Mints a one-time discount-approval token after checking a manager's actual
 * password.
 *
 * Deliberately does NOT sign in on the request's normal server client — that
 * would replace the cashier's own session cookie with the manager's, logging
 * the cashier out mid-sale. `createEphemeralClient()` checks the password
 * without persisting anything, and once identity is confirmed the SERVICE
 * ROLE client (already trusted, already used elsewhere in this codebase for
 * privileged writes) inserts the token — discount_overrides itself has no
 * grant for `authenticated` at all, so this is the only way one gets minted.
 */
export async function requestDiscountOverrideAction(
  input: RequestDiscountOverrideInput,
): Promise<ActionResult<{ token: string; approverName: string }>> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Enter the manager's email and password." };
  }

  const { branchId, discountPercent, email, password } = parsed.data;

  const ephemeral = createEphemeralClient();
  const { data: signIn, error: signInError } = await ephemeral.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signIn.user) {
    return { ok: false, error: "Incorrect email or password.", field: "password" };
  }

  const admin = createAdminClient();

  const { data: approver } = await admin
    .from("profiles")
    .select("id, name, role, branch_id, is_active")
    .eq("auth_id", signIn.user.id)
    .is("deleted_at", null)
    .maybeSingle();

  const isEligible =
    approver?.is_active &&
    (approver.role === "super_admin" ||
      (approver.role === "branch_manager" && approver.branch_id === branchId));

  if (!approver || !isEligible) {
    return {
      ok: false,
      error: "That account cannot approve discounts at this branch.",
      field: "email",
    };
  }

  const { data: row, error: insertError } = await admin
    .from("discount_overrides")
    .insert({
      branch_id: branchId,
      approved_by: approver.id,
      requested_discount_percent: discountPercent,
    })
    .select("id")
    .single();

  if (insertError || !row) {
    return { ok: false, error: "Could not record the approval." };
  }

  return { ok: true, data: { token: row.id, approverName: approver.name } };
}
