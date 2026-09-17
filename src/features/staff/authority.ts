import { MANAGER_ASSIGNABLE_ROLES } from "@/features/staff/schemas";
import { type UserRole } from "@/types";

/**
 * The authorisation rules for staff management, as pure functions.
 *
 * They live here, apart from the actions, for one reason: the actions run with
 * the service role, so Row Level Security catches nothing and these rules are
 * the ONLY thing standing between a branch manager and a super admin account.
 * Logic that load-bearing should be testable without standing up a request,
 * and a "use server" module cannot export anything but async actions.
 *
 * `npm run verify:staff` exercises every branch of both.
 */

export type Authority = {
  actorId: string;
  isSuperAdmin: boolean;
  /** NULL for a super admin, who is chain-wide. */
  branchId: string | null;
};

export type StaffTarget = {
  id: string;
  role: UserRole;
  branch_id: string | null;
  is_active?: boolean;
};

/**
 * May `authority` grant `role` at `branchId`?
 *
 * Returns a message to show, or null when allowed.
 */
export function canAssign(
  authority: Authority,
  role: UserRole,
  branchId: string | null,
): string | null {
  if (authority.isSuperAdmin) {
    // Everyone except a super admin is scoped to one branch. Without it,
    // branch-scoped RLS evaluates against NULL and silently matches nothing —
    // an account that can sign in and see an empty system.
    if (role !== "super_admin" && !branchId) {
      return "Everyone except a super admin must belong to a branch.";
    }
    return null;
  }

  // A manager who can mint another manager, or grant themselves a second and
  // more privileged account, has escalated their own privileges — which is the
  // thing the role model exists to prevent.
  if (!(MANAGER_ASSIGNABLE_ROLES as readonly string[]).includes(role)) {
    return "A branch manager can only create cashiers, stock managers and pharmacists.";
  }

  if (branchId !== authority.branchId) {
    return "You can only manage staff at your own branch.";
  }

  return null;
}

/** May `authority` act on this existing account? */
export function canActOn(authority: Authority, target: StaffTarget): string | null {
  if (authority.isSuperAdmin) return null;

  if (target.role === "super_admin" || target.role === "branch_manager") {
    return "You cannot manage an account at or above your own level.";
  }

  if (target.branch_id !== authority.branchId) {
    return "That account belongs to another branch.";
  }

  return null;
}

/**
 * Changes that would lock someone out or leave the system unadministrable.
 *
 * `remainingSuperAdmins` counts active super admins OTHER than the target.
 */
export function checkLockout(
  authority: Authority,
  target: StaffTarget,
  next: { role: UserRole; isActive: boolean },
  remainingSuperAdmins: number,
): string | null {
  if (target.id === authority.actorId && !next.isActive) {
    return "You cannot deactivate your own account.";
  }

  if (target.id === authority.actorId && authority.isSuperAdmin && next.role !== "super_admin") {
    return "You cannot remove your own super admin role.";
  }

  // Losing the last one means nobody can restore it, and the only way back is
  // the seed script and the service-role key.
  const losingSuperAdmin =
    target.role === "super_admin" &&
    target.is_active !== false &&
    (next.role !== "super_admin" || !next.isActive);

  if (losingSuperAdmin && remainingSuperAdmins === 0) {
    return "This is the only active super admin. Appoint another one first.";
  }

  return null;
}
