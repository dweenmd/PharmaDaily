"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/features/medicines/schemas";
import {
  changeOwnPasswordSchema,
  createStaffSchema,
  resetPasswordSchema,
  updateStaffSchema,
  type ChangeOwnPasswordValues,
  type CreateStaffInput,
  type UpdateStaffInput,
} from "@/features/staff/schemas";
import { canActOn, canAssign, checkLockout, type Authority } from "@/features/staff/authority";

/**
 * THE MOST DANGEROUS FILE IN THIS APPLICATION.
 *
 * Everything else leans on Row Level Security: a mistake in a query returns
 * fewer rows than intended, not more. These actions use the service-role
 * client, which bypasses RLS completely, so RLS will not catch anything here.
 * Every authorisation rule below is the only thing enforcing itself.
 *
 * They need the service role because creating a staff account means creating
 * an auth user, which only the admin API can do, and then setting a role and
 * branch — which the Phase 1 escalation guard deliberately forbids to anyone
 * except a service-role caller.
 *
 * The rules, and why each exists:
 *
 *   A super admin may do anything, at any branch.
 *
 *   A branch manager may create and edit staff AT THEIR OWN BRANCH ONLY, and
 *   only in the roles below their own. A manager who can mint another manager
 *   — or grant themselves a second, more privileged account — has escalated
 *   their own privileges, which is the thing the whole role model exists to
 *   prevent.
 *
 *   Nobody may deactivate themselves, which would lock them out mid-shift with
 *   no way back in.
 *
 *   The last active super admin cannot be deactivated or demoted. There would
 *   then be no one able to restore them, and the only way back would be the
 *   seed script and the service-role key.
 */

/** Resolves who is asking, and refuses anyone not entitled to manage staff. */
async function requireStaffAuthority(): Promise<Authority | { error: string }> {
  const profile = await getCurrentProfile();

  if (!profile) return { error: "You are not signed in." };

  if (profile.role === "super_admin") {
    return { actorId: profile.id, isSuperAdmin: true, branchId: null };
  }

  if (profile.role === "branch_manager" && profile.branch_id) {
    return { actorId: profile.id, isSuperAdmin: false, branchId: profile.branch_id };
  }

  return { error: "Only a super admin or branch manager can manage staff." };
}

/**
 * Best-effort origin for building an invite/reset link.
 *
 * A server action has no URL of its own to read, only the request that
 * invoked it. `origin` is what a browser-issued fetch sends; `host` is the
 * fallback for the rare client that omits it. Getting this wrong sends
 * someone an invite link that points at the wrong deployment, so it is worth
 * the two-header pass.
 */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;

  const host = h.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}

async function countActiveSuperAdmins(excludeProfileId?: string): Promise<number> {
  const admin = createAdminClient();

  let query = admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "super_admin")
    .eq("is_active", true)
    .is("deleted_at", null);

  if (excludeProfileId) query = query.neq("id", excludeProfileId);

  const { count } = await query;
  return count ?? 0;
}

// ---------------------------------------------------------------------------

export async function createStaffAction(input: CreateStaffInput): Promise<ActionResult<string>> {
  const authority = await requireStaffAuthority();
  if ("error" in authority) return { ok: false, error: authority.error };

  const parsed = createStaffSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid input", field: issue?.path[0] as string };
  }

  const { name, email, password, role, send_invite } = parsed.data;
  const branchId = role === "super_admin" ? null : parsed.data.branch_id;

  const refusal = canAssign(authority, role, branchId);
  if (refusal) return { ok: false, error: refusal };

  const admin = createAdminClient();

  const authResult = send_invite
    ? await admin.auth.admin.inviteUserByEmail(email, {
        data: { name },
        redirectTo: `${await siteOrigin()}/set-password`,
      })
    : await admin.auth.admin.createUser({
        email,
        password,
        // No inbox to confirm from on an internal deployment, and the
        // account is being created by someone who already trusts it.
        email_confirm: true,
        user_metadata: { name },
      });

  if (authResult.error || !authResult.data.user) {
    if (/already been registered|already exists/i.test(authResult.error?.message ?? "")) {
      return {
        ok: false,
        error: "Someone already has an account with that email.",
        field: "email",
      };
    }
    return { ok: false, error: send_invite ? "Could not send the invite." : "Could not create the account." };
  }

  const authUserId = authResult.data.user.id;

  // The handle_new_user trigger has made an inert profile — inactive, no
  // branch, no meaningful role. Provisioning it is a separate, deliberate
  // step, which is exactly why the trigger refuses to read role from signup
  // metadata. password_set is false only for the invite path: inviteUserByEmail
  // never sets a password, so the account is real but not yet usable until
  // they follow the link and choose one.
  const { data: profile, error: promoteError } = await admin
    .from("profiles")
    .update({ name, role, branch_id: branchId, is_active: true, password_set: !send_invite })
    .eq("auth_id", authUserId)
    .select("id")
    .single();

  if (promoteError || !profile) {
    // The auth user exists but has no usable profile. Removing it is better
    // than leaving an account nobody can sign into and nobody can see.
    await admin.auth.admin.deleteUser(authUserId);
    return { ok: false, error: "Could not set up the account. Nothing was created." };
  }

  revalidatePath("/staff");
  return { ok: true, data: profile.id };
}

