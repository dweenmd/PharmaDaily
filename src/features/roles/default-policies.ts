import { type UserRole } from "@/types";
import {
  APP_MODULES,
  type AppModuleKey,
  type ModulePermissions,
  type PermissionAction,
  type RolePermissionMatrix,
  type RolePermissions,
} from "./types";

/**
 * Creates an empty permission map for a single module.
 */
function createEmptyModulePerms(): ModulePermissions {
  return {
    view: false,
    create: false,
    edit: false,
    delete: false,
    approve: false,
    export: false,
  };
}

/**
 * Generates an all-true permission map respecting module capabilities.
 */
function createFullModulePerms(key: AppModuleKey): ModulePermissions {
  const mod = APP_MODULES.find((m) => m.key === key);
  const applicable = mod ? new Set<PermissionAction>(mod.applicableActions) : new Set<PermissionAction>();
  return {
    view: applicable.has("view"),
    create: applicable.has("create"),
    edit: applicable.has("edit"),
    delete: applicable.has("delete"),
    approve: applicable.has("approve"),
    export: applicable.has("export"),
  };
}

/**
 * Helper to build custom permissions map for a role.
 */
function buildRolePerms(
  customizer: (key: AppModuleKey) => Partial<ModulePermissions>,
): RolePermissions {
  const result = {} as RolePermissions;
  for (const mod of APP_MODULES) {
    const applicable = new Set<PermissionAction>(mod.applicableActions);
    const overrides = customizer(mod.key);
    const perms: ModulePermissions = {
      view: applicable.has("view") ? (overrides.view ?? false) : false,
      create: applicable.has("create") ? (overrides.create ?? false) : false,
      edit: applicable.has("edit") ? (overrides.edit ?? false) : false,
      delete: applicable.has("delete") ? (overrides.delete ?? false) : false,
      approve: applicable.has("approve") ? (overrides.approve ?? false) : false,
      export: applicable.has("export") ? (overrides.export ?? false) : false,
    };
    result[mod.key] = perms;
  }
  return result;
}

// ---------------------------------------------------------------------------
// 1. SUPER ADMIN: Master Root Permissions (100% across all 15 modules)
// ---------------------------------------------------------------------------
const SUPER_ADMIN_PERMISSIONS: RolePermissions = (() => {
  const res = {} as RolePermissions;
  for (const m of APP_MODULES) {
    res[m.key] = createFullModulePerms(m.key);
  }
  return res;
})();

// ---------------------------------------------------------------------------
// 2. BRANCH MANAGER: Complete Branch Operations & Staff Authority
// ---------------------------------------------------------------------------
const BRANCH_MANAGER_PERMISSIONS: RolePermissions = buildRolePerms((key) => {
  switch (key) {
    case "dashboard":
      return { view: true, export: true };
    case "pos":
      return { view: true, create: true, edit: true, approve: true, export: true };
    case "sales":
      return { view: true, create: true, edit: true, delete: false, approve: true, export: true };
    case "customers":
      return { view: true, create: true, edit: true, delete: false, export: true };
    case "medicines":
      return { view: true, create: true, edit: true, delete: false, export: true };
    case "stock":
      return { view: true, create: true, edit: true, delete: false, approve: true, export: true };
    case "purchases":
      return { view: true, create: true, edit: true, delete: false, approve: true, export: true };
    case "suppliers":
      return { view: true, create: true, edit: true, delete: false, export: true };
    case "transfers":
      return { view: true, create: true, edit: true, delete: false, approve: true, export: true };
    case "cash":
      return { view: true, create: true, edit: true, approve: true, export: true };
    case "expenses":
      return { view: true, create: true, edit: true, delete: false, approve: true, export: true };
    case "reports":
      return { view: true, export: true };
    case "audit":
      return { view: true, export: true };
    case "staff":
      return { view: true, create: true, edit: true, delete: false, approve: false, export: true };
    case "settings":
      return { view: true, edit: true, export: false };
    default:
      return {};
  }
});

// ---------------------------------------------------------------------------
// 3. PHARMACIST: Clinical Dispensing, Controlled Rx, Catalog, Expiry Audits
// ---------------------------------------------------------------------------
const PHARMACIST_PERMISSIONS: RolePermissions = buildRolePerms((key) => {
  switch (key) {
    case "dashboard":
      return { view: true, export: false };
    case "pos":
      return { view: true, create: true, edit: true, approve: true, export: true };
    case "sales":
      return { view: true, create: true, edit: true, delete: false, approve: true, export: true };
    case "customers":
      return { view: true, create: true, edit: true, delete: false, export: false };
    case "medicines":
      return { view: true, create: true, edit: true, delete: false, export: true };
    case "stock":
      return { view: true, create: false, edit: false, delete: false, approve: true, export: true };
    case "purchases":
      return { view: true, create: false, edit: false, delete: false, approve: false, export: false };
    case "suppliers":
      return { view: true, create: false, edit: false, delete: false, export: false };
    case "transfers":
      return { view: true, create: true, edit: false, delete: false, approve: false, export: false };
    case "cash":
      return { view: true, create: false, edit: false, approve: false, export: false };
    case "expenses":
      return { view: false, create: false, edit: false, delete: false, approve: false, export: false };
    case "reports":
      return { view: true, export: true };
    case "audit":
      return { view: false, export: false };
    case "staff":
      return { view: false, create: false, edit: false, delete: false, approve: false, export: false };
    case "settings":
      return { view: false, edit: false, export: false };
    default:
      return {};
  }
});

