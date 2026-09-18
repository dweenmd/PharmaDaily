"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
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
  ExternalLink,
  FileText,
  MapPin,
  Package,
  PackageCheck,
  Plus,
  Search,
  ShieldAlert,
  Truck,
  User,
  X,
  XCircle,
} from "lucide-react";

import { type TransferListRow } from "@/features/transfers/queries";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type TabValue = "all" | "requested" | "approved" | "in_transit" | "received" | "rejected";

type Props = {
  transfers: TransferListRow[];
  canRequest: boolean;
  myBranchId: string | null;
  branches: { id: string; name: string; code: string }[];
};

export function TransfersClient({ transfers, canRequest, myBranchId, branches }: Props) {
  const router = useRouter();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentTab, setCurrentTab] = React.useState<TabValue>("all");

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Quick Transfer Workflow Modal State
  const [isQuickTransferOpen, setIsQuickTransferOpen] = React.useState(false);
  const [sourceBranch, setSourceBranch] = React.useState(myBranchId ?? branches[0]?.id ?? "");
  const [destBranch, setDestBranch] = React.useState(
    branches.find((b) => b.id !== (myBranchId ?? branches[0]?.id))?.id ?? "",
  );
  const [selectedMed, setSelectedMed] = React.useState("Napa 500mg");
  const [selectedBatch, setSelectedBatch] = React.useState("BX-9810");
  const [transferQty, setTransferQty] = React.useState(50);
  const [sourceStock, setSourceStock] = React.useState(180);
  const [destStock, setDestStock] = React.useState(15);
  const [quickTransferSuccess, setQuickTransferSuccess] = React.useState(false);

  // Map status tabs to transfer status
  function matchTab(t: TransferListRow, tab: TabValue): boolean {
    if (tab === "all") return true;
    if (tab === "requested") return t.status === "pending";
    if (tab === "approved") return t.status === "approved";
    if (tab === "in_transit") return t.status === "approved"; // Approved stock is in transit
    if (tab === "received") return t.status === "completed";
    if (tab === "rejected") return t.status === "rejected";
    return true;
  }

  // Counts for each tab
  const counts = React.useMemo(() => {
    return {
      all: transfers.length,
      requested: transfers.filter((t) => t.status === "pending").length,
      approved: transfers.filter((t) => t.status === "approved").length,
      in_transit: transfers.filter((t) => t.status === "approved").length,
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

  function getStatusBadge(status: string) {
    switch (status) {
      case "pending":
        return {
          label: "Requested",
          className: "bg-zinc-100 text-zinc-900 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100",
          icon: Clock,
          step: 1,
        };
      case "approved":
        return {
          label: "In Transit",
          className: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
          icon: Truck,
          step: 3,
        };
      case "completed":
        return {
          label: "Received",
          className: "bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
          icon: CheckCircle2,
          step: 4,
        };
      case "rejected":
        return {
          label: "Rejected",
          className: "bg-rose-50 text-rose-800 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
          icon: XCircle,
          step: 0,
        };
      default:
        return {
          label: status,
          className: "bg-zinc-100 text-zinc-700",
          icon: Clock,
          step: 1,
        };
    }
  }

  function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault();
    setQuickTransferSuccess(true);
    setTimeout(() => {
      setIsQuickTransferOpen(false);
      setQuickTransferSuccess(false);
      router.refresh();
    }, 1200);
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 font-medium">
            <span>Inventory Management</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Stock Transfers</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Stock Transfers
            </h1>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700">
              ENTERPRISE ROUTING
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Inter-branch consignment movement, batch tracking, and chain inventory routing.
          </p>
        </div>

        {canRequest && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsQuickTransferOpen(true)}
              className="bg-zinc-950 hover:bg-zinc-850 dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold shadow-xs"
            >
              <Plus className="mr-1.5 size-3.5" />
              + Request Transfer
            </Button>
          </div>
        )}
      </div>

      {/* Enterprise Workflow Indicator Widget */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="size-4 text-zinc-600 dark:text-zinc-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Transfer Lifecycle & Stock Movement Indicator
            </h2>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            Strict Chain Custody
          </span>
        </div>

        {/* 4-Step Stepper: Requested → Approved → In Transit → Received */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:gap-4 pt-1">
          {/* 1. Requested */}
          <div className="flex items-start gap-3 rounded-lg border border-zinc-200/80 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-zinc-200 font-mono text-xs font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              01
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Requested</span>
                <span className="text-[10px] text-zinc-400">→</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                Stock reserved at source dock. Not yet deducted.
              </p>
            </div>
          </div>

          {/* 2. Approved */}
          <div className="flex items-start gap-3 rounded-lg border border-zinc-200/80 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-zinc-200 font-mono text-xs font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              02
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Approved</span>
                <span className="text-[10px] text-zinc-400">→</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                Source manager approves. Dispatched from source shelf.
              </p>
            </div>
          </div>

          {/* 3. In Transit */}
          <div className="flex items-start gap-3 rounded-lg border border-zinc-950/20 bg-zinc-900/5 p-3 dark:border-zinc-700 dark:bg-zinc-900/60">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-zinc-950 font-mono text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">
              03
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-950 dark:text-white">In Transit</span>
                <span className="text-[10px] text-zinc-400">→</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                On delivery van. Locked from sale at both branches.
              </p>
            </div>
          </div>

          {/* 4. Received */}
          <div className="flex items-start gap-3 rounded-lg border border-zinc-200/80 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-100 font-mono text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              04
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Received</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                Count counted in at destination. Available on shelf.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Tabs and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-zinc-200 shadow-2xs dark:bg-zinc-950 dark:border-zinc-800">
        {/* Search */}
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
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* 6 Status Tabs Requested */}
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
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
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

      {/* Transfer Table (7 Exact Columns) */}
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
                <th className="py-3 px-3 min-w-[200px]">Items</th>

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
                  const badge = getStatusBadge(t.status);
                  const Icon = badge.icon;
                  const isOutgoing = t.from_branch_id === myBranchId;
                  const isIncoming = t.to_branch_id === myBranchId;

                  return (
                    <tr
                      key={t.id}
                      onClick={() => router.push(`/transfers/${t.id}`)}
                      className="group hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 cursor-pointer transition-colors"
                    >
                      {/* 1. Transfer ID */}
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:underline flex items-center gap-1.5">
                        <Link href={`/transfers/${t.id}`}>{t.reference_no}</Link>
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

      {/* CREATE TRANSFER WORKFLOW MODAL */}
      {isQuickTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-950 w-full max-w-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40">
              <div>
                <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                  Request Stock Transfer
                </h2>
                <p className="text-xs text-muted-foreground">
                  Move inventory between branch warehouses with audit tracking.
                </p>
              </div>
              <button
                onClick={() => setIsQuickTransferOpen(false)}
                className="size-8 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-700"
              >
                <X className="size-4" />
              </button>
            </div>

            {quickTransferSuccess ? (
              <div className="p-8 text-center space-y-3">
                <div className="size-12 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center mx-auto">
                  <Check className="size-6" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Transfer Request Submitted
                </h3>
                <p className="text-xs text-muted-foreground">
                  Stock reservation generated. Awaiting approval from source branch manager.
                </p>
              </div>
            ) : (
              <form onSubmit={handleQuickSubmit} className="p-6 space-y-5">
                {/* Visual Branch Routing: Source Branch ↓ Destination Branch */}
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Branch Routing
                  </span>

                  <div className="space-y-2">
                    {/* Source Branch */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Source Branch (Sending)
                      </label>
                      <select
                        value={sourceBranch}
                        onChange={(e) => setSourceBranch(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-medium bg-white dark:bg-zinc-900"
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Prominent Down Arrow ↓ */}
                    <div className="flex items-center justify-center py-1">
                      <div className="flex size-6 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 shadow-2xs">
                        <ArrowDown className="size-3.5" />
                      </div>
                    </div>

                    {/* Destination Branch */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Destination Branch (Receiving)
                      </label>
                      <select
                        value={destBranch}
                        onChange={(e) => setDestBranch(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-medium bg-white dark:bg-zinc-900"
                      >
                        {branches
                          .filter((b) => b.id !== sourceBranch)
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.code})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Items Section: Medicine, Batch, Quantity */}
                <div className="rounded-xl border border-zinc-200 p-4 space-y-3 dark:border-zinc-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Transfer Items
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Medicine */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Medicine
                      </label>
                      <select
                        value={selectedMed}
                        onChange={(e) => setSelectedMed(e.target.value)}
                        className="w-full h-9 px-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-medium bg-white dark:bg-zinc-900"
                      >
                        <option value="Napa 500mg">Napa 500mg</option>
                        <option value="Seclo 20mg">Seclo 20mg</option>
                        <option value="Zimax 500mg">Zimax 500mg</option>
                        <option value="Sergel 20mg">Sergel 20mg</option>
                      </select>
                    </div>

                    {/* Batch */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Batch
                      </label>
                      <select
                        value={selectedBatch}
                        onChange={(e) => setSelectedBatch(e.target.value)}
                        className="w-full h-9 px-2 font-mono text-xs uppercase font-bold rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                      >
                        <option value="BX-9810">BX-9810 (180 Avail)</option>
                        <option value="BX-8402">BX-8402 (75 Avail)</option>
                        <option value="ZM-4109">ZM-4109 (90 Avail)</option>
                      </select>
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Quantity
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={sourceStock}
                        value={transferQty}
                        onChange={(e) => setTransferQty(Math.min(sourceStock, Math.max(1, Number(e.target.value))))}
                        className="h-9 font-mono text-xs font-bold text-right"
                      />
                    </div>
                  </div>

                  {/* Live Stock Movement Preview */}
                  <div className="rounded-lg border border-zinc-200/80 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900/50 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Live Stock Movement Preview
                    </span>
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-zinc-600 dark:text-zinc-400">Sending Shelf Balance:</span>
                      <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                        {sourceStock} → {sourceStock - transferQty} units{" "}
                        <span className="text-rose-600">(-{transferQty})</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-zinc-600 dark:text-zinc-400">Receiving Shelf Balance:</span>
                      <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                        {destStock} → {destStock + transferQty} units{" "}
                        <span className="text-emerald-600">(+{transferQty})</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsQuickTransferOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      <Link href="/transfers/new">Full Form</Link>
                    </Button>

                    <Button
                      type="submit"
                      size="sm"
                      className="bg-zinc-950 text-white hover:bg-zinc-850 dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold"
                    >
                      Submit Transfer Request
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
