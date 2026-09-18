"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Receipt,
  Search,
  Truck,
  Wallet,
  X,
} from "lucide-react";

import { RecordPaymentDialog } from "@/features/customers/components/record-payment-dialog";
import { type SupplierWithStats } from "@/features/suppliers/queries";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SortField = "name" | "total_purchases" | "paid_amount" | "outstanding_amount" | "last_purchase_date";
type SortDirection = "asc" | "desc";

type Props = {
  suppliers: SupplierWithStats[];
  canEdit: boolean;
  canPay: boolean;
  branchId: string | null;
};

export function SuppliersClient({ suppliers, canEdit, canPay, branchId }: Props) {
  const router = useRouter();

  // Filter & Search state
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "due" | "inactive">("all");

  // Sorting
  const [sortField, setSortField] = React.useState<SortField>("outstanding_amount");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(15);

  // Summary Metrics
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter((s) => s.is_active).length;
  const totalOutstandingPayables = suppliers.reduce((sum, s) => sum + (Number(s.outstanding_amount) || 0), 0);
  const suppliersWithDue = suppliers.filter((s) => Number(s.outstanding_amount) > 0).length;

  // Filtered Suppliers
  const filteredSuppliers = React.useMemo(() => {
    return suppliers.filter((s) => {
      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(term);
        const matchesPhone = s.phone?.toLowerCase().includes(term) ?? false;
        const matchesEmail = s.email?.toLowerCase().includes(term) ?? false;
        const matchesAddress = s.address?.toLowerCase().includes(term) ?? false;
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesAddress) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === "active" && !s.is_active) return false;
      if (statusFilter === "inactive" && s.is_active) return false;
      if (statusFilter === "due" && Number(s.outstanding_amount) <= 0) return false;

      return true;
    });
  }, [suppliers, searchTerm, statusFilter]);

  // Sorted Suppliers
  const sortedSuppliers = React.useMemo(() => {
    return [...filteredSuppliers].sort((a, b) => {
      let valA: string | number = a[sortField] ?? "";
      let valB: string | number = b[sortField] ?? "";

      if (typeof valA === "string" && typeof valB === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      const numA = Number(valA) || 0;
      const numB = Number(valB) || 0;
      return sortDirection === "asc" ? numA - numB : numB - numA;
    });
  }, [filteredSuppliers, sortField, sortDirection]);

  // Paginated Suppliers
  const totalPages = Math.ceil(sortedSuppliers.length / pageSize) || 1;
  const paginatedSuppliers = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedSuppliers.slice(start, start + pageSize);
  }, [sortedSuppliers, currentPage, pageSize]);

  // Reset pagination on search / filter
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }

  function renderSortIcon(field: SortField) {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 size-3 text-zinc-400 opacity-60" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 size-3 text-zinc-900 dark:text-zinc-100" />
    ) : (
      <ArrowDown className="ml-1 size-3 text-zinc-900 dark:text-zinc-100" />
    );
  }

  function getMonogram(name: string) {
    return name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>Procurement & Accounts</span>
            <span>/</span>
            <span className="text-foreground font-medium">Suppliers</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Suppliers
            </h1>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              ERP ACCOUNTS
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Distributors, manufacturer accounts, and procurement payables.
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <Button asChild className="bg-zinc-950 hover:bg-zinc-850 dark:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold shadow-xs">
              <Link href="/suppliers/new">
                <Plus className="mr-1.5 size-3.5" />
                Add Supplier
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Suppliers */}
        <Card className="border-zinc-200 shadow-2xs dark:border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Suppliers
              </span>
              <Building2 className="size-4 text-zinc-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-50 tabular-nums">
                {totalSuppliers}
              </span>
              <span className="text-xs text-muted-foreground">companies registered</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Suppliers */}
        <Card className="border-zinc-200 shadow-2xs dark:border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Active Suppliers
              </span>
              <Truck className="size-4 text-zinc-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-50 tabular-nums">
                {activeSuppliers}
              </span>
              <span className="text-xs text-muted-foreground">
                active accounts ({Math.round((activeSuppliers / (totalSuppliers || 1)) * 100)}%)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Payables */}
        <Card className="border-zinc-200 shadow-2xs dark:border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Outstanding Payables
              </span>
              <Wallet className="size-4 text-zinc-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-zinc-950 dark:text-white tabular-nums">
                {formatCurrency(totalOutstandingPayables)}
              </span>
              {suppliersWithDue > 0 && (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  across {suppliersWithDue} suppliers
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-zinc-200 shadow-2xs dark:bg-zinc-950 dark:border-zinc-800">
        {/* Search Input */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search supplier..."
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

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "All", count: totalSuppliers },
            { id: "active", label: "Active", count: activeSuppliers },
            { id: "due", label: "Outstanding", count: suppliersWithDue },
            { id: "inactive", label: "Inactive", count: totalSuppliers - activeSuppliers },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                statusFilter === tab.id
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                  : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/80 dark:bg-zinc-850 dark:text-zinc-400 dark:hover:bg-zinc-800",
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "font-mono text-[10px] px-1.5 py-0.2 rounded-full",
                  statusFilter === tab.id
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

      {/* Supplier Data Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-2xs overflow-hidden dark:bg-zinc-950 dark:border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase dark:border-zinc-800 dark:bg-zinc-900/50">
                {/* Supplier */}
                <th
                  onClick={() => handleSort("name")}
                  className="py-3 px-4 min-w-[240px] cursor-pointer hover:bg-zinc-100/80 dark:hover:bg-zinc-850 transition-colors"
                >
                  <div className="flex items-center">
                    <span>Supplier</span>
                    {renderSortIcon("name")}
                  </div>
                </th>

                {/* Phone */}
                <th className="py-3 px-3 min-w-[130px]">Phone</th>

                {/* Email */}
                <th className="py-3 px-3 min-w-[180px]">Email</th>

                {/* Total Purchases */}
                <th
                  onClick={() => handleSort("total_purchases")}
                  className="py-3 px-3 min-w-[130px] text-right cursor-pointer hover:bg-zinc-100/80 dark:hover:bg-zinc-850 transition-colors"
                >
                  <div className="flex items-center justify-end">
                    <span>Total Purchases</span>
                    {renderSortIcon("total_purchases")}
                  </div>
                </th>

                {/* Paid */}
                <th
                  onClick={() => handleSort("paid_amount")}
                  className="py-3 px-3 min-w-[110px] text-right cursor-pointer hover:bg-zinc-100/80 dark:hover:bg-zinc-850 transition-colors"
                >
                  <div className="flex items-center justify-end">
                    <span>Paid</span>
                    {renderSortIcon("paid_amount")}
                  </div>
                </th>

                {/* Outstanding */}
                <th
                  onClick={() => handleSort("outstanding_amount")}
                  className="py-3 px-3 min-w-[120px] text-right cursor-pointer hover:bg-zinc-100/80 dark:hover:bg-zinc-850 transition-colors"
                >
                  <div className="flex items-center justify-end">
                    <span>Outstanding</span>
                    {renderSortIcon("outstanding_amount")}
                  </div>
                </th>

                {/* Last Purchase */}
                <th
                  onClick={() => handleSort("last_purchase_date")}
                  className="py-3 px-3 min-w-[130px] text-center cursor-pointer hover:bg-zinc-100/80 dark:hover:bg-zinc-850 transition-colors"
                >
                  <div className="flex items-center justify-center">
                    <span>Last Purchase</span>
                    {renderSortIcon("last_purchase_date")}
                  </div>
                </th>

                {/* Status */}
                <th className="py-3 px-3 w-24 text-center">Status</th>

                {/* Actions */}
                <th className="py-3 pr-4 pl-2 w-32 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {paginatedSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <Truck className="size-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No suppliers found.</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Try adjusting your search term or filter selection.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map((s) => {
                  const due = Number(s.outstanding_amount) || 0;
                  const totalPurchases = Number(s.total_purchases) || 0;
                  const paid = Number(s.paid_amount) || 0;

                  return (
                    <tr
                      key={s.id}
                      onClick={() => router.push(`/suppliers/${s.id}`)}
                      className="group hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 cursor-pointer transition-colors"
                    >
                      {/* Supplier Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-100 font-mono text-xs font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                            {getMonogram(s.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-zinc-900 group-hover:text-zinc-950 dark:text-zinc-100 dark:group-hover:text-white truncate">
                                {s.name}
                              </span>
                              <ExternalLink className="size-3 opacity-0 group-hover:opacity-40 text-zinc-500 transition-opacity" />
                            </div>
                            {s.address && (
                              <p className="text-xs text-muted-foreground truncate max-w-xs">
                                {s.address}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-3">
                        {s.phone ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs font-mono text-zinc-700 dark:text-zinc-300"
                          >
                            <Phone className="size-3 text-zinc-400" />
                            <a href={`tel:${s.phone}`} className="hover:underline">
                              {s.phone}
                            </a>
                          </div>
                        ) : (
                          <span className="text-zinc-400 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-3">
                        {s.email ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs font-mono text-zinc-700 dark:text-zinc-300 truncate max-w-[190px]"
                          >
                            <Mail className="size-3 text-zinc-400 shrink-0" />
                            <a href={`mailto:${s.email}`} className="hover:underline truncate">
                              {s.email}
                            </a>
                          </div>
                        ) : (
                          <span className="text-zinc-400 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* Total Purchases */}
                      <td className="py-3.5 px-3 text-right">
                        <span className="font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">
                          {formatCurrency(totalPurchases)}
                        </span>
                      </td>

                      {/* Paid */}
                      <td className="py-3.5 px-3 text-right">
                        <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">
                          {formatCurrency(paid)}
                        </span>
                      </td>

                      {/* Outstanding */}
                      <td className="py-3.5 px-3 text-right">
                        <span
                          className={cn(
                            "font-mono text-xs tabular-nums font-bold px-2 py-0.5 rounded-md",
                            due > 0
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                              : "text-zinc-500 dark:text-zinc-400",
                          )}
                        >
                          {formatCurrency(due)}
                        </span>
                      </td>

                      {/* Last Purchase */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                          {formatDate(s.last_purchase_date)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center font-mono text-[10px] font-medium px-2 py-0.5 rounded-full",
                            s.is_active
                              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                              : "border border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400",
                          )}
                        >
                          {s.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td
                        onClick={(e) => e.stopPropagation()}
                        className="py-3.5 pr-4 pl-2 text-right"
                      >
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick Payment Button if Due */}
                          {canPay && due > 0 && branchId && (
                            <RecordPaymentDialog
                              kind="supplier"
                              targetId={s.id}
                              targetName={s.name}
                              branchId={branchId}
                              outstanding={due}
                            />
                          )}

                          {/* View Detail Link */}
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs font-medium"
                          >
                            <Link href={`/suppliers/${s.id}`}>View</Link>
                          </Button>

                          {/* Edit Supplier Link */}
                          {canEdit && (
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                            >
                              <Link href={`/suppliers/${s.id}/edit`}>Edit</Link>
                            </Button>
                          )}
                        </div>
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
              {filteredSuppliers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, filteredSuppliers.length)}
            </span>
            <span>of</span>
            <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
              {filteredSuppliers.length}
            </span>
            <span>suppliers</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-7 rounded border border-zinc-300 bg-white px-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Previous & Next Buttons */}
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
    </div>
  );
}