// ---------------------------------------------------------------------------
// 4. CASHIER: Front-Line Sales, Till Balancing, Customer Record Lookup
// ---------------------------------------------------------------------------
const CASHIER_PERMISSIONS: RolePermissions = buildRolePerms((key) => {
  switch (key) {
    case "dashboard":
      return { view: true, export: false };
    case "pos":
      return { view: true, create: true, edit: false, approve: false, export: true };
    case "sales":
      return { view: true, create: true, edit: false, delete: false, approve: false, export: true };
    case "customers":
      return { view: true, create: true, edit: false, delete: false, export: false };
    case "medicines":
      return { view: true, create: false, edit: false, delete: false, export: false };
    case "stock":
      return { view: true, create: false, edit: false, delete: false, approve: false, export: false };
    case "purchases":
      return { view: false, create: false, edit: false, delete: false, approve: false, export: false };
    case "suppliers":
      return { view: false, create: false, edit: false, delete: false, export: false };
    case "transfers":
      return { view: false, create: false, edit: false, delete: false, approve: false, export: false };
    case "cash":
      return { view: true, create: true, edit: false, approve: false, export: true };
    case "expenses":
      return { view: false, create: true, edit: false, delete: false, approve: false, export: false };
    case "reports":
      return { view: false, export: false };
    case "audit":
      return { view: false, export: false };
    case "staff":
      return { view: false, create: false, edit: false, delete: false, approve: false, export: false };
    case "settings":
      return { view: false, edit: false, export: false };
    default:
      return {};
  }
});

// ---------------------------------------------------------------------------
// 5. STOCK MANAGER: Inventory Logistics, Requisitions, Invoicing, Suppliers
// ---------------------------------------------------------------------------
const STOCK_MANAGER_PERMISSIONS: RolePermissions = buildRolePerms((key) => {
  switch (key) {
    case "dashboard":
      return { view: true, export: false };
    case "pos":
      return { view: false, create: false, edit: false, approve: false, export: false };
    case "sales":
      return { view: false, create: false, edit: false, delete: false, approve: false, export: false };
    case "customers":
      return { view: false, create: false, edit: false, delete: false, export: false };
    case "medicines":
      return { view: true, create: true, edit: true, delete: false, export: true };
    case "stock":
      return { view: true, create: true, edit: true, delete: false, approve: true, export: true };
    case "purchases":
      return { view: true, create: true, edit: true, delete: false, approve: true, export: true };
    case "suppliers":
      return { view: true, create: true, edit: true, delete: false, export: true };
    case "transfers":
      return { view: true, create: true, edit: true, delete: false, approve: true, export: true };
    case "cash":
      return { view: false, create: false, edit: false, approve: false, export: false };
    case "expenses":
      return { view: false, create: true, edit: false, delete: false, approve: false, export: false };
    case "reports":
      return { view: true, export: true };
    case "audit":
      return { view: false, export: false };
    case "staff":
      return { view: false, create: false, edit: false, delete: false, approve: false, export: false };
    case "settings":
      return { view: false, edit: false, export: false };
    default:
      return {};
  }
});

// ---------------------------------------------------------------------------
// ROLE METADATA & SECURITY TIERS
// ---------------------------------------------------------------------------

export type RoleSecurityMetadata = {
  role: UserRole;
  title: string;
  tier: string;
  level: number;
  scope: string;
  description: string;
  badgeClass: string;
  isImmutable?: boolean;
};

export const ROLE_SECURITY_METADATA: Record<UserRole, RoleSecurityMetadata> = {
  super_admin: {
    role: "super_admin",
    title: "Super Admin",
    tier: "Tier 1 · Root Authority",
    level: 1,
    scope: "Chainwide (All Outlets)",
    description: "Unrestricted master governance, cross-branch access, security policies, and billing overrides.",
    badgeClass: "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950",
    isImmutable: true,
  },
  branch_manager: {
    role: "branch_manager",
    title: "Branch Manager",
    tier: "Tier 2 · Outlet Authority",
    level: 2,
    scope: "Assigned Branch Scope",
    description: "Full management of local staff, sales registers, inventory receipts, expenses, and operational reports.",
    badgeClass: "bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 border-purple-300",
  },
  pharmacist: {
    role: "pharmacist",
    title: "Pharmacist",
    tier: "Tier 3 · Clinical Lead",
    level: 3,
    scope: "Assigned Branch Scope",
    description: "Prescription drug verification, controlled narcotics dispensing, clinical returns, and shelf-life audits.",
    badgeClass: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300",
  },
  cashier: {
    role: "cashier",
    title: "Cashier",
    tier: "Tier 4 · Terminal Operator",
    level: 4,
    scope: "Assigned Branch Scope",
    description: "Counter billing, customer payment collection, barcode POS checkout, and daily cash drawer reconciliation.",
    badgeClass: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border-blue-300",
  },
  stock_manager: {
    role: "stock_manager",
    title: "Stock Manager",
    tier: "Tier 3 · Inventory Lead",
    level: 3,
    scope: "Assigned Branch Scope",
    description: "Warehouse logistics, stock requisitions, supplier deliveries, transfer dispatch, and inventory counts.",
    badgeClass: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-300",
  },
};

export const DEFAULT_ROLE_POLICIES: RolePermissionMatrix = {
  super_admin: SUPER_ADMIN_PERMISSIONS,
  branch_manager: BRANCH_MANAGER_PERMISSIONS,
  pharmacist: PHARMACIST_PERMISSIONS,
  cashier: CASHIER_PERMISSIONS,
  stock_manager: STOCK_MANAGER_PERMISSIONS,
};

export function getDefaultRolePolicy(role: UserRole): RolePermissions {
  // Deep clone to prevent mutations
  return JSON.parse(JSON.stringify(DEFAULT_ROLE_POLICIES[role]));
}
