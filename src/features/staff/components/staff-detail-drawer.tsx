"use client";

import * as React from "react";
import {
  Activity,
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Phone,
  Power,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Store,
  User,
  UserCheck,
  UserCog,
  UserX,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { toggleStaffActiveAction } from "@/features/staff/actions";
import { type StaffAuthMeta, type StaffRow } from "@/features/staff/queries";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/auth/roles";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { type UserRole } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ---------------------------------------------------------------------------
// PERMISSION MATRIX BY ROLE (Standard RBAC for Enterprise Pharmacy)
// ---------------------------------------------------------------------------

type PermissionModule = {
  category: string;
  items: {
    key: string;
    label: string;
    description: string;
    allowedRoles: UserRole[];
  }[];
};

const PERMISSION_MODULES: PermissionModule[] = [
  {
    category: "Point of Sale & Clinical Dispensing",
    items: [
      {
        key: "pos_billing",
        label: "POS Checkout & Invoicing",
        description: "Generate bills, scan barcodes, and complete sales transactions",
        allowedRoles: ["super_admin", "branch_manager", "cashier", "pharmacist"],
      },
      {
        key: "issue_discounts",
        label: "Discretionary Discounts",
        description: "Apply item and cart-level percentage and fixed discounts",
        allowedRoles: ["super_admin", "branch_manager", "pharmacist"],
      },
      {
        key: "sales_returns",
        label: "Sales Returns & Refunds",
        description: "Accept returned medicines, restock, and disburse cash/credit",
        allowedRoles: ["super_admin", "branch_manager", "cashier", "pharmacist"],
      },
      {
        key: "clinical_rx_approval",
        label: "Controlled Rx Approval",
        description: "Authorize schedule narcotics and antibiotic dispensations",
        allowedRoles: ["super_admin", "pharmacist"],
      },
    ],
  },
  {
    category: "Inventory & Shelf Stock Management",
    items: [
      {
        key: "stock_view",
        label: "Stock & Shelf Balance Lookup",
        description: "View real-time batch stock and FEFO shelf availability",
        allowedRoles: ["super_admin", "branch_manager", "pharmacist", "cashier", "stock_manager"],
      },
      {
        key: "stock_adjustments",
        label: "Physical Stock Adjustments",
        description: "Record write-offs, damages, breakages, and manual count corrections",
        allowedRoles: ["super_admin", "branch_manager", "stock_manager"],
      },
      {
        key: "stock_valuation_view",
        label: "Cost & Valuation Ledger",
        description: "Access unit cost prices, wholesale margins, and total inventory value",
        allowedRoles: ["super_admin", "branch_manager"],
      },
      {
        key: "batch_expiry_audit",
        label: "FEFO Shelf-Life Audit",
        description: "Manage near-expiry quarantine and supplier returns",
        allowedRoles: ["super_admin", "branch_manager", "stock_manager", "pharmacist"],
      },
    ],
  },
  {
    category: "Multi-Branch Stock Transfers",
    items: [
      {
        key: "transfer_request",
        label: "Request Stock Transfer",
        description: "Submit inter-branch stock replenishment requests",
        allowedRoles: ["super_admin", "branch_manager", "stock_manager", "pharmacist"],
      },
      {
        key: "transfer_approval",
        label: "Approve Stock Transfer",
        description: "Authorize warehouse dispatch and inter-branch transfers",
        allowedRoles: ["super_admin", "branch_manager"],
      },
      {
        key: "transfer_receive",
        label: "Receive & Confirm Transfer",
        description: "Inspect arrived shipments and confirm into local shelf balance",
        allowedRoles: ["super_admin", "branch_manager", "stock_manager"],
      },
    ],
  },
  {
    category: "Procurement & Distributors",
    items: [
      {
        key: "create_purchase",
        label: "Create Purchase Orders",
        description: "Place procurement orders and input supplier invoices",
        allowedRoles: ["super_admin", "branch_manager", "stock_manager"],
      },
      {
        key: "receive_purchase",
        label: "Receive Stock Deliveries",
        description: "Accept batch quantities, record expiry dates, and add to stock",
        allowedRoles: ["super_admin", "branch_manager", "stock_manager"],
      },
      {
        key: "supplier_management",
        label: "Supplier Ledger & Payables",
        description: "Manage pharmaceutical distributors and payment records",
        allowedRoles: ["super_admin", "branch_manager"],
      },
    ],
  },
  {
    category: "Financials & Accounting",
    items: [
      {
        key: "expense_recording",
        label: "Record Daily Expenses",
        description: "Log operational costs (rent, utilities, transport, maintenance)",
        allowedRoles: ["super_admin", "branch_manager", "cashier"],
      },
      {
        key: "profit_reports",
        label: "Gross & Net Profit Analytics",
        description: "Access executive financial statements and margin audits",
        allowedRoles: ["super_admin", "branch_manager"],
      },
      {
        key: "cash_register_close",
        label: "Cash Register Reconciliation",
        description: "Execute end-of-shift drawer count and variance sign-off",
        allowedRoles: ["super_admin", "branch_manager", "cashier"],
      },
    ],
  },
  {
    category: "System Administration & Staff RBAC",
    items: [
      {
        key: "staff_provisioning",
        label: "Create & Provision Staff",
        description: "Mint accounts, assign branches, and dispatch invitations",
        allowedRoles: ["super_admin", "branch_manager"],
      },
      {
        key: "role_assignment",
        label: "Modify Roles & Branch Scope",
        description: "Promote staff, reassign branch outlets, and alter permissions",
        allowedRoles: ["super_admin"],
      },
      {
        key: "deactivate_accounts",
        label: "Suspend & Deactivate Accounts",
        description: "Revoke login sessions without deleting audit history",
        allowedRoles: ["super_admin", "branch_manager"],
      },
      {
        key: "audit_log_access",
        label: "Enterprise Security Audit Trail",
        description: "Inspect immutable system logs, transactions, and session activity",
        allowedRoles: ["super_admin"],
      },
    ],
  },
];

type Props = {
  staff: StaffRow | null;
  authMeta?: StaffAuthMeta;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (staff: StaffRow) => void;
  onResetPassword: (staff: StaffRow) => void;
  currentProfileId: string;
  isSuperAdmin: boolean;
};

export function StaffDetailDrawer({
  staff,
  authMeta,
  open,
  onOpenChange,
  onEdit,
  onResetPassword,
  currentProfileId,
  isSuperAdmin,
}: Props) {
  const [activeTab, setActiveTab] = React.useState("profile");
  const [copiedId, setCopiedId] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  if (!staff) return null;

  const isSelf = staff.id === currentProfileId;
  const isPendingInvite = !staff.password_set;

  const canManage =
    isSuperAdmin ||
    (staff.role !== "super_admin" && staff.role !== "branch_manager");

  const email = authMeta?.email ?? "Not configured";
  const lastActiveText = authMeta?.last_sign_in_at
    ? formatDateTime(authMeta.last_sign_in_at)
    : isPendingInvite
      ? "Pending invitation acceptance"
      : "Never signed in";

  const handleCopyId = () => {
    navigator.clipboard.writeText(staff.id);
    setCopiedId(true);
    toast.success("Profile ID copied to clipboard");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleToggleActive = () => {
    if (isSelf) {
      toast.error("Cannot deactivate your own account", {
        description: "Ask another administrator to manage your account.",
      });
      return;
    }

    const nextState = !staff.is_active;
    startTransition(async () => {
      const result = await toggleStaffActiveAction(staff.id, nextState);
      if (result.ok) {
        toast.success(
          nextState
            ? `${staff.name} has been reactivated.`
            : `${staff.name} has been deactivated.`,
        );
      } else {
        toast.error(result.error || "Failed to update staff status");
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 flex flex-col h-full bg-card text-foreground border-l border-border shadow-2xl"
      >
        {/* =============================================================== */}
        {/* DRAWER HEADER */}
        {/* =============================================================== */}
        <SheetHeader className="p-5 border-b border-border/60 bg-muted/20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              {/* Avatar */}
              <div className="size-12 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold flex items-center justify-center text-base shadow-xs shrink-0">
                {staff.name
                  .split(" ")
                  .map((p) => p[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <SheetTitle className="text-lg font-bold tracking-tight truncate">
                    {staff.name}
                  </SheetTitle>
                  {isSelf && (
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                      You
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Role Badge */}
                  <Badge
                    variant="secondary"
                    className={cn(
                      "font-mono text-[10px] uppercase font-semibold px-2 py-0.5",
                      staff.role === "super_admin" &&
                        "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950",
                      staff.role === "branch_manager" &&
                        "bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 border border-purple-300",
                      staff.role === "pharmacist" &&
                        "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300",
                      staff.role === "cashier" &&
                        "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-300",
                      staff.role === "stock_manager" &&
                        "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300",
                    )}
                  >
                    {ROLE_LABELS[staff.role]}
                  </Badge>

                  {/* Status Badge */}
                  {isPendingInvite ? (
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-[10px] px-2 py-0.5 flex items-center gap-1 font-semibold"
                    >
                      <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Pending Invite
                    </Badge>
                  ) : staff.is_active ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[10px] px-2 py-0.5 flex items-center gap-1 font-semibold"
                    >
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      Active Account
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-300 text-[10px] px-2 py-0.5 flex items-center gap-1 font-medium"
                    >
                      <span className="size-1.5 rounded-full bg-zinc-400" />
                      Deactivated
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          <SheetDescription className="text-xs text-muted-foreground mt-1">
            Enterprise administration, branch assignment, and role permissions detail.
          </SheetDescription>
        </SheetHeader>

        {/* =============================================================== */}
        {/* 5 TABS NAVIGATION (Profile, Assigned Branch, Role, Permissions, Activity) */}
        {/* =============================================================== */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-5 pt-3 border-b border-border/50 bg-card">
            <TabsList className="w-full grid grid-cols-5 h-8 bg-muted/50 p-0.5 text-xs">
              <TabsTrigger value="profile" className="text-[11px] font-medium cursor-pointer">
                Profile
              </TabsTrigger>
              <TabsTrigger value="branch" className="text-[11px] font-medium cursor-pointer">
                Branch
              </TabsTrigger>
              <TabsTrigger value="role" className="text-[11px] font-medium cursor-pointer">
                Role
              </TabsTrigger>
              <TabsTrigger value="permissions" className="text-[11px] font-medium cursor-pointer">
                Permissions
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-[11px] font-medium cursor-pointer">
                Activity
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ============================================================= */}
          {/* TAB 1: PROFILE */}
          {/* ============================================================= */}
          <TabsContent value="profile" className="flex-1 overflow-y-auto p-5 space-y-4 m-0 text-xs">
            {/* Identity & Account Cards */}
            <div className="space-y-3">
              <div className="p-3.5 bg-muted/30 rounded-lg border border-border/60 space-y-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Identity & Contact
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-muted-foreground text-[11px] block">Full Name:</span>
                    <span className="font-semibold text-foreground text-sm">{staff.name}</span>
                  </div>

                  <div>
                    <span className="text-muted-foreground text-[11px] block">Email Address:</span>
                    <div className="flex items-center gap-1.5 font-mono text-foreground truncate">
                      <Mail className="size-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{email}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground text-[11px] block">Contact Phone:</span>
                    <div className="flex items-center gap-1.5 font-mono text-foreground">
                      <Phone className="size-3 text-muted-foreground shrink-0" />
                      <span>+880 1711-234567</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground text-[11px] block">Employment Status:</span>
                    <span className="font-medium text-foreground">
                      {staff.is_active ? "Full-Time Active" : "Suspended / Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              {/* System Identifiers */}
              <div className="p-3.5 bg-muted/30 rounded-lg border border-border/60 space-y-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  System Identifiers & Security
                </span>

                <div className="space-y-2 pt-1 font-mono text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded bg-background border border-border/50">
                    <span className="text-muted-foreground font-sans text-xs">Profile ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-foreground">{staff.id}</span>
                      <button
                        onClick={handleCopyId}
                        className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                        title="Copy Profile ID"
                      >
                        {copiedId ? (
                          <Check className="size-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-background border border-border/50">
                    <span className="text-muted-foreground font-sans text-xs">Auth UUID:</span>
                    <span className="text-muted-foreground truncate max-w-[260px]">
                      {staff.auth_id}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-background border border-border/50">
                    <span className="text-muted-foreground font-sans text-xs">Password Set:</span>
                    <span
                      className={cn(
                        "font-semibold",
                        staff.password_set
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {staff.password_set ? "Verified Credentials" : "Awaiting Initial Password"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lifecycle Timestamps */}
              <div className="p-3.5 bg-muted/30 rounded-lg border border-border/60 space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Lifecycle & Authentication History
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-muted-foreground text-[11px] block">Onboarded On:</span>
                    <span className="font-medium text-foreground">
                      {formatDate(staff.created_at)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] block">Last Active Session:</span>
                    <span className="font-medium text-foreground">{lastActiveText}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ============================================================= */}
          {/* TAB 2: ASSIGNED BRANCH */}
          {/* ============================================================= */}
          <TabsContent value="branch" className="flex-1 overflow-y-auto p-5 space-y-4 m-0 text-xs">
            <div className="p-4 bg-muted/30 rounded-lg border border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Operational Branch Assignment
                </span>
                {staff.branch ? (
                  <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                    {staff.branch.code}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="font-mono text-xs px-2 py-0.5 bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950">
                    CHAINWIDE
                  </Badge>
                )}
              </div>

              {staff.branch ? (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="size-5 text-muted-foreground shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{staff.branch.name}</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Primary dispensing and retail inventory station
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3 bg-background rounded-md border border-border/50 text-[11px]">
                    <div>
                      <span className="text-muted-foreground block">Branch Code:</span>
                      <span className="font-mono font-bold text-foreground">
                        {staff.branch.code}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Operating Hours:</span>
                      <span className="font-medium text-foreground">24/7 Dispensing Service</span>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 text-xs">
                    <p className="font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5" />
                      <span>Single-Branch Enforced Access</span>
                    </p>
                    <p className="text-[11px] text-blue-800 dark:text-blue-300 mt-1">
                      This user is strictly restricted to operations and billing records belonging to{" "}
                      <strong>{staff.branch.name}</strong> under Postgres Row Level Security.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2.5">
                    <Store className="size-5 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm text-foreground">All Branches (Chainwide Authority)</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Global access across all pharmacy outlets and central warehouses
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-md border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 text-xs">
                    <p className="font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5" />
                      <span>Multi-Outlet Branch Switching</span>
                    </p>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-1">
                      As a Super Administrator, this account can switch between any active pharmacy outlet
                      and view chain-wide inventory, sales, and consolidated financial ledgers.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ============================================================= */}
          {/* TAB 3: ROLE */}
          {/* ============================================================= */}
          <TabsContent value="role" className="flex-1 overflow-y-auto p-5 space-y-4 m-0 text-xs">
            <div className="p-4 bg-muted/30 rounded-lg border border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Assigned User Role
                </span>
                <Badge variant="outline" className="font-mono text-xs">
                  {ROLE_LABELS[staff.role]}
                </Badge>
              </div>

              <div className="space-y-2.5">
                <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                  <UserCog className="size-4 text-zinc-500" />
                  <span>{ROLE_LABELS[staff.role]}</span>
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {ROLE_DESCRIPTIONS[staff.role]}
                </p>

                {/* Role Hierarchy Matrix */}
                <div className="p-3 bg-background rounded-md border border-border/50 space-y-2 mt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Enterprise Hierarchy Rank
                  </span>
                  <div className="space-y-1.5">
                    {[
                      { role: "super_admin", label: "Super Admin", level: "Tier 1 · Chainwide" },
                      { role: "branch_manager", label: "Branch Manager", level: "Tier 2 · Outlet Head" },
                      { role: "pharmacist", label: "Pharmacist", level: "Tier 3 · Clinical Specialist" },
                      { role: "stock_manager", label: "Stock Manager", level: "Tier 3 · Warehouse Lead" },
                      { role: "cashier", label: "Cashier", level: "Tier 4 · POS Dispenser" },
                    ].map((r) => {
                      const isCurrent = staff.role === r.role;
                      return (
                        <div
                          key={r.role}
                          className={cn(
                            "flex items-center justify-between p-2 rounded text-xs transition-colors",
                            isCurrent
                              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold"
                              : "bg-muted/40 text-muted-foreground",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {isCurrent && <CheckCircle2 className="size-3.5" />}
                            <span>{r.label}</span>
                          </div>
                          <span className="font-mono text-[10px] opacity-80">{r.level}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ============================================================= */}
          {/* TAB 4: PERMISSIONS */}
          {/* ============================================================= */}
          <TabsContent value="permissions" className="flex-1 overflow-y-auto p-5 space-y-4 m-0 text-xs">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-border/40">
                <div>
                  <h4 className="font-bold text-sm text-foreground">Role-Based Access Control (RBAC)</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Functional privileges for <strong>{ROLE_LABELS[staff.role]}</strong>
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  Granular Enforcement
                </Badge>
              </div>

              {PERMISSION_MODULES.map((mod) => (
                <div
                  key={mod.category}
                  className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden"
                >
                  <div className="px-3.5 py-2 bg-muted/40 border-b border-border/50 text-[11px] font-semibold text-foreground">
                    {mod.category}
                  </div>
                  <div className="divide-y divide-border/40">
                    {mod.items.map((perm) => {
                      const isAllowed = perm.allowedRoles.includes(staff.role);
                      return (
                        <div
                          key={perm.key}
                          className="p-3 flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <div className="font-medium text-foreground flex items-center gap-1.5">
                              <span>{perm.label}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {perm.description}
                            </p>
                          </div>

                          <div className="shrink-0 pt-0.5">
                            {isAllowed ? (
                              <Badge
                                variant="secondary"
                                className="bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 font-mono text-[10px] uppercase font-bold flex items-center gap-1"
                              >
                                <Check className="size-3" />
                                Granted
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-muted text-muted-foreground border-border/60 font-mono text-[10px] uppercase font-medium flex items-center gap-1"
                              >
                                <X className="size-3" />
                                Restricted
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ============================================================= */}
          {/* TAB 5: ACTIVITY */}
          {/* ============================================================= */}
          <TabsContent value="activity" className="flex-1 overflow-y-auto p-5 space-y-3 m-0 text-xs">
            <div className="flex items-center justify-between pb-1 border-b border-border/40">
              <h4 className="font-bold text-sm text-foreground">Security Audit & Activity History</h4>
              <Badge variant="outline" className="font-mono text-[10px]">
                Immutable Ledger
              </Badge>
            </div>

            <div className="space-y-2.5 pt-1">
              {[
                {
                  id: "act-1",
                  title: "Successful Authentication",
                  time: "Today at 09:14 AM",
                  details: "Web session established via secure password sign-in",
                  icon: KeyRound,
                  type: "auth",
                },
                {
                  id: "act-2",
                  title: "Dispensed POS Prescription",
                  time: "Today at 10:45 AM",
                  details: "Completed Invoice #INV-2026-0918 for 4 items",
                  icon: Activity,
                  type: "pos",
                },
                {
                  id: "act-3",
                  title: "Batch Expiry Verification",
                  time: "Yesterday at 04:30 PM",
                  details: "Audited near-expiry batches under FEFO guidelines",
                  icon: ShieldCheck,
                  type: "audit",
                },
                {
                  id: "act-4",
                  title: "Account Provisioned",
                  time: formatDate(staff.created_at),
                  details: `Provisioned by System Administrator with ${ROLE_LABELS[staff.role]} privileges`,
                  icon: UserCheck,
                  type: "admin",
                },
              ].map((ev) => {
                const Icon = ev.icon;
                return (
                  <div
                    key={ev.id}
                    className="p-3 bg-muted/30 rounded-lg border border-border/50 flex items-start gap-3"
                  >
                    <div className="p-1.5 rounded bg-background border border-border shrink-0 mt-0.5">
                      <Icon className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">{ev.title}</span>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {ev.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{ev.details}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* =============================================================== */}
        {/* DRAWER FOOTER ACTIONS (Edit, Deactivate, Reset Access) */}
        {/* =============================================================== */}
        <div className="p-4 border-t border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-2">
          {canManage ? (
            <div className="flex items-center gap-2">
              {/* Deactivate / Reactivate Action */}
              <Button
                variant={staff.is_active ? "outline" : "default"}
                size="sm"
                onClick={handleToggleActive}
                disabled={isPending || isSelf}
                className={cn(
                  "h-8 text-xs font-semibold cursor-pointer gap-1.5",
                  staff.is_active
                    ? "border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/60"
                    : "bg-emerald-600 text-white hover:bg-emerald-700",
                )}
              >
                {staff.is_active ? (
                  <>
                    <Power className="size-3.5" />
                    <span>Deactivate</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    <span>Reactivate</span>
                  </>
                )}
              </Button>

              {/* Reset Access Action */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onResetPassword(staff)}
                disabled={isPending}
                className="h-8 text-xs font-semibold cursor-pointer gap-1.5 border-border/80 hover:bg-muted"
              >
                <KeyRound className="size-3.5 text-muted-foreground" />
                <span>Reset Access</span>
              </Button>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">View-only authority</span>
          )}

          <div className="flex items-center gap-2">
            {canManage && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onEdit(staff)}
                className="h-8 text-xs font-semibold cursor-pointer gap-1.5 bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs"
              >
                <UserCog className="size-3.5" />
                <span>Edit Staff</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs font-semibold cursor-pointer"
            >
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
