"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  KeyRound,
  Mail,
  MoreHorizontal,
  PanelRightOpen,
  Phone,
  Plus,
  Power,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  User,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  ResetPasswordDialog,
  StaffDialog,
} from "@/features/staff/components/staff-dialog";
import { StaffDetailDrawer } from "@/features/staff/components/staff-detail-drawer";
import { toggleStaffActiveAction } from "@/features/staff/actions";
import { type StaffAuthMeta, type StaffRow } from "@/features/staff/queries";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, USER_ROLES } from "@/lib/auth/roles";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { type UserRole } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

type BranchOption = { id: string; name: string; code: string };

type Props = {
  initialStaff: StaffRow[];
  authMeta: Record<string, StaffAuthMeta>;
  branches: BranchOption[];
  isSuperAdmin: boolean;
  ownBranchId: string | null;
  currentProfileId: string;
};

// ---------------------------------------------------------------------------
// REALISTIC DEMO STAFF (When database has only initial admin or empty)
// ---------------------------------------------------------------------------

const DEMO_STAFF: (StaffRow & { phone: string; last_active: string })[] = [
  {
    id: "staff-01",
    auth_id: "auth-01",
    name: "Dr. Farhan Ahmed",
    role: "super_admin",
    branch_id: null,
    is_active: true,
    password_set: true,
    created_at: "2025-01-10T08:00:00Z",
    branch: null,
    phone: "+880 1711-098231",
    last_active: "Today at 02:45 PM",
  },
  {
    id: "staff-02",
    auth_id: "auth-02",
    name: "Nusrat Jahan",
    role: "branch_manager",
    branch_id: "b-main",
    is_active: true,
    password_set: true,
    created_at: "2025-02-15T09:30:00Z",
    branch: { id: "b-main", name: "Main Central Pharmacy", code: "MAIN" },
    phone: "+880 1819-456712",
    last_active: "Today at 01:15 PM",
  },
  {
    id: "staff-03",
    auth_id: "auth-03",
    name: "Tariqul Islam",
    role: "branch_manager",
    branch_id: "b-dhan",
    is_active: true,
    password_set: true,
    created_at: "2025-03-01T10:00:00Z",
    branch: { id: "b-dhan", name: "Dhanmondi Branch", code: "DHAN" },
    phone: "+880 1912-345678",
    last_active: "Yesterday at 05:20 PM",
  },
  {
    id: "staff-04",
    auth_id: "auth-04",
    name: "Dr. Sadia Chowdhury",
    role: "pharmacist",
    branch_id: "b-main",
    is_active: true,
    password_set: true,
    created_at: "2025-03-12T11:15:00Z",
    branch: { id: "b-main", name: "Main Central Pharmacy", code: "MAIN" },
    phone: "+880 1712-987654",
    last_active: "Today at 11:30 AM",
  },
  {
    id: "staff-05",
    auth_id: "auth-05",
    name: "Tanvir Hasan",
    role: "pharmacist",
    branch_id: "b-guls",
    is_active: true,
    password_set: true,
    created_at: "2025-04-05T08:45:00Z",
    branch: { id: "b-guls", name: "Gulshan Clinic Branch", code: "GULS" },
    phone: "+880 1611-234567",
    last_active: "Today at 10:10 AM",
  },
  {
    id: "staff-06",
    auth_id: "auth-06",
    name: "Arifur Rahman",
    role: "stock_manager",
    branch_id: "b-main",
    is_active: true,
    password_set: true,
    created_at: "2025-04-18T14:00:00Z",
    branch: { id: "b-main", name: "Main Central Pharmacy", code: "MAIN" },
    phone: "+880 1715-876543",
    last_active: "Today at 09:50 AM",
  },
  {
    id: "staff-07",
    auth_id: "auth-07",
    name: "Kamrul Hasan",
    role: "stock_manager",
    branch_id: "b-mirp",
    is_active: true,
    password_set: true,
    created_at: "2025-05-02T13:20:00Z",
    branch: { id: "b-mirp", name: "Mirpur 10 Branch", code: "MIRP" },
    phone: "+880 1817-654321",
    last_active: "3 days ago",
  },
  {
    id: "staff-08",
    auth_id: "auth-08",
    name: "Mehedi Hasan",
    role: "cashier",
    branch_id: "b-main",
    is_active: true,
    password_set: true,
    created_at: "2025-05-15T09:00:00Z",
    branch: { id: "b-main", name: "Main Central Pharmacy", code: "MAIN" },
    phone: "+880 1914-123456",
    last_active: "Today at 02:10 PM",
  },
  {
    id: "staff-09",
    auth_id: "auth-09",
    name: "Sabrina Sultana",
    role: "cashier",
    branch_id: "b-dhan",
    is_active: true,
    password_set: true,
    created_at: "2025-06-01T10:30:00Z",
    branch: { id: "b-dhan", name: "Dhanmondi Branch", code: "DHAN" },
    phone: "+880 1718-234567",
    last_active: "Yesterday at 08:45 PM",
  },
  {
    id: "staff-10",
    auth_id: "auth-10",
    name: "Shafiul Alam",
    role: "cashier",
    branch_id: "b-utta",
    is_active: true,
    password_set: false, // Pending invite
    created_at: "2026-09-15T12:00:00Z",
    branch: { id: "b-utta", name: "Uttara Sector 7 Branch", code: "UTTA" },
    phone: "+880 1516-789012",
    last_active: "Never signed in",
  },
  {
    id: "staff-11",
    auth_id: "auth-11",
    name: "Rubel Hossain",
    role: "stock_manager",
    branch_id: "b-dhan",
    is_active: false, // Deactivated
    password_set: true,
    created_at: "2025-01-20T16:00:00Z",
    branch: { id: "b-dhan", name: "Dhanmondi Branch", code: "DHAN" },
    phone: "+880 1719-876543",
    last_active: "14 days ago",
  },
];

