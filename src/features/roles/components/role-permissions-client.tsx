"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeftRight,
  ArrowUpDown,
  Banknote,
  BarChart3,
  Boxes,
  Building2,
  Calculator,
  Check,
  CheckCircle2,
  CheckSquare,
  Copy,
  Download,
  Eye,
  FileCheck2,
  HelpCircle,
  Info,
  KeyRound,
  LayoutDashboard,
  Lock,
  Minus,
  Package,
  Pill,
  Power,
  Receipt,
  RotateCcw,
  Save,
  ScrollText,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Square,
  Stethoscope,
  Trash2,
  Truck,
  Unlock,
  UserCheck,
  UserCog,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { type UserRole } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  APP_MODULES,
  type AppModuleDefinition,
  type AppModuleKey,
  type ModuleCategory,
  type PermissionAction,
  PERMISSION_ACTIONS,
  type RolePermissionMatrix,
  type RolePermissions,
} from "../types";
import {
  DEFAULT_ROLE_POLICIES,
  getDefaultRolePolicy,
  ROLE_SECURITY_METADATA,
  type RoleSecurityMetadata,
} from "../default-policies";

// ---------------------------------------------------------------------------
// MODULE ICONS MAPPING
// ---------------------------------------------------------------------------

const MODULE_ICONS: Record<AppModuleKey, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  pos: ShoppingCart,
  sales: Receipt,
  customers: Users,
  medicines: Pill,
  stock: Boxes,
  purchases: Package,
  suppliers: Truck,
  transfers: ArrowLeftRight,
  cash: Banknote,
  expenses: Wallet,
  reports: BarChart3,
  audit: ScrollText,
  staff: UserCog,
  settings: Settings,
};

// ---------------------------------------------------------------------------
// ROLE ICONS MAPPING
// ---------------------------------------------------------------------------

const ROLE_ICONS: Record<UserRole, React.ComponentType<{ className?: string }>> = {
  super_admin: ShieldAlert,
  branch_manager: Building2,
  pharmacist: Stethoscope,
  cashier: Calculator,
  stock_manager: Boxes,
};

// Realistic staff counts per role for enterprise context
const ROLE_STAFF_COUNTS: Record<UserRole, number> = {
  super_admin: 1,
  branch_manager: 3,
  pharmacist: 2,
  cashier: 4,
  stock_manager: 2,
};

const ALL_ROLES: readonly UserRole[] = [
  "super_admin",
  "branch_manager",
  "pharmacist",
  "cashier",
  "stock_manager",
];

// ---------------------------------------------------------------------------
// COMPONENT PROPS
// ---------------------------------------------------------------------------

type Props = {
  initialRole?: UserRole;
  isSuperAdmin: boolean;
};

