import { type UserRole } from "@/types";

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "approve"
  | "export";

export const PERMISSION_ACTIONS: {
  key: PermissionAction;
  label: string;
  description: string;
}[] = [
  { key: "view", label: "View", description: "Read-only access to records and views" },
  { key: "create", label: "Create", description: "Add new records or draft transactions" },
  { key: "edit", label: "Edit", description: "Modify existing non-posted records" },
  { key: "delete", label: "Delete", description: "Void, archive, or remove records" },
  { key: "approve", label: "Approve", description: "Authorize transfers, discounts, Rx, or expenses" },
  { key: "export", label: "Export", description: "Generate and download CSV, PDF, and print runs" },
];

export type AppModuleKey =
  | "dashboard"
  | "pos"
  | "sales"
  | "customers"
  | "medicines"
  | "stock"
  | "purchases"
  | "suppliers"
  | "transfers"
  | "cash"
  | "expenses"
  | "reports"
  | "audit"
  | "staff"
  | "settings";

export type ModuleCategory =
  | "Overview & POS"
  | "Inventory & Procurement"
  | "Cash & Accounting"
  | "Reports & Intelligence"
  | "System & Governance";

export type AppModuleDefinition = {
  key: AppModuleKey;
  label: string;
  category: ModuleCategory;
  description: string;
  route: string;
  /** Actions that are functionally applicable for this module (others rendered as disabled/not-applicable) */
  applicableActions: readonly PermissionAction[];
};

export const APP_MODULES: readonly AppModuleDefinition[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    category: "Overview & POS",
    description: "Operational overview, today's revenue, branch performance KPIs",
    route: "/dashboard",
    applicableActions: ["view", "export"],
  },
  {
    key: "pos",
    label: "POS",
    category: "Overview & POS",
    description: "Retail checkout terminal, barcode scanning, shift billing",
    route: "/pos",
    applicableActions: ["view", "create", "edit", "approve", "export"],
  },
  {
    key: "sales",
    label: "Sales",
    category: "Overview & POS",
    description: "Invoice history, sales returns, receipt reprints, customer billings",
    route: "/sales",
    applicableActions: ["view", "create", "edit", "delete", "approve", "export"],
  },
  {
    key: "customers",
    label: "Customers",
    category: "Overview & POS",
    description: "Patient CRM, credit accounts, prescription histories, contact info",
    route: "/customers",
    applicableActions: ["view", "create", "edit", "delete", "export"],
  },
  {
    key: "medicines",
    label: "Medicines",
    category: "Inventory & Procurement",
    description: "Central drug catalog, generic classifications, dosage, pricing",
    route: "/medicines",
    applicableActions: ["view", "create", "edit", "delete", "export"],
  },
  {
    key: "stock",
    label: "Stock",
    category: "Inventory & Procurement",
    description: "Branch inventory balances, batch tracking, FEFO aging, write-offs",
    route: "/stock",
    applicableActions: ["view", "create", "edit", "delete", "approve", "export"],
  },
  {
    key: "purchases",
    label: "Purchases",
    category: "Inventory & Procurement",
    description: "Supplier procurement orders, GRN receipt, batch cost verification",
    route: "/purchases",
    applicableActions: ["view", "create", "edit", "delete", "approve", "export"],
  },
  {
    key: "suppliers",
    label: "Suppliers",
    category: "Inventory & Procurement",
    description: "Pharmaceutical distributors, credit ledgers, contact directory",
    route: "/suppliers",
    applicableActions: ["view", "create", "edit", "delete", "export"],
  },
  {
    key: "transfers",
    label: "Transfers",
    category: "Inventory & Procurement",
    description: "Inter-branch stock requisitions, dispatch, receiving confirmation",
    route: "/transfers",
    applicableActions: ["view", "create", "edit", "delete", "approve", "export"],
  },
  {
    key: "cash",
    label: "Cash",
    category: "Cash & Accounting",
    description: "Till floats, cash drawers, daily shift closing, Z-reports",
    route: "/cash",
    applicableActions: ["view", "create", "edit", "approve", "export"],
  },
  {
    key: "expenses",
    label: "Expenses",
    category: "Cash & Accounting",
    description: "Operational costs (rent, utilities, wages, supplies, maintenance)",
    route: "/expenses",
    applicableActions: ["view", "create", "edit", "delete", "approve", "export"],
  },
  {
    key: "reports",
    label: "Reports",
    category: "Reports & Intelligence",
    description: "Sales analytics, inventory valuation, profit & loss, cash flow",
    route: "/reports",
    applicableActions: ["view", "export"],
  },
  {
    key: "audit",
    label: "Audit",
    category: "System & Governance",
    description: "Immutable security trail, staff actions, pricing alterations, logins",
    route: "/audit",
    applicableActions: ["view", "export"],
  },
  {
    key: "staff",
    label: "Staff",
    category: "System & Governance",
    description: "Employee directory, role assignment, branch access, credentials",
    route: "/staff",
    applicableActions: ["view", "create", "edit", "delete", "approve", "export"],
  },
  {
    key: "settings",
    label: "Settings",
    category: "System & Governance",
    description: "Chain & branch configuration, tax rates, invoice templates, thresholds",
    route: "/settings",
    applicableActions: ["view", "edit", "export"],
  },
] as const;

export type ModulePermissions = Record<PermissionAction, boolean>;

export type RolePermissions = Record<AppModuleKey, ModulePermissions>;

export type RolePermissionMatrix = Record<UserRole, RolePermissions>;