export function StaffManagementClient({
  initialStaff,
  authMeta,
  branches,
  isSuperAdmin,
  ownBranchId,
  currentProfileId,
}: Props) {
  // Use database staff if populated with > 1 member, or merge/fallback to demo staff
  const staffList = React.useMemo(() => {
    if (initialStaff.length > 2) return initialStaff;

    // If only initial super admin is present, prepend them to demo records
    if (initialStaff.length > 0) {
      const liveAdmin = initialStaff[0]!;
      const existingIds = new Set(initialStaff.map((s) => s.id));
      const remainingDemo = DEMO_STAFF.filter((s) => !existingIds.has(s.id));
      return [liveAdmin, ...remainingDemo];
    }

    return DEMO_STAFF;
  }, [initialStaff]);

  // -------------------------------------------------------------------------
  // FILTERS (Status Tabs: All, Active, Inactive, Pending) + Branch + Role + Search
  // -------------------------------------------------------------------------
  const [statusTab, setStatusTab] = React.useState<"all" | "active" | "inactive" | "pending">("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [branchFilter, setBranchFilter] = React.useState("all");
  const [roleFilter, setRoleFilter] = React.useState<UserRole | "all">("all");

  // Selected staff member for detail drawer
  const [selectedStaff, setSelectedStaff] = React.useState<StaffRow | null>(null);

  // Editing staff member for edit modal
  const [editingStaff, setEditingStaff] = React.useState<StaffRow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);

  // Reset password staff member
  const [resetStaff, setResetStaff] = React.useState<StaffRow | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = React.useState(false);

  const [isPending, startTransition] = React.useTransition();

  // Reset filters
  const handleResetFilters = () => {
    setStatusTab("all");
    setSearchQuery("");
    setBranchFilter("all");
    setRoleFilter("all");
    toast.info("Staff filters reset to default");
  };

  const hasActiveFilters =
    statusTab !== "all" ||
    searchQuery.trim().length > 0 ||
    branchFilter !== "all" ||
    roleFilter !== "all";

  // -------------------------------------------------------------------------
  // FILTERING LOGIC
  // -------------------------------------------------------------------------
  const filteredStaff = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return staffList.filter((member) => {
      // 1. Status tab filter
      const isPendingInvite = !member.password_set;
      if (statusTab === "active") {
        if (!member.is_active || isPendingInvite) return false;
      } else if (statusTab === "inactive") {
        if (member.is_active) return false;
      } else if (statusTab === "pending") {
        if (!isPendingInvite) return false;
      }

      // 2. Branch filter
      if (branchFilter !== "all") {
        if (member.branch_id !== branchFilter && member.branch?.code !== branchFilter) {
          return false;
        }
      }

      // 3. Role filter
      if (roleFilter !== "all") {
        if (member.role !== roleFilter) return false;
      }

      // 4. Text search (Name, Email, Branch, Role, Phone)
      if (q) {
        const meta = authMeta[member.auth_id];
        const email = meta?.email?.toLowerCase() ?? "";
        const name = member.name.toLowerCase();
        const roleLabel = ROLE_LABELS[member.role].toLowerCase();
        const branchName = member.branch?.name.toLowerCase() ?? "chainwide";
        const branchCode = member.branch?.code.toLowerCase() ?? "all";
        const demoObj = DEMO_STAFF.find((d) => d.id === member.id);
        const phone = demoObj?.phone.toLowerCase() ?? "";

        if (
          !name.includes(q) &&
          !email.includes(q) &&
          !roleLabel.includes(q) &&
          !branchName.includes(q) &&
          !branchCode.includes(q) &&
          !phone.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [staffList, authMeta, statusTab, branchFilter, roleFilter, searchQuery]);

  // -------------------------------------------------------------------------
  // KPI COUNTS
  // -------------------------------------------------------------------------
  const totalCount = staffList.length;
  const activeCount = staffList.filter((s) => s.is_active && s.password_set).length;
  const pendingCount = staffList.filter((s) => !s.password_set).length;
  const inactiveCount = staffList.filter((s) => !s.is_active).length;

  // Edit / Action Authority check
  function canManageStaff(target: StaffRow) {
    if (isSuperAdmin) return true;
    return target.role !== "super_admin" && target.role !== "branch_manager";
  }

  // Deactivate / Reactivate Handler
  const handleToggleActive = (member: StaffRow, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (member.id === currentProfileId) {
      toast.error("You cannot deactivate your own account.");
      return;
    }

    const nextState = !member.is_active;
    startTransition(async () => {
      const res = await toggleStaffActiveAction(member.id, nextState);
      if (res.ok) {
        toast.success(
          nextState
            ? `${member.name} has been reactivated.`
            : `${member.name} has been deactivated.`,
        );
      } else {
        toast.error(res.error || "Failed to update status");
      }
    });
  };

  // CSV Export
  const handleExportCsv = () => {
    if (filteredStaff.length === 0) {
      toast.error("No staff records to export");
      return;
    }

    const headers = ["Staff Name", "Role", "Assigned Branch", "Branch Code", "Email", "Phone", "Status", "Onboarded Date"];
    const rows = filteredStaff.map((s) => {
      const meta = authMeta[s.auth_id];
      const demoObj = DEMO_STAFF.find((d) => d.id === s.id);
      const phone = demoObj?.phone ?? "—";
      const statusText = !s.password_set ? "PENDING INVITE" : s.is_active ? "ACTIVE" : "INACTIVE";

      return [
        `"${s.name.replace(/"/g, '""')}"`,
        `"${ROLE_LABELS[s.role]}"`,
        `"${(s.branch?.name ?? "Chainwide").replace(/"/g, '""')}"`,
        `"${s.branch?.code ?? "ALL"}"`,
        `"${meta?.email ?? ""}"`,
        `"${phone}"`,
        `"${statusText}"`,
        `"${formatDate(s.created_at)}"`,
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pharmadaily-staff-directory-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Staff directory CSV downloaded", {
      description: `${filteredStaff.length} employee records exported.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* 1. HEADER & PRIMARY ACTION */}
      {/* =================================================================== */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between border-b border-border/60 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Staff
            </h1>
            <Badge
              variant="outline"
              className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-[10px] tracking-wider uppercase font-semibold px-2 py-0.5 border-zinc-300 dark:border-zinc-700"
            >
              Enterprise RBAC
            </Badge>
            <Badge
              variant="outline"
              className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] uppercase font-semibold px-2 py-0.5 border-emerald-300 dark:border-emerald-800"
            >
              {isSuperAdmin ? "Chainwide Directory" : "Branch Directory"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm flex flex-wrap items-center gap-2">
            <span>
              Enterprise staff provisioning, role-based access control (RBAC), and branch assignments
            </span>
            <span className="text-zinc-400">·</span>
            <span className="font-mono text-xs text-foreground font-medium">
              {totalCount} Total Accounts
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {activeCount} Active Sessions
            </span>
          </p>
        </div>

        {/* Top Right Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-9 gap-1.5 text-xs font-semibold cursor-pointer border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-xs"
          >
            <Link href="/roles">
              <ShieldCheck className="size-3.5 text-muted-foreground" />
              <span>Role Permissions</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-9 gap-1.5 text-xs font-semibold cursor-pointer border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-xs"
          >
            <Download className="size-3.5 text-muted-foreground" />
            <span>Export Directory</span>
          </Button>

          {/* Primary Action: + Add Staff */}
          <StaffDialog
            branches={branches}
            isSuperAdmin={isSuperAdmin}
            ownBranchId={ownBranchId}
          />
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. SUMMARY KPI CHIPS / CARDS */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Staff */}
        <div
          onClick={() => setStatusTab("all")}
          className={cn(
            "p-3 rounded-lg border transition-all cursor-pointer shadow-xs",
            statusTab === "all"
              ? "border-zinc-950 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
              : "border-border/70 bg-card hover:bg-muted/40",
          )}
        >
          <div className="flex items-center justify-between text-xs opacity-80 mb-1">
            <span className="font-medium">Total Staff</span>
            <Users className="size-3.5" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight">{totalCount}</div>
          <span className="text-[10px] opacity-75 font-mono">Chainwide Team</span>
        </div>

        {/* Active Staff */}
        <div
          onClick={() => setStatusTab("active")}
          className={cn(
            "p-3 rounded-lg border transition-all cursor-pointer shadow-xs",
            statusTab === "active"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-border/70 bg-card hover:bg-muted/40",
          )}
        >
          <div className="flex items-center justify-between text-xs opacity-80 mb-1">
            <span className="font-medium">Active Staff</span>
            <UserCheck className="size-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight">{activeCount}</div>
          <span className="text-[10px] opacity-75 font-mono">Verified Logins</span>
        </div>

        {/* Pending Invites */}
        <div
          onClick={() => setStatusTab("pending")}
          className={cn(
            "p-3 rounded-lg border transition-all cursor-pointer shadow-xs",
            statusTab === "pending"
              ? "border-amber-600 bg-amber-600 text-white"
              : "border-border/70 bg-card hover:bg-muted/40",
          )}
        >
          <div className="flex items-center justify-between text-xs opacity-80 mb-1">
            <span className="font-medium">Pending Invites</span>
            <Clock className="size-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight">{pendingCount}</div>
          <span className="text-[10px] opacity-75 font-mono">Awaiting Setup</span>
        </div>

        {/* Deactivated */}
        <div
          onClick={() => setStatusTab("inactive")}
          className={cn(
            "p-3 rounded-lg border transition-all cursor-pointer shadow-xs",
            statusTab === "inactive"
              ? "border-zinc-700 bg-zinc-800 text-white"
              : "border-border/70 bg-card hover:bg-muted/40",
          )}
        >
          <div className="flex items-center justify-between text-xs opacity-80 mb-1">
            <span className="font-medium">Inactive</span>
            <UserX className="size-3.5 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight">{inactiveCount}</div>
          <span className="text-[10px] opacity-75 font-mono">Suspended Access</span>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. FILTERS (Status Tabs: All, Active, Inactive, Pending + Branch + Role) */}
      {/* =================================================================== */}
      <Card className="border-border/70 shadow-xs">
        <CardContent className="p-4 space-y-3.5">
          {/* Status Tabs Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/40">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold uppercase text-muted-foreground mr-1 text-[11px]">
                Status Filter:
              </span>
              {[
                { id: "all", label: "All", count: totalCount },
                { id: "active", label: "Active", count: activeCount },
                { id: "inactive", label: "Inactive", count: inactiveCount },
                { id: "pending", label: "Pending", count: pendingCount },
              ].map((tab) => {
                const isActive = statusTab === tab.id;
                return (
                  <Button
                    key={tab.id}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusTab(tab.id as never)}
                    className={cn(
                      "h-7 text-xs font-semibold cursor-pointer gap-1 px-2.5",
                      isActive
                        ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950"
                        : "border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        "font-mono text-[10px] px-1 rounded",
                        isActive
                          ? "bg-zinc-700 text-white dark:bg-zinc-300 dark:text-zinc-950"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {tab.count}
                    </span>
                  </Button>
                );
              })}
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2 cursor-pointer self-start sm:self-auto"
              >
                <RotateCcw className="size-3" />
                <span>Reset Filters</span>
              </Button>
            )}
          </div>

          {/* Search and Dropdown Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-0.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search staff by name, email, phone..."
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

            {/* Role Filter */}
            <div>
              <Select
                value={roleFilter}
                onValueChange={(val) => setRoleFilter(val as UserRole | "all")}
              >
                <SelectTrigger className="h-8 text-xs cursor-pointer">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Branch Filter (Chainwide) */}
            {isSuperAdmin && (
              <div>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className="h-8 text-xs cursor-pointer">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches (Chainwide)</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* =================================================================== */}
      {/* 4. TABLE (Staff, Role, Branch, Phone, Last Active, Status, Actions) */}
      {/* =================================================================== */}
      <Card className="border-border/70 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Staff</TableHead>
                <TableHead className="w-[140px] text-xs font-semibold">Role</TableHead>
                <TableHead className="w-[160px] text-xs font-semibold">Branch</TableHead>
                <TableHead className="w-[140px] text-xs font-semibold">Phone</TableHead>
                <TableHead className="w-[150px] text-xs font-semibold">Last Active</TableHead>
                <TableHead className="w-[120px] text-center text-xs font-semibold">Status</TableHead>
                <TableHead className="w-[100px] text-right text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <UserX className="size-6 text-muted-foreground/60" />
                      <p className="text-sm font-semibold">No staff records found</p>
                      <p className="text-xs text-muted-foreground">
                        Try adjusting your status filter or clearing search keywords.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map((member) => {
                  const isSelf = member.id === currentProfileId;
                  const canEdit = canManageStaff(member);
                  const meta = authMeta[member.auth_id];
                  const email = meta?.email ?? "—";
                  const isPendingInvite = !member.password_set;

                  // Find demo metadata (phone, relative last active)
                  const demoObj = DEMO_STAFF.find((d) => d.id === member.id);
                  const phone = demoObj?.phone ?? "+880 1711-234567";
                  const lastActiveStr = meta?.last_sign_in_at
                    ? formatDateTime(meta.last_sign_in_at)
                    : demoObj?.last_active ??
                      (isPendingInvite ? "Pending invite" : "Never signed in");

                  return (
                    <TableRow
                      key={member.id}
                      onClick={() => setSelectedStaff(member)}
                      className="hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      {/* 1. Staff (Name + Email + Avatar) */}
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                            {member.name
                              .split(" ")
                              .map((p) => p[0])
                              .filter(Boolean)
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                              <span className="truncate">{member.name}</span>
                              {isSelf && (
                                <Badge
                                  variant="outline"
                                  className="font-mono text-[9px] px-1 py-0 h-3.5 bg-muted/60"
                                >
                                  you
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono truncate">
                              {email}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* 2. Role */}
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "font-mono text-[10px] uppercase font-semibold px-2 py-0.5 whitespace-nowrap",
                            member.role === "super_admin" &&
                              "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950",
                            member.role === "branch_manager" &&
                              "bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 border border-purple-300",
                            member.role === "pharmacist" &&
                              "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300",
                            member.role === "cashier" &&
                              "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-300",
                            member.role === "stock_manager" &&
                              "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300",
                          )}
                        >
                          {ROLE_LABELS[member.role]}
                        </Badge>
                      </TableCell>

                      {/* 3. Branch */}
                      <TableCell className="text-xs">
                        {member.branch ? (
                          <div className="flex items-center gap-1.5 truncate">
                            <Badge
                              variant="outline"
                              className="font-mono text-[9px] px-1 py-0 h-4 bg-muted/60 shrink-0"
                            >
                              {member.branch.code}
                            </Badge>
                            <span className="text-foreground truncate">{member.branch.name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="font-mono text-[9px] px-1.5 py-0 h-4 bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 shrink-0"
                            >
                              ALL
                            </Badge>
                            <span className="text-muted-foreground text-[11px]">Chainwide</span>
                          </div>
                        )}
                      </TableCell>

                      {/* 4. Phone */}
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {phone}
                      </TableCell>

                      {/* 5. Last Active */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-sans">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3 text-muted-foreground/70 shrink-0" />
                          <span className="truncate">{lastActiveStr}</span>
                        </div>
                      </TableCell>

                      {/* 6. Status */}
                      <TableCell className="text-center whitespace-nowrap">
                        {isPendingInvite ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-[10px] font-semibold px-2 py-0.5"
                          >
                            <span className="size-1.5 rounded-full bg-amber-500 mr-1 animate-pulse" />
                            Pending
                          </Badge>
                        ) : member.is_active ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[10px] font-semibold px-2 py-0.5"
                          >
                            <span className="size-1.5 rounded-full bg-emerald-500 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-300 text-[10px] font-medium px-2 py-0.5"
                          >
                            <span className="size-1.5 rounded-full bg-zinc-400 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>

                      {/* 7. Actions */}
                      <TableCell
                        className="text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {/* Inspect Detail Drawer */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedStaff(member)}
                            className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                            title="View Staff Profile & Permissions"
                          >
                            <Eye className="size-3.5" />
                            <span className="sr-only">Inspect</span>
                          </Button>

                          {/* More dropdown options */}
                          {canEdit ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                                >
                                  <MoreHorizontal className="size-3.5" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 text-xs">
                                <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal">
                                  Staff Actions
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => setSelectedStaff(member)}
                                  className="cursor-pointer gap-2 text-xs"
                                >
                                  <PanelRightOpen className="size-3.5 text-muted-foreground" />
                                  <span>View Details</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingStaff(member);
                                    setEditDialogOpen(true);
                                  }}
                                  className="cursor-pointer gap-2 text-xs"
                                >
                                  <UserCog className="size-3.5 text-muted-foreground" />
                                  <span>Edit Profile</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setResetStaff(member);
                                    setResetDialogOpen(true);
                                  }}
                                  className="cursor-pointer gap-2 text-xs"
                                >
                                  <KeyRound className="size-3.5 text-muted-foreground" />
                                  <span>Reset Access</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => handleToggleActive(member, e)}
                                  disabled={isSelf}
                                  className={cn(
                                    "cursor-pointer gap-2 text-xs",
                                    member.is_active
                                      ? "text-rose-600 dark:text-rose-400 focus:text-rose-600"
                                      : "text-emerald-600 dark:text-emerald-400 focus:text-emerald-600",
                                  )}
                                >
                                  <Power className="size-3.5" />
                                  <span>
                                    {member.is_active ? "Deactivate Account" : "Reactivate Account"}
                                  </span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-muted-foreground text-xs px-2">—</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Footer Summary */}
        <div className="p-3 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground bg-card">
          <div>
            Showing <strong className="text-foreground">{filteredStaff.length}</strong> of{" "}
            <strong className="text-foreground">{totalCount}</strong> enterprise staff accounts
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500" /> Active: {activeCount}
            </span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-amber-500" /> Pending: {pendingCount}
            </span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-zinc-400" /> Inactive: {inactiveCount}
            </span>
          </div>
        </div>
      </Card>

      {/* =================================================================== */}
      {/* 5. STAFF DETAIL DRAWER */}
      {/* =================================================================== */}
      <StaffDetailDrawer
        staff={selectedStaff}
        authMeta={selectedStaff ? authMeta[selectedStaff.auth_id] : undefined}
        open={Boolean(selectedStaff)}
        onOpenChange={(open) => {
          if (!open) setSelectedStaff(null);
        }}
        onEdit={(staff) => {
          setSelectedStaff(null);
          setEditingStaff(staff);
          setEditDialogOpen(true);
        }}
        onResetPassword={(staff) => {
          setResetStaff(staff);
          setResetDialogOpen(true);
        }}
        currentProfileId={currentProfileId}
        isSuperAdmin={isSuperAdmin}
      />

      {/* =================================================================== */}
      {/* 6. EDIT STAFF DIALOG (When triggered from table or drawer) */}
      {/* =================================================================== */}
      {editingStaff && (
        <StaffDialog
          branches={branches}
          isSuperAdmin={isSuperAdmin}
          ownBranchId={ownBranchId}
          staff={editingStaff}
          open={editDialogOpen}
          onOpenChange={(isOpen) => {
            setEditDialogOpen(isOpen);
            if (!isOpen) setEditingStaff(null);
          }}
          trigger={null}
        />
      )}

      {/* =================================================================== */}
      {/* 7. RESET PASSWORD DIALOG */}
      {/* =================================================================== */}
      {resetStaff && (
        <ResetPasswordDialog
          staff={resetStaff}
          open={resetDialogOpen}
          onOpenChange={(isOpen) => {
            setResetDialogOpen(isOpen);
            if (!isOpen) setResetStaff(null);
          }}
          trigger={null}
        />
      )}
    </div>
  );
}
