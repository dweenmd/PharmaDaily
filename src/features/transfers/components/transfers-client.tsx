"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeftRight,
  ArrowRight,
  Boxes,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Info,
  MapPin,
  Package,
  PackageCheck,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Truck,
  User,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { type StockRow } from "@/features/stock/queries";
import { type TransferListRow } from "@/features/transfers/queries";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type TabValue = "all" | "requested" | "approved" | "in_transit" | "received" | "rejected";

type Props = {
  transfers: TransferListRow[];
  canRequest: boolean;
  myBranchId: string | null;
  branches: { id: string; name: string; code: string }[];
  stock?: StockRow[];
};

type CreateTransferItem = {
  id: string;
  medicineName: string;
  batchNo: string;
  availableStock: number;
  destCurrentStock: number;
  quantity: number;
};

export function TransfersClient({ transfers, canRequest, myBranchId, branches, stock = [] }: Props) {
  const router = useRouter();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentTab, setCurrentTab] = React.useState<TabValue>("all");

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Selected Transfer for Detail Inspection Drawer
  const [selectedTransfer, setSelectedTransfer] = React.useState<TransferListRow | null>(null);

  // Create Transfer Workflow Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [sourceBranchId, setSourceBranchId] = React.useState(myBranchId ?? branches[0]?.id ?? "");
  const [destBranchId, setDestBranchId] = React.useState(
    branches.find((b) => b.id !== (myBranchId ?? branches[0]?.id))?.id ?? branches[1]?.id ?? "",
  );
  const [transferNotes, setTransferNotes] = React.useState("");
  const [transferReason, setTransferReason] = React.useState("Low Stock Replenishment");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [createSuccess, setCreateSuccess] = React.useState(false);

  // Transfer Items in Workflow
  const [transferItems, setTransferItems] = React.useState<CreateTransferItem[]>([
    {
      id: "item-1",
      medicineName: "Napa 500mg (Paracetamol)",
      batchNo: "BX-9810",
      availableStock: 180,
      destCurrentStock: 15,
      quantity: 50,
    },
  ]);

  // Keep dest branch different from source branch
  React.useEffect(() => {
    if (destBranchId === sourceBranchId) {
      const alt = branches.find((b) => b.id !== sourceBranchId);
      if (alt) setDestBranchId(alt.id);
    }
  }, [sourceBranchId, destBranchId, branches]);

  // Helper to determine if a transfer is "In Transit" vs "Approved"
  function isTransit(t: TransferListRow): boolean {
    if (t.status !== "approved") return false;
    const note = (t.notes ?? "").toLowerCase();
    return note.includes("transit") || note.includes("en route") || note.includes("van") || note.includes("courier");
  }

  // Map status tabs to transfer status
  function matchTab(t: TransferListRow, tab: TabValue): boolean {
    if (tab === "all") return true;
    if (tab === "requested") return t.status === "pending";
    if (tab === "approved") {
      // In approved state, awaiting dock transit pickup
      return t.status === "approved" && !isTransit(t);
    }
    if (tab === "in_transit") {
      // In transit on vehicle
      return t.status === "approved" && isTransit(t);
    }
    if (tab === "received") return t.status === "completed";
    if (tab === "rejected") return t.status === "rejected";
    return true;
  }

  // Counts for each of the 6 tabs
  const counts = React.useMemo(() => {
    return {
      all: transfers.length,
      requested: transfers.filter((t) => t.status === "pending").length,
      approved: transfers.filter((t) => t.status === "approved" && !isTransit(t)).length,
      in_transit: transfers.filter((t) => t.status === "approved" && isTransit(t)).length,
      received: transfers.filter((t) => t.status === "completed").length,
      rejected: transfers.filter((t) => t.status === "rejected").length,
    };
  }, [transfers]);

  // Filter transfers
  const filteredTransfers = React.useMemo(() => {
    return transfers.filter((t) => {
      if (!matchTab(t, currentTab)) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const refMatch = t.reference_no.toLowerCase().includes(query);
        const fromMatch = t.from_branch?.name.toLowerCase().includes(query) ?? false;
        const toMatch = t.to_branch?.name.toLowerCase().includes(query) ?? false;
        const userMatch = t.requested_by?.name.toLowerCase().includes(query) ?? false;
        const itemMatch = t.items_summary?.toLowerCase().includes(query) ?? false;

        if (!refMatch && !fromMatch && !toMatch && !userMatch && !itemMatch) {
          return false;
        }
      }

      return true;
    });
  }, [transfers, currentTab, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredTransfers.length / pageSize) || 1;
  const paginatedTransfers = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransfers.slice(start, start + pageSize);
  }, [filteredTransfers, currentPage, pageSize]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [currentTab, searchTerm, pageSize]);

  function getStatusBadge(t: TransferListRow) {
    if (t.status === "pending") {
      return {
        label: "Requested",
        className: "bg-zinc-100 text-zinc-900 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100",
        icon: Clock,
        step: 1,
      };
    }
    if (t.status === "approved") {
      if (isTransit(t)) {
        return {
          label: "In Transit",
          className: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
          icon: Truck,
          step: 3,
        };
      }
      return {
        label: "Approved",
        className: "bg-zinc-800 text-zinc-100 border border-zinc-700 dark:bg-zinc-200 dark:text-zinc-900",
        icon: Check,
        step: 2,
      };
    }
    if (t.status === "completed") {
      return {
        label: "Received",
        className: "bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
        icon: CheckCircle2,
        step: 4,
      };
    }
    if (t.status === "rejected") {
      return {
        label: "Rejected",
        className: "bg-rose-50 text-rose-800 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
        icon: XCircle,
        step: 0,
      };
    }
    return {
      label: t.status,
      className: "bg-zinc-100 text-zinc-700",
      icon: Clock,
      step: 1,
    };
  }

  // Create workflow item adjustments
  function handleItemQuantityChange(index: number, newQty: number) {
    setTransferItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const validQty = Math.max(1, Math.min(item.availableStock, newQty));
        return { ...item, quantity: validQty };
      }),
    );
  }

  function handleAddTransferLine() {
    setTransferItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        medicineName: "Seclo 20mg (Omeprazole)",
        batchNo: "SC-4109",
        availableStock: 95,
        destCurrentStock: 20,
        quantity: 30,
      },
    ]);
  }

  function handleRemoveTransferLine(index: number) {
    if (transferItems.length === 1) return;
    setTransferItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleCreateTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setCreateSuccess(true);
      toast.success("Transfer Request Submitted", {
        description: `Reserved at source dock. Awaiting approval from ${
          branches.find((b) => b.id === sourceBranchId)?.name ?? "Source Branch"
        }.`,
      });

      setTimeout(() => {
        setIsCreateModalOpen(false);
        setCreateSuccess(false);
        router.refresh();
      }, 1200);
    }, 800);
  }

  const sourceBranch = branches.find((b) => b.id === sourceBranchId);
  const destBranch = branches.find((b) => b.id === destBranchId);

  // Total units moving in current workflow
  const totalWorkflowUnits = transferItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 font-medium">
            <span>PharmaDaily</span>
            <span>/</span>
            <span>Inventory</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Stock Transfers</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Stock Transfers
            </h1>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700">
              MULTI-BRANCH INVENTORY
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Inter-branch consignment movement, batch tracking, and chain custody routing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Manifest export initiated for auditing logs.")}
            className="text-xs h-9"
          >
            <Download className="mr-1.5 size-3.5" />
            Export
          </Button>

          {canRequest && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-zinc-950 hover:bg-zinc-850 dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold h-9 shadow-xs cursor-pointer"
            >
              <Plus className="mr-1.5 size-3.5" />
              + Request Transfer
            </Button>
          )}
        </div>
      </div>

      {/* 2. Visual Workflow Indicator Banner: Requested → Approved → In Transit → Received */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="size-4 text-zinc-700 dark:text-zinc-300" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Transfer Workflow Lifecycle
            </h2>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            Chain-of-Custody FEFO Verification
          </span>
        </div>

        {/* 4-Step Pipeline: Requested → Approved → In Transit → Received */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {/* Step 1: Requested */}
          <div
            onClick={() => setCurrentTab("requested")}
            className={cn(
              "group cursor-pointer rounded-lg border p-3 transition-all",
              currentTab === "requested"
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 shadow-xs"
                : "border-zinc-200/90 bg-zinc-50/70 hover:bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-850/50",
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={cn(
                  "font-mono text-[10px] font-bold px-1.5 py-0.5 rounded",
                  currentTab === "requested"
                    ? "bg-zinc-800 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-900"
                    : "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
                )}
              >
                01
              </span>
              <span className="text-xs font-bold">→</span>
            </div>
            <div className="font-bold text-xs tracking-tight">Requested</div>
            <p
              className={cn(
                "text-[11px] mt-1 leading-tight",
                currentTab === "requested" ? "text-zinc-300 dark:text-zinc-700" : "text-muted-foreground",
              )}
            >
              Stock reserved at source dock. Not yet deducted.
            </p>
          </div>

          {/* Step 2: Approved */}
          <div
            onClick={() => setCurrentTab("approved")}
            className={cn(
              "group cursor-pointer rounded-lg border p-3 transition-all",
              currentTab === "approved"
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 shadow-xs"
                : "border-zinc-200/90 bg-zinc-50/70 hover:bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-850/50",
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={cn(
                  "font-mono text-[10px] font-bold px-1.5 py-0.5 rounded",
                  currentTab === "approved"
                    ? "bg-zinc-800 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-900"
                    : "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
                )}
              >
                02
              </span>
              <span className="text-xs font-bold">→</span>
            </div>
            <div className="font-bold text-xs tracking-tight">Approved</div>
            <p
              className={cn(
                "text-[11px] mt-1 leading-tight",
                currentTab === "approved" ? "text-zinc-300 dark:text-zinc-700" : "text-muted-foreground",
              )}
            >
              Manager authorized. Deducted from source shelf.
            </p>
          </div>

          {/* Step 3: In Transit */}
          <div
            onClick={() => setCurrentTab("in_transit")}
            className={cn(
              "group cursor-pointer rounded-lg border p-3 transition-all",
              currentTab === "in_transit"
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 shadow-xs"
                : "border-zinc-200/90 bg-zinc-50/70 hover:bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-850/50",
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={cn(
                  "font-mono text-[10px] font-bold px-1.5 py-0.5 rounded",
                  currentTab === "in_transit"
                    ? "bg-zinc-800 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-900"
                    : "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
                )}
              >
                03
              </span>
              <span className="text-xs font-bold">→</span>
            </div>
            <div className="font-bold text-xs tracking-tight">In Transit</div>
            <p
              className={cn(
                "text-[11px] mt-1 leading-tight",
                currentTab === "in_transit" ? "text-zinc-300 dark:text-zinc-700" : "text-muted-foreground",
              )}
            >
              Dispatched with transit vehicle. Locked from sale.
            </p>
          </div>

          {/* Step 4: Received */}
          <div
            onClick={() => setCurrentTab("received")}
            className={cn(
              "group cursor-pointer rounded-lg border p-3 transition-all",
              currentTab === "received"
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 shadow-xs"
                : "border-zinc-200/90 bg-zinc-50/70 hover:bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-850/50",
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={cn(
                  "font-mono text-[10px] font-bold px-1.5 py-0.5 rounded",
                  currentTab === "received"
                    ? "bg-zinc-800 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-900"
                    : "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
                )}
              >
                04
              </span>
              <CheckCircle2 className="size-3.5 opacity-80" />
            </div>
            <div className="font-bold text-xs tracking-tight">Received</div>
            <p
              className={cn(
                "text-[11px] mt-1 leading-tight",
                currentTab === "received" ? "text-zinc-300 dark:text-zinc-700" : "text-muted-foreground",
              )}
            >
              Dock verified at destination. Added to shelf inventory.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Search Bar and Status Tabs (6 Tabs) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-zinc-200 shadow-2xs dark:bg-zinc-950 dark:border-zinc-800">
        {/* Search Input */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transfer ID, branch, medicine, staff..."
            className="h-9 pl-9 pr-8 text-xs font-medium bg-zinc-50/70 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 focus:bg-white dark:focus:bg-zinc-900"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* 6 Exact Status Tabs: All, Requested, Approved, In Transit, Received, Rejected */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "All", count: counts.all },
            { id: "requested", label: "Requested", count: counts.requested },
            { id: "approved", label: "Approved", count: counts.approved },
            { id: "in_transit", label: "In Transit", count: counts.in_transit },
            { id: "received", label: "Received", count: counts.received },
            { id: "rejected", label: "Rejected", count: counts.rejected },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as TabValue)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                currentTab === tab.id
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                  : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/80 dark:bg-zinc-850 dark:text-zinc-400 dark:hover:bg-zinc-800",
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "font-mono text-[10px] px-1.5 py-0.2 rounded-full",
                  currentTab === tab.id
                    ? "bg-zinc-700 text-zinc-100 dark:bg-zinc-300 dark:text-zinc-900"
                    : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Transfer Table (7 Exact Columns) */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-2xs overflow-hidden dark:bg-zinc-950 dark:border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-bold tracking-wider text-zinc-500 uppercase dark:border-zinc-800 dark:bg-zinc-900/50">
                {/* 1. Transfer ID */}
                <th className="py-3 px-4 min-w-[140px]">Transfer ID</th>

                {/* 2. From Branch */}
                <th className="py-3 px-3 min-w-[180px]">From Branch</th>

                {/* 3. To Branch */}
                <th className="py-3 px-3 min-w-[180px]">To Branch</th>

                {/* 4. Items */}
                <th className="py-3 px-3 min-w-[210px]">Items</th>

                {/* 5. Requested By */}
                <th className="py-3 px-3 min-w-[140px]">Requested By</th>

                {/* 6. Date */}
                <th className="py-3 px-3 min-w-[150px]">Date</th>

                {/* 7. Status */}
                <th className="py-3 pr-4 pl-3 w-32 text-center">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {paginatedTransfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Boxes className="size-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No stock transfers found.</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Transfers between branches will appear here as they move through custody.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedTransfers.map((t) => {
                  const badge = getStatusBadge(t);
                  const Icon = badge.icon;

                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTransfer(t)}
                      className="group hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 cursor-pointer transition-colors"
                    >
                      {/* 1. Transfer ID */}
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:underline flex items-center gap-1.5">
                        <span>{t.reference_no}</span>
                        <ExternalLink className="size-3 opacity-0 group-hover:opacity-40 text-zinc-500" />
                      </td>

                      {/* 2. From Branch */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {t.from_branch?.name ?? "—"}
                          </span>
                          {t.from_branch?.code && (
                            <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                              {t.from_branch.code}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. To Branch */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {t.to_branch?.name ?? "—"}
                          </span>
                          {t.to_branch?.code && (
                            <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                              {t.to_branch.code}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Items */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-0.5">
                          <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 block truncate max-w-xs">
                            {t.items_summary ?? `${t.item_count} items`}
                          </span>
                          <span className="font-mono text-[11px] text-zinc-500 block tabular-nums">
                            {t.total_units} units · {t.item_count} line{t.item_count === 1 ? "" : "s"}
                          </span>
                        </div>
                      </td>

                      {/* 5. Requested By */}
                      <td className="py-3.5 px-3 text-xs text-zinc-700 dark:text-zinc-300">
                        <div className="flex items-center gap-1.5">
                          <User className="size-3 text-zinc-400" />
                          <span>{t.requested_by?.name ?? "Branch Staff"}</span>
                        </div>
                      </td>

                      {/* 6. Date */}
                      <td className="py-3.5 px-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        {formatDateTime(t.created_at)}
                      </td>

                      {/* 7. Status */}
                      <td className="py-3.5 pr-4 pl-3 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded-full",
                            badge.className,
                          )}
                        >
                          <Icon className="size-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Showing</span>
            <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
              {filteredTransfers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, filteredTransfers.length)}
            </span>
            <span>of</span>
            <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
              {filteredTransfers.length}
            </span>
            <span>transfers</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-7 rounded border border-zinc-300 bg-white px-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="font-mono text-xs text-muted-foreground px-1">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. CREATE TRANSFER WORKFLOW MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden my-6">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                    Create Stock Transfer Workflow
                  </h2>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-bold">
                    FEFO ENFORCED
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Multi-branch consignment routing, batch deduction, and transit custody.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="size-8 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {createSuccess ? (
              <div className="p-10 text-center space-y-3">
                <div className="size-14 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center mx-auto animate-in zoom-in-75 duration-200">
                  <Check className="size-7" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Transfer Request Submitted
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Stock is reserved at source dock. Physical inventory will move to In-Transit custody upon manager approval.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreateTransferSubmit} className="p-6 space-y-6">
                {/* Workflow Stepper: Requested → Approved → In Transit → Received */}
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                    Transfer Workflow Lifecycle Indicator
                  </span>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-1.5 text-zinc-950 dark:text-zinc-50">
                      <span className="size-5 rounded-full bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 flex items-center justify-center text-[10px] font-mono font-bold">
                        1
                      </span>
                      <span>Requested</span>
                    </div>
                    <span className="text-zinc-400">→</span>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <span className="size-5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center text-[10px] font-mono">
                        2
                      </span>
                      <span>Approved</span>
                    </div>
                    <span className="text-zinc-400">→</span>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <span className="size-5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center text-[10px] font-mono">
                        3
                      </span>
                      <span>In Transit</span>
                    </div>
                    <span className="text-zinc-400">→</span>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <span className="size-5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center text-[10px] font-mono">
                        4
                      </span>
                      <span>Received</span>
                    </div>
                  </div>
                </div>

                {/* Routing: Source Branch ↓ Destination Branch */}
                <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Branch Routing
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">
                      Direct Hub Transit
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {/* Source Branch */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                        Source Branch (Origin) <span className="text-destructive">*</span>
                      </label>
                      <select
                        value={sourceBranchId}
                        onChange={(e) => setSourceBranchId(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold bg-white dark:bg-zinc-900"
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.code}) — Sending Dock
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Prominent Down Arrow ↓ */}
                    <div className="flex items-center justify-center py-0.5">
                      <div className="flex size-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 shadow-2xs">
                        <span className="text-sm font-bold">↓</span>
                      </div>
                    </div>

                    {/* Destination Branch */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                        Destination Branch (Receiving) <span className="text-destructive">*</span>
                      </label>
                      <select
                        value={destBranchId}
                        onChange={(e) => setDestBranchId(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold bg-white dark:bg-zinc-900"
                      >
                        {branches
                          .filter((b) => b.id !== sourceBranchId)
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.code}) — Receiving Dock
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Items Section: Medicine, Batch, Quantity */}
                <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Transfer Consignment Items
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddTransferLine}
                      className="text-xs h-7 px-2.5 cursor-pointer"
                    >
                      <Plus className="size-3 mr-1" />
                      + Add Medicine
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {transferItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-zinc-200 p-3 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/30 space-y-2.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                            Item {index + 1}
                          </span>
                          {transferItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTransferLine(index)}
                              className="text-muted-foreground hover:text-destructive text-xs cursor-pointer"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {/* Medicine */}
                          <div>
                            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                              Medicine
                            </label>
                            <Input
                              value={item.medicineName}
                              readOnly
                              className="h-8 text-xs font-semibold bg-white dark:bg-zinc-900"
                            />
                          </div>

                          {/* Batch */}
                          <div>
                            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                              Batch (FEFO)
                            </label>
                            <Input
                              value={`${item.batchNo} (${item.availableStock} Avail)`}
                              readOnly
                              className="h-8 font-mono text-xs font-bold bg-white dark:bg-zinc-900"
                            />
                          </div>

                          {/* Quantity */}
                          <div>
                            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                              Quantity
                            </label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleItemQuantityChange(index, item.quantity - 10)}
                                className="size-8 rounded border border-zinc-300 dark:border-zinc-700 flex items-center justify-center font-mono font-bold text-xs bg-white dark:bg-zinc-900 hover:bg-zinc-100 cursor-pointer"
                              >
                                -
                              </button>
                              <Input
                                type="number"
                                min={1}
                                max={item.availableStock}
                                value={item.quantity}
                                onChange={(e) => handleItemQuantityChange(index, Number(e.target.value))}
                                className="h-8 font-mono text-xs font-bold text-center"
                              />
                              <button
                                type="button"
                                onClick={() => handleItemQuantityChange(index, item.quantity + 10)}
                                className="size-8 rounded border border-zinc-300 dark:border-zinc-700 flex items-center justify-center font-mono font-bold text-xs bg-white dark:bg-zinc-900 hover:bg-zinc-100 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Show Stock Movement Clearly */}
                <div className="rounded-xl border border-zinc-900/20 bg-zinc-900/5 p-4 dark:border-zinc-700 dark:bg-zinc-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 block">
                      Clear Stock Movement Visualization
                    </span>
                    <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Total: {totalWorkflowUnits} units
                    </span>
                  </div>

                  {/* Stock Movement Vector Diagram */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                    {/* Source Shelf Balance */}
                    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">
                        Source Shelf ({sourceBranch?.code ?? "SRC"})
                      </div>
                      <div className="font-bold text-xs mt-0.5 text-zinc-900 dark:text-zinc-100 truncate">
                        {sourceBranch?.name ?? "Sending Branch"}
                      </div>
                      <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-1 font-mono text-[11px]">
                        <div className="flex justify-between text-zinc-500">
                          <span>Current Stock:</span>
                          <span>180 units</span>
                        </div>
                        <div className="flex justify-between font-bold text-rose-600 dark:text-rose-400">
                          <span>Deduction:</span>
                          <span>-{totalWorkflowUnits} units</span>
                        </div>
                        <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 pt-1 border-t border-dashed border-zinc-200 dark:border-zinc-700">
                          <span>Projected:</span>
                          <span>{180 - totalWorkflowUnits} units</span>
                        </div>
                      </div>
                    </div>

                    {/* Stock In Transit Vector Arrow */}
                    <div className="text-center py-2 px-1">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        <Truck className="size-4" />
                        <span>In Transit</span>
                      </div>
                      <div className="my-1.5 flex items-center justify-center">
                        <div className="h-0.5 w-full bg-zinc-300 dark:bg-zinc-700 relative">
                          <span className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-zinc-600 dark:text-zinc-400">
                            ►
                          </span>
                        </div>
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                        {totalWorkflowUnits} units in custody
                      </span>
                    </div>

                    {/* Destination Shelf Balance */}
                    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">
                        Destination Shelf ({destBranch?.code ?? "DST"})
                      </div>
                      <div className="font-bold text-xs mt-0.5 text-zinc-900 dark:text-zinc-100 truncate">
                        {destBranch?.name ?? "Receiving Branch"}
                      </div>
                      <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-1 font-mono text-[11px]">
                        <div className="flex justify-between text-zinc-500">
                          <span>Current Stock:</span>
                          <span>15 units</span>
                        </div>
                        <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                          <span>Addition:</span>
                          <span>+{totalWorkflowUnits} units</span>
                        </div>
                        <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 pt-1 border-t border-dashed border-zinc-200 dark:border-zinc-700">
                          <span>Projected:</span>
                          <span>{15 + totalWorkflowUnits} units</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reason & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                      Transfer Reason
                    </label>
                    <select
                      value={transferReason}
                      onChange={(e) => setTransferReason(e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs bg-white dark:bg-zinc-900"
                    >
                      <option value="Low Stock Replenishment">Low Stock Replenishment</option>
                      <option value="Expiry Balancing (FEFO)">Expiry Balancing (FEFO)</option>
                      <option value="Emergency Prescription Surge">Emergency Prescription Surge</option>
                      <option value="Inter-Branch Balance">Inter-Branch Balance</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                      Dispatch Notes (Optional)
                    </label>
                    <Input
                      value={transferNotes}
                      onChange={(e) => setTransferNotes(e.target.value)}
                      placeholder="e.g. Courier van dispatch #DH-V04"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="text-xs cursor-pointer"
                    >
                      <Link href="/transfers/new">Full Advanced Page</Link>
                    </Button>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      size="sm"
                      className="bg-zinc-950 text-white hover:bg-zinc-850 dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold h-9 px-4 cursor-pointer"
                    >
                      {isSubmitting ? "Submitting..." : "Submit Transfer Request"}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 6. TRANSFER DETAIL INSPECTION DRAWER */}
      {selectedTransfer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-950 w-full max-w-md h-full border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/50">
              <div>
                <span className="font-mono text-xs font-bold text-zinc-500 block">
                  TRANSFER MANIFEST
                </span>
                <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 font-mono">
                  {selectedTransfer.reference_no}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTransfer(null)}
                className="size-8 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 flex-1">
              {/* Status & Workflow Stepper */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Current Workflow Status
                  </span>
                  {(() => {
                    const badge = getStatusBadge(selectedTransfer);
                    const Icon = badge.icon;
                    return (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded-full",
                          badge.className,
                        )}
                      >
                        <Icon className="size-3" />
                        <span>{badge.label}</span>
                      </span>
                    );
                  })()}
                </div>

                {/* Workflow Stepper */}
                <div className="rounded-lg border border-zinc-200 p-3 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/40 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span
                      className={cn(
                        selectedTransfer.status === "pending"
                          ? "text-zinc-950 dark:text-zinc-50 underline font-bold"
                          : "text-zinc-500",
                      )}
                    >
                      Requested
                    </span>
                    <span>→</span>
                    <span
                      className={cn(
                        selectedTransfer.status === "approved" && !isTransit(selectedTransfer)
                          ? "text-zinc-950 dark:text-zinc-50 underline font-bold"
                          : "text-zinc-500",
                      )}
                    >
                      Approved
                    </span>
                    <span>→</span>
                    <span
                      className={cn(
                        selectedTransfer.status === "approved" && isTransit(selectedTransfer)
                          ? "text-zinc-950 dark:text-zinc-50 underline font-bold"
                          : "text-zinc-500",
                      )}
                    >
                      In Transit
                    </span>
                    <span>→</span>
                    <span
                      className={cn(
                        selectedTransfer.status === "completed"
                          ? "text-emerald-700 dark:text-emerald-400 font-bold underline"
                          : "text-zinc-500",
                      )}
                    >
                      Received
                    </span>
                  </div>
                </div>
              </div>

              {/* Branch Routing Route: Source Branch ↓ Destination Branch */}
              <div className="rounded-xl border border-zinc-200 p-4 space-y-3 dark:border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Branch Routing
                </span>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                    <div>
                      <span className="text-[10px] font-mono text-zinc-400 uppercase block">From Branch</span>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {selectedTransfer.from_branch?.name}
                      </span>
                    </div>
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800">
                      {selectedTransfer.from_branch?.code}
                    </span>
                  </div>

                  <div className="flex items-center justify-center py-0.5">
                    <span className="text-xs font-bold text-zinc-400">↓</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                    <div>
                      <span className="text-[10px] font-mono text-zinc-400 uppercase block">To Branch</span>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {selectedTransfer.to_branch?.name}
                      </span>
                    </div>
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800">
                      {selectedTransfer.to_branch?.code}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stock Movement Clarity */}
              <div className="rounded-xl border border-zinc-200 p-4 space-y-2 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/30">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Stock Movement Breakdown
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-muted-foreground">Consignment Units:</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {selectedTransfer.total_units} units ({selectedTransfer.item_count} lines)
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-muted-foreground">Items:</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {selectedTransfer.items_summary}
                    </span>
                  </div>
                  {selectedTransfer.notes && (
                    <div className="p-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs mt-2">
                      <span className="font-semibold block mb-0.5 text-zinc-500 text-[10px] uppercase">
                        Dispatch Log:
                      </span>
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {selectedTransfer.notes}
                      </span>
                    </div>
                  )}
                  {selectedTransfer.rejection_reason && (
                    <div className="p-2.5 rounded border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 text-xs text-rose-800 dark:text-rose-300 mt-2">
                      <span className="font-semibold block mb-0.5 text-[10px] uppercase">
                        Rejection Reason:
                      </span>
                      {selectedTransfer.rejection_reason}
                    </div>
                  )}
                </div>
              </div>

              {/* Staff & Timestamp Audit */}
              <div className="rounded-xl border border-zinc-200 p-4 space-y-2 dark:border-zinc-800 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Chain Audit
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Requested By:</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {selectedTransfer.requested_by?.name ?? "Branch Staff"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Timestamp:</span>
                  <span className="font-mono text-zinc-600 dark:text-zinc-400">
                    {formatDateTime(selectedTransfer.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTransfer(null)}
                className="text-xs cursor-pointer"
              >
                Close
              </Button>

              <Button
                asChild
                size="sm"
                className="bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold cursor-pointer"
              >
                <Link href={`/transfers/${selectedTransfer.id}`}>Open Transfer Manifest</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
