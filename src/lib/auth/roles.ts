import { type UserRole } from "@/types";

export const USER_ROLES = [
  "super_admin",
  "branch_manager",
  "cashier",
  "stock_manager",
  "pharmacist",
] as const satisfies readonly UserRole[];

/** Human-readable labels for badges, dropdowns and the user menu. */
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  branch_manager: "Branch Manager",
  cashier: "Cashier",
  stock_manager: "Stock Manager",
  pharmacist: "Pharmacist",
};

/**
 * Short descriptions of what each role is for. Shown in admin screens when
 * assigning a role, so whoever is provisioning staff does not have to guess.
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin: "Full access to every branch, report and setting.",
  branch_manager: "Manages stock, sales and staff for their own branch.",
  cashier: "Runs billing and sales at their own branch.",
  stock_manager: "Manages stock and transfer requests for their own branch.",
  pharmacist: "Approves prescription and controlled-drug sales.",
};

export function isSuperAdmin(role: UserRole | null | undefined): boolean {
  return role === "super_admin";
}

/**
 * Can this role see and switch between branches?
 *
 * UI affordance only — the database answers the same question independently
 * through the `branches` RLS policies, so hiding the switcher is convenience,
 * not protection.
 */
export function canSwitchBranch(role: UserRole | null | undefined): boolean {
  return isSuperAdmin(role);
}

/** Can this role create, edit or deactivate branches? (Phase 5 UI.) */
export function canManageBranches(role: UserRole | null | undefined): boolean {
  return isSuperAdmin(role);
}

/** Can this role approve an incoming stock transfer? (Phase 5 UI.) */
export function canApproveTransfers(role: UserRole | null | undefined): boolean {
  return role === "super_admin" || role === "branch_manager";
}