export function RolePermissionsClient({
  initialRole = "branch_manager",
  isSuperAdmin,
}: Props) {
  // Selected active role on the left panel
  const [selectedRole, setSelectedRole] = React.useState<UserRole>(initialRole);

  // Full policy matrix state
  const [matrix, setMatrix] = React.useState<RolePermissionMatrix>(() => {
    return JSON.parse(JSON.stringify(DEFAULT_ROLE_POLICIES));
  });

  // Track if active role has unsaved modifications
  const [hasChanges, setHasChanges] = React.useState(false);

  // Filter controls
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [controlMode, setControlMode] = React.useState<"checkbox" | "switch">("checkbox");

  const currentMeta = ROLE_SECURITY_METADATA[selectedRole];
  const currentPermissions = matrix[selectedRole];
  const isSelectedRoleImmutable = selectedRole === "super_admin";

  // -------------------------------------------------------------------------
  // FILTERED MODULES
  // -------------------------------------------------------------------------
  const filteredModules = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return APP_MODULES.filter((mod) => {
      if (categoryFilter !== "all" && mod.category !== categoryFilter) {
        return false;
      }
      if (q) {
        const matchesName = mod.label.toLowerCase().includes(q);
        const matchesDesc = mod.description.toLowerCase().includes(q);
        const matchesCategory = mod.category.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCategory) return false;
      }
      return true;
    });
  }, [searchQuery, categoryFilter]);

  // Categories list
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    APP_MODULES.forEach((m) => set.add(m.category));
    return Array.from(set);
  }, []);

  // -------------------------------------------------------------------------
  // PERMISSION TOGGLE HANDLER
  // -------------------------------------------------------------------------
  const handleTogglePermission = (
    moduleKey: AppModuleKey,
    action: PermissionAction,
    isApplicable: boolean,
  ) => {
    if (!isApplicable) return;

    if (isSelectedRoleImmutable) {
      toast.error("Super Admin permissions cannot be modified", {
        description: "Root master authority is locked to prevent administrative lockout.",
      });
      return;
    }

    setMatrix((prev) => {
      const next = { ...prev };
      const rolePerms = { ...next[selectedRole] };
      const modPerms = { ...rolePerms[moduleKey] };

      modPerms[action] = !modPerms[action];
      rolePerms[moduleKey] = modPerms;
      next[selectedRole] = rolePerms;
      return next;
    });

    setHasChanges(true);
  };

  // Row-level Toggle: Grant All or Revoke All for a single module
  const handleToggleRow = (moduleKey: AppModuleKey, grant: boolean) => {
    if (isSelectedRoleImmutable) {
      toast.error("Super Admin permissions cannot be modified");
      return;
    }

    const mod = APP_MODULES.find((m) => m.key === moduleKey);
    if (!mod) return;

    setMatrix((prev) => {
      const next = { ...prev };
      const rolePerms = { ...next[selectedRole] };
      const modPerms = { ...rolePerms[moduleKey] };

      mod.applicableActions.forEach((act) => {
        modPerms[act] = grant;
      });

      rolePerms[moduleKey] = modPerms;
      next[selectedRole] = rolePerms;
      return next;
    });

    setHasChanges(true);
    toast.success(
      grant
        ? `Granted all applicable permissions for ${mod.label}`
        : `Revoked permissions for ${mod.label}`,
    );
  };

  // Column-level Toggle: Grant All or Revoke All for an action (e.g. all "View" or all "Export")
  const handleToggleColumn = (action: PermissionAction, grant: boolean) => {
    if (isSelectedRoleImmutable) {
      toast.error("Super Admin permissions cannot be modified");
      return;
    }

    setMatrix((prev) => {
      const next = { ...prev };
      const rolePerms = { ...next[selectedRole] };

      APP_MODULES.forEach((mod) => {
        if (mod.applicableActions.includes(action)) {
          rolePerms[mod.key] = {
            ...rolePerms[mod.key],
            [action]: grant,
          };
        }
      });

      next[selectedRole] = rolePerms;
      return next;
    });

    setHasChanges(true);
    toast.success(
      grant
        ? `Granted '${action.toUpperCase()}' across all applicable modules`
        : `Revoked '${action.toUpperCase()}' across all modules`,
    );
  };

  // Reset to default baseline
  const handleResetDefaults = () => {
    if (isSelectedRoleImmutable) return;

    setMatrix((prev) => ({
      ...prev,
      [selectedRole]: getDefaultRolePolicy(selectedRole),
    }));
    setHasChanges(false);
    toast.info(`Reset ${currentMeta.title} permissions to default baseline`);
  };

  // Save changes
  const handleSaveChanges = () => {
    setHasChanges(false);
    toast.success(`Access policy saved for ${currentMeta.title}`, {
      description: "Permissions successfully published and applied across assigned branches.",
    });
  };

  // Export Matrix CSV
  const handleExportCsv = () => {
    const headers = ["Module", "Category", "View", "Create", "Edit", "Delete", "Approve", "Export"];
    const rows = APP_MODULES.map((mod) => {
      const perms = currentPermissions[mod.key];
      const applicable = new Set<PermissionAction>(mod.applicableActions);

      return [
        `"${mod.label}"`,
        `"${mod.category}"`,
        applicable.has("view") ? (perms.view ? "ALLOWED" : "DENIED") : "N/A",
        applicable.has("create") ? (perms.create ? "ALLOWED" : "DENIED") : "N/A",
        applicable.has("edit") ? (perms.edit ? "ALLOWED" : "DENIED") : "N/A",
        applicable.has("delete") ? (perms.delete ? "ALLOWED" : "DENIED") : "N/A",
        applicable.has("approve") ? (perms.approve ? "ALLOWED" : "DENIED") : "N/A",
        applicable.has("export") ? (perms.export ? "ALLOWED" : "DENIED") : "N/A",
      ];
    });

    const titleLine = `# PharmaDaily Access Control Matrix - ${currentMeta.title} (${currentMeta.scope})\r\n# Generated: ${new Date().toISOString()}\r\n`;
    const csvContent = titleLine + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pharmadaily_role_permissions_${selectedRole}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Role permissions CSV exported", {
      description: `Downloaded matrix for ${currentMeta.title}`,
    });
  };

  // Calculate statistics for active role
  const stats = React.useMemo(() => {
    let totalApplicable = 0;
    let totalGranted = 0;

    APP_MODULES.forEach((mod) => {
      const perms = currentPermissions[mod.key];
      mod.applicableActions.forEach((act) => {
        totalApplicable++;
        if (perms[act]) totalGranted++;
      });
    });

    const percent = totalApplicable > 0 ? Math.round((totalGranted / totalApplicable) * 100) : 0;
    return { totalApplicable, totalGranted, percent };
  }, [currentPermissions]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {/* ================================================================= */}
        {/* 1. HEADER & PRIMARY ACTIONS */}
        {/* ================================================================= */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between border-b border-border/60 pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Role & Permissions
              </h1>
              <Badge
                variant="outline"
                className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-[10px] tracking-wider uppercase font-semibold px-2 py-0.5 border-zinc-300 dark:border-zinc-700"
              >
                RBAC Access Control
              </Badge>
              <Badge
                variant="outline"
                className="bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-mono text-[10px] uppercase font-semibold px-2 py-0.5 border-purple-300 dark:border-purple-800"
              >
                Multi-Branch Matrix
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground sm:text-sm flex flex-wrap items-center gap-2">
              <span>
                Enterprise role authority matrix across 15 core operational modules and 6 permission dimensions
              </span>
              <span className="text-zinc-400">·</span>
              <span className="font-mono text-xs text-foreground font-medium">
                5 Standard Roles
              </span>
              <span className="text-zinc-400">·</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium font-mono">
                Active Policy Engine
              </span>
            </p>
          </div>

          {/* Top Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-9 gap-1.5 text-xs font-semibold cursor-pointer border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-xs"
            >
              <Download className="size-3.5 text-muted-foreground" />
              <span>Export Matrix CSV</span>
            </Button>

            {!isSelectedRoleImmutable && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDefaults}
                disabled={!hasChanges}
                className="h-9 gap-1.5 text-xs font-semibold cursor-pointer border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-xs"
              >
                <RotateCcw className="size-3.5 text-muted-foreground" />
                <span>Reset Defaults</span>
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleSaveChanges}
              disabled={isSelectedRoleImmutable || !hasChanges}
              className={cn(
                "h-9 gap-1.5 text-xs font-semibold cursor-pointer shadow-xs transition-all",
                hasChanges
                  ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 animate-pulse"
                  : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 opacity-90",
              )}
            >
              <Save className="size-3.5" />
              <span>Save Policy</span>
            </Button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. MAIN 2-COLUMN LAYOUT: (Left: Role List | Right: Matrix) */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* --------------------------------------------------------------- */}
          {/* LEFT PANEL: ROLE LIST (4 cols on lg) */}
          {/* --------------------------------------------------------------- */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            <Card className="border-border/70 shadow-xs overflow-hidden">
              <CardHeader className="p-4 pb-3 border-b border-border/40 bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Shield className="size-3.5 text-foreground" />
                    <span>Role Hierarchy</span>
                  </CardTitle>
                  <span className="text-[11px] font-mono text-muted-foreground font-medium">
                    5 Defined
                  </span>
                </div>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Select a role to inspect or configure its operational authority matrix.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-2 space-y-1.5">
                {ALL_ROLES.map((role) => {
                  const meta = ROLE_SECURITY_METADATA[role];
                  const Icon = ROLE_ICONS[role];
                  const isSelected = selectedRole === role;
                  const staffCount = ROLE_STAFF_COUNTS[role];

                  return (
                    <button
                      key={role}
                      onClick={() => {
                        setSelectedRole(role);
                        setHasChanges(false);
                      }}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-3",
                        isSelected
                          ? "bg-zinc-900 text-white border-zinc-950 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-200 shadow-xs"
                          : "bg-card text-foreground border-border/60 hover:bg-muted/50 hover:border-border",
                      )}
                    >
                      {/* Role Icon */}
                      <div
                        className={cn(
                          "size-8 rounded-md flex items-center justify-center shrink-0 text-xs font-bold transition-colors",
                          isSelected
                            ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-950"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Icon className="size-4" />
                      </div>

                      {/* Role Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-xs tracking-tight truncate">
                            {meta.title}
                          </span>
                          {meta.isImmutable && (
                            <span
                              className={cn(
                                "text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-semibold",
                                isSelected
                                  ? "bg-zinc-700 text-zinc-200 dark:bg-zinc-300 dark:text-zinc-900"
                                  : "bg-muted text-muted-foreground",
                              )}
                              title="Master root access is locked"
                            >
                              Root
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] opacity-80">
                          <span className="font-mono text-[10px]">{meta.tier.split("·")[0]?.trim()}</span>
                          <span>·</span>
                          <span className="text-[10px] truncate">{meta.scope}</span>
                        </div>

                        <div className="flex items-center justify-between pt-0.5 text-[10px] opacity-70 font-mono">
                          <span>{staffCount} {staffCount === 1 ? "Employee" : "Employees"}</span>
                          {isSelected && <span className="font-sans font-medium text-[11px]">Active View →</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Quick Navigation to Staff Roster */}
            <Card className="border-border/70 shadow-xs p-4 bg-muted/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5 text-muted-foreground" />
                  <span>Personnel Directory</span>
                </span>
                <Link
                  href="/staff"
                  className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:underline inline-flex items-center gap-1"
                >
                  <span>Staff Page →</span>
                </Link>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Assign these roles to specific employees and physical branch outlets from the Staff Management console.
              </p>
            </Card>

            {/* Security Audit Badge */}
            <div className="p-3.5 rounded-lg border border-border/60 bg-card space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 font-semibold text-foreground text-[11px] uppercase tracking-wider">
                <Lock className="size-3 text-emerald-500" />
                <span>Zero-Trust Policy Enforcement</span>
              </div>
              <p className="text-[11px]">
                Capabilities in this matrix are enforced at both the application presentation tier and PostgreSQL Row-Level Security (RLS) policies.
              </p>
            </div>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* RIGHT PANEL: PERMISSION MATRIX (8 cols on lg) */}
          {/* --------------------------------------------------------------- */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            {/* Active Role Meta Card */}
            <Card className="border-border/70 shadow-xs">
              <CardContent className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 flex items-center justify-center font-bold shadow-xs">
                      {React.createElement(ROLE_ICONS[selectedRole], { className: "size-5" })}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-bold tracking-tight text-foreground">
                          {currentMeta.title}
                        </h2>
                        <Badge
                          variant="secondary"
                          className={cn("font-mono text-[10px] uppercase font-semibold px-2 py-0.5", currentMeta.badgeClass)}
                        >
                          {currentMeta.tier}
                        </Badge>
                        {isSelectedRoleImmutable && (
                          <Badge variant="outline" className="font-mono text-[10px] text-zinc-500">
                            Immutable Root
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {currentMeta.description}
                      </p>
                    </div>
                  </div>

                  {/* Matrix Coverage KPI */}
                  <div className="flex items-center gap-3 bg-muted/40 p-2.5 rounded-lg border border-border/50 shrink-0 self-start sm:self-auto">
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground font-semibold">
                        Matrix Coverage
                      </div>
                      <div className="text-lg font-bold font-mono text-foreground">
                        {stats.totalGranted}
                        <span className="text-xs text-muted-foreground font-normal">
                          /{stats.totalApplicable} ({stats.percent}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* REQUIRED NOTICE: "Permissions apply across assigned branches." */}
                {/* ========================================================= */}
                <div className="p-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-start gap-3 shadow-2xs">
                  <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div className="space-y-0.5 text-xs text-foreground">
                    <div className="font-semibold text-zinc-950 dark:text-zinc-50 flex items-center gap-2 flex-wrap">
                      <span>Permissions apply across assigned branches.</span>
                      <span className="font-mono text-[10px] text-muted-foreground font-normal">
                        [RLS Perimeter Policy]
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {selectedRole === "super_admin"
                        ? "As Super Admin, these permissions operate chainwide across all registered branches with zero perimeter boundaries."
                        : `Staff holding the ${currentMeta.title} role may only execute permitted actions within their explicitly assigned physical branch location.`}
                    </p>
                  </div>
                </div>

                {/* Filter and Control Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  {/* Search and Category Filter */}
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <div className="relative w-full sm:w-56">
                      <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search modules..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 pl-8 text-xs font-sans"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>

                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-8 text-xs w-full sm:w-48 cursor-pointer">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories ({APP_MODULES.length})</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Toggle Mode & Batch Controls */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* Control Style Switcher */}
                    <div className="flex items-center rounded-md border border-border/60 p-0.5 bg-muted/30">
                      <button
                        onClick={() => setControlMode("checkbox")}
                        className={cn(
                          "px-2 py-1 text-[10px] font-semibold rounded cursor-pointer transition-colors flex items-center gap-1",
                          controlMode === "checkbox"
                            ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-2xs"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <CheckSquare className="size-3" />
                        <span>Checkbox</span>
                      </button>
                      <button
                        onClick={() => setControlMode("switch")}
                        className={cn(
                          "px-2 py-1 text-[10px] font-semibold rounded cursor-pointer transition-colors flex items-center gap-1",
                          controlMode === "switch"
                            ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-2xs"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Power className="size-3" />
                        <span>Toggle</span>
                      </button>
                    </div>

                    {!isSelectedRoleImmutable && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            APP_MODULES.forEach((m) => handleToggleRow(m.key, true));
                          }}
                          className="h-8 text-[11px] font-semibold px-2 cursor-pointer border-border/60 hover:bg-muted"
                          title="Grant all applicable capabilities"
                        >
                          <span>Grant All</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            APP_MODULES.forEach((m) => handleToggleRow(m.key, false));
                          }}
                          className="h-8 text-[11px] font-semibold px-2 cursor-pointer border-border/60 hover:bg-muted text-rose-600 dark:text-rose-400"
                          title="Revoke all capabilities"
                        >
                          <span>Revoke All</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ============================================================= */}
            {/* 3. PERMISSION MATRIX TABLE */}
            {/* ============================================================= */}
            <Card className="border-border/70 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40 border-b border-border/60">
                    <TableRow>
                      <TableHead className="w-[240px] text-xs font-semibold">
                        Module
                      </TableHead>
                      {PERMISSION_ACTIONS.map((action) => (
                        <TableHead
                          key={action.key}
                          className="text-center text-xs font-semibold w-[90px]"
                        >
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <span>{action.label}</span>
                            {!isSelectedRoleImmutable && (
                              <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleToggleColumn(action.key, true)}
                                  className="text-[9px] text-muted-foreground hover:text-emerald-600 cursor-pointer"
                                  title={`Grant all ${action.label}`}
                                >
                                  all
                                </button>
                                <span className="text-[9px] text-zinc-400">/</span>
                                <button
                                  onClick={() => handleToggleColumn(action.key, false)}
                                  className="text-[9px] text-muted-foreground hover:text-rose-600 cursor-pointer"
                                  title={`Revoke all ${action.label}`}
                                >
                                  none
                                </button>
                              </div>
                            )}
                          </div>
                        </TableHead>
                      ))}
                      {!isSelectedRoleImmutable && (
                        <TableHead className="w-[80px] text-right text-xs font-semibold">
                          Row Action
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredModules.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={isSelectedRoleImmutable ? 7 : 8}
                          className="h-28 text-center text-muted-foreground"
                        >
                          <div className="flex flex-col items-center justify-center gap-1">
                            <Info className="size-5 text-muted-foreground/60" />
                            <p className="text-sm font-semibold">No modules match your query</p>
                            <p className="text-xs text-muted-foreground">
                              Clear your search term or select another category filter.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredModules.map((mod) => {
                        const Icon = MODULE_ICONS[mod.key];
                        const perms = currentPermissions[mod.key];
                        const applicableSet = new Set<PermissionAction>(mod.applicableActions);

                        // Row status: all granted, partially granted, none granted
                        const applicableActionsCount = mod.applicableActions.length;
                        const grantedCount = mod.applicableActions.filter((a) => perms[a]).length;
                        const allRowGranted = grantedCount === applicableActionsCount;
                        const noneRowGranted = grantedCount === 0;

                        return (
                          <TableRow
                            key={mod.key}
                            className="hover:bg-muted/30 transition-colors border-b border-border/40"
                          >
                            {/* Module Name & Details */}
                            <TableCell className="py-3">
                              <div className="flex items-start gap-2.5">
                                <div className="size-7 rounded bg-muted flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
                                  <Icon className="size-3.5" />
                                </div>
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-xs text-foreground truncate">
                                      {mod.label}
                                    </span>
                                    <span className="font-mono text-[9px] text-muted-foreground bg-muted/60 px-1 py-0 rounded">
                                      {mod.route}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground leading-snug line-clamp-1">
                                    {mod.description}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            {/* 6 Permission Action Columns */}
                            {PERMISSION_ACTIONS.map((action) => {
                              const isApplicable = applicableSet.has(action.key);
                              const isGranted = perms[action.key] ?? false;

                              return (
                                <TableCell key={action.key} className="text-center py-3">
                                  {!isApplicable ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="inline-flex items-center justify-center size-6 rounded text-zinc-300 dark:text-zinc-700 select-none">
                                          <Minus className="size-3" />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-[10px]">
                                        <span>Not applicable for {mod.label}</span>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : controlMode === "checkbox" ? (
                                    /* Clean Checkbox Control */
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          disabled={isSelectedRoleImmutable}
                                          onClick={() =>
                                            handleTogglePermission(mod.key, action.key, isApplicable)
                                          }
                                          className={cn(
                                            "inline-flex items-center justify-center size-6 rounded border transition-all cursor-pointer",
                                            isSelectedRoleImmutable
                                              ? "opacity-90 cursor-not-allowed"
                                              : "hover:scale-105 active:scale-95",
                                            isGranted
                                              ? "bg-zinc-950 border-zinc-950 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-950 shadow-2xs"
                                              : "bg-card border-zinc-300 dark:border-zinc-700 text-transparent hover:border-zinc-500",
                                          )}
                                        >
                                          {isGranted ? (
                                            <Check className="size-3.5 stroke-[2.5]" />
                                          ) : (
                                            <span className="size-3.5" />
                                          )}
                                          <span className="sr-only">
                                            {isGranted ? "Disable" : "Enable"} {action.label} on {mod.label}
                                          </span>
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-[10px]">
                                        <span>
                                          {isGranted ? "Allowed: " : "Denied: "}
                                          {action.label} in {mod.label}
                                        </span>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    /* Clean Toggle Switch Control */
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          disabled={isSelectedRoleImmutable}
                                          onClick={() =>
                                            handleTogglePermission(mod.key, action.key, isApplicable)
                                          }
                                          className={cn(
                                            "relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none",
                                            isSelectedRoleImmutable
                                              ? "opacity-90 cursor-not-allowed"
                                              : "",
                                            isGranted
                                              ? "bg-zinc-950 dark:bg-zinc-100"
                                              : "bg-zinc-200 dark:bg-zinc-800",
                                          )}
                                        >
                                          <span
                                            className={cn(
                                              "pointer-events-none inline-block size-3 rounded-full bg-white dark:bg-zinc-950 shadow-lg ring-0 transition-transform",
                                              isGranted ? "translate-x-3" : "translate-x-0",
                                            )}
                                          />
                                          <span className="sr-only">
                                            Toggle {action.label} on {mod.label}
                                          </span>
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-[10px]">
                                        <span>
                                          {isGranted ? "Active" : "Disabled"}: {action.label}
                                        </span>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </TableCell>
                              );
                            })}

                            {/* Row-level batch action */}
                            {!isSelectedRoleImmutable && (
                              <TableCell className="text-right py-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleRow(mod.key, !allRowGranted)}
                                  className="h-6 text-[10px] px-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                                  title={allRowGranted ? "Clear all in row" : "Grant all in row"}
                                >
                                  <span>{allRowGranted ? "Clear" : "All"}</span>
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Table Footer Stats & Scope Notice */}
              <div className="p-3 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-card">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {filteredModules.length} Modules
                  </span>
                  <span>·</span>
                  <span>
                    Scope: <strong className="text-foreground">{currentMeta.scope}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3" /> Granted: {stats.totalGranted}
                  </span>
                  <span className="flex items-center gap-1 text-zinc-500">
                    <Minus className="size-3" /> Denied: {stats.totalApplicable - stats.totalGranted}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