// ---------------------------------------------------------------------------

export async function updateStaffAction(
  profileId: string,
  input: UpdateStaffInput,
): Promise<ActionResult<string>> {
  const authority = await requireStaffAuthority();
  if ("error" in authority) return { ok: false, error: authority.error };

  const parsed = updateStaffSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid input", field: issue?.path[0] as string };
  }

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("id, role, branch_id, is_active")
    .eq("id", profileId)
    .maybeSingle();

  if (!target) return { ok: false, error: "That account no longer exists." };

  const refusalOnTarget = canActOn(authority, target);
  if (refusalOnTarget) return { ok: false, error: refusalOnTarget };

  const { name, role, is_active: isActive } = parsed.data;
  const branchId = role === "super_admin" ? null : parsed.data.branch_id;

  const refusalOnNewRole = canAssign(authority, role, branchId);
  if (refusalOnNewRole) return { ok: false, error: refusalOnNewRole };

  const lockout = checkLockout(
    authority,
    target,
    { role, isActive },
    await countActiveSuperAdmins(profileId),
  );

  if (lockout) return { ok: false, error: lockout };

  const { error } = await admin
    .from("profiles")
    .update({ name, role, branch_id: branchId, is_active: isActive })
    .eq("id", profileId);

  if (error) {
    if (error.code === "23514") {
      return { ok: false, error: "Everyone except a super admin must belong to a branch." };
    }
    return { ok: false, error: "Could not save the changes." };
  }

  revalidatePath("/staff");
  return { ok: true, data: profileId };
}

// ---------------------------------------------------------------------------

export async function resetStaffPasswordAction(
  profileId: string,
  password: string,
): Promise<ActionResult> {
  const authority = await requireStaffAuthority();
  if ("error" in authority) return { ok: false, error: authority.error };

  const parsed = resetPasswordSchema.safeParse({ password });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid password" };
  }

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("id, auth_id, role, branch_id")
    .eq("id", profileId)
    .maybeSingle();

  if (!target) return { ok: false, error: "That account no longer exists." };

  const refusal = canActOn(authority, target);
  if (refusal) return { ok: false, error: refusal };

  const { error } = await admin.auth.admin.updateUserById(target.auth_id, {
    password: parsed.data.password,
  });

  if (error) return { ok: false, error: "Could not reset the password." };

  // An admin-set password is a working password whether or not the account
  // started as an invite — clears the "still waiting on an invite" state.
  await admin.from("profiles").update({ password_set: true }).eq("id", profileId);

  revalidatePath("/staff");
  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------------

/**
 * Sends a fresh invite email to an account still waiting on one.
 *
 * Invite links expire and inboxes lose things — refuses once password_set is
 * true so this cannot be used to silently re-invite (and reissue a link for)
 * someone who already has a working password.
 */
export async function resendInviteAction(profileId: string): Promise<ActionResult> {
  const authority = await requireStaffAuthority();
  if ("error" in authority) return { ok: false, error: authority.error };

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("id, auth_id, role, branch_id, password_set")
    .eq("id", profileId)
    .maybeSingle();

  if (!target) return { ok: false, error: "That account no longer exists." };
  if (target.password_set) {
    return { ok: false, error: "This account already has a password set." };
  }

  const refusal = canActOn(authority, target);
  if (refusal) return { ok: false, error: refusal };

  const { data: authUser, error: getUserError } = await admin.auth.admin.getUserById(
    target.auth_id,
  );

  if (getUserError || !authUser.user?.email) {
    return { ok: false, error: "Could not find that account's email." };
  }

  const { error } = await admin.auth.admin.inviteUserByEmail(authUser.user.email, {
    redirectTo: `${await siteOrigin()}/set-password`,
  });

  if (error) return { ok: false, error: "Could not resend the invite." };

  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------------

/**
 * Lets someone change their own password.
 *
 * Without this, whoever created an account knows its password indefinitely.
 * The current password is verified first — a live session is not proof that
 * the person at the keyboard is the account holder, which is the whole reason
 * a re-authentication step exists.
 */
export async function changeOwnPasswordAction(
  input: ChangeOwnPasswordValues,
): Promise<ActionResult> {
  const parsed = changeOwnPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid input", field: issue?.path[0] as string };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return { ok: false, error: "You are not signed in." };

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current,
  });

  if (reauthError) {
    return { ok: false, error: "That is not your current password.", field: "current" };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) return { ok: false, error: "Could not change your password." };

  return { ok: true, data: undefined };
}
