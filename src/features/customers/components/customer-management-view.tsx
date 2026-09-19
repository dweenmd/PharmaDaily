"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  History,
  Mail,
  Phone,
  Plus,
  Receipt,
  Search,
  UserCheck,
  UserMinus,
  Users,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddCustomerDialog } from "@/features/customers/components/add-customer-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  CustomerCRMItem,
  DEFAULT_CRM_CUSTOMERS,
  DEMO_RAHIM,
} from "@/features/customers/constants";

export { DEFAULT_CRM_CUSTOMERS, DEMO_RAHIM, type CustomerCRMItem };

type SortColumn = "name" | "total_purchases" | "bills" | "outstanding" | "last_visit";
type SortDirection = "asc" | "desc";
type FilterTab = "all" | "active" | "due" | "inactive";

interface CustomerManagementViewProps {
  initialCustomers?: CustomerCRMItem[];
}

export function CustomerManagementView({
  initialCustomers = DEFAULT_CRM_CUSTOMERS,
}: CustomerManagementViewProps) {
  // Merge prop data with default CRM records safely
  const allCustomers: CustomerCRMItem[] = React.useMemo(() => {
    const validCustomers = (initialCustomers ?? []).filter(
      (c): c is CustomerCRMItem => Boolean(c && c.id && c.name),
    );
    if (validCustomers.length === 0) {
      return DEFAULT_CRM_CUSTOMERS;
    }
    const hasRahim = validCustomers.some(
      (c) => c?.name && c.name.toLowerCase().includes("rahim"),
    );
    if (!hasRahim && DEMO_RAHIM) {
      return [DEMO_RAHIM, ...validCustomers];
    }
    return validCustomers;
  }, [initialCustomers]);

  // State
  const [search, setSearch] = React.useState("");
  const [filterTab, setFilterTab] = React.useState<FilterTab>("all");
  const [sortCol, setSortCol] = React.useState<SortColumn>("last_visit");
  const [sortDir, setSortDir] = React.useState<SortDirection>("desc");
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  // Summary KPI Calculations
  const totalCustomers = allCustomers.length;
  const activeCustomers = allCustomers.filter((c) => c.is_active).length;
  const customersWithDue = allCustomers.filter((c) => c.outstanding > 0);
  const totalOutstanding = allCustomers.reduce((acc, c) => acc + c.outstanding, 0);

  // Sorting Handler
  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  // Filtered & Sorted Records
  const processedCustomers = React.useMemo(() => {
    let result = [...allCustomers];

    // 1. Search Query
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)),
      );
    }

    // 2. Filter Tabs
    if (filterTab === "active") {
      result = result.filter((c) => c.is_active);
    } else if (filterTab === "due") {
      result = result.filter((c) => c.outstanding > 0);
    } else if (filterTab === "inactive") {
      result = result.filter((c) => !c.is_active);
    }

    // 3. Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortCol) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "total_purchases":
          comparison = a.total_purchases - b.total_purchases;
          break;
        case "bills":
          comparison = a.bills - b.bills;
          break;
        case "outstanding":
          comparison = a.outstanding - b.outstanding;
          break;
        case "last_visit":
          comparison = new Date(a.last_visit).getTime() - new Date(b.last_visit).getTime();
          break;
      }
      return sortDir === "asc" ? comparison : -comparison;
    });

    return result;
  }, [allCustomers, search, filterTab, sortCol, sortDir]);

  // Reset pagination on filter or search change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, filterTab, pageSize]);

  // Pagination Slice
  const totalItems = processedCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCustomers = processedCustomers.slice(startIndex, startIndex + pageSize);

  // Helper render sort icon
  const renderSortIcon = (col: SortColumn) => {
    if (sortCol !== col) {
      return <ArrowUpDown className="size-3 text-zinc-400 opacity-60" />;
    }
    return sortDir === "asc" ? (
      <ArrowUp className="size-3 text-zinc-900 dark:text-white" />
    ) : (
      <ArrowDown className="size-3 text-zinc-900 dark:text-white" />
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Title & Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Customers</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enterprise customer relationship ledger and credit accounts.
          </p>
        </div>

        <AddCustomerDialog
          trigger={
            <Button className="h-10 px-4 rounded-xl font-bold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-2xs gap-2 cursor-pointer">
              <Plus className="size-4" />
              <span>+ New Customer</span>
            </Button>
          }
        />
      </div>

      {/* 2. Summary KPI Section (4 Cards) */}
      <div className="grid grid-cols-1 min-[440px]:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Customers */}
        <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Customers
            </span>
            <Users className="size-4 text-zinc-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-foreground font-mono tabular-nums">
              {totalCustomers}
            </span>
            <span className="text-xs text-muted-foreground">registered</span>
          </div>
        </Card>

        {/* Active Customers */}
        <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Active Customers
            </span>
            <UserCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-foreground font-mono tabular-nums">
              {activeCustomers}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              {Math.round((activeCustomers / (totalCustomers || 1)) * 100)}% active
            </span>
          </div>
        </Card>

        {/* Customers With Due */}
        <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Customers With Due
            </span>
            <Receipt className="size-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-foreground font-mono tabular-nums">
              {customersWithDue.length}
            </span>
            <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
              on credit
            </span>
          </div>
        </Card>

        {/* Total Outstanding */}
        <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Outstanding
            </span>
            <Wallet className="size-4 text-zinc-400" />
          </div>
          <div className="mt-2">
            <span
              className={cn(
                "text-2xl font-black tracking-tight font-mono tabular-nums",
                totalOutstanding > 0 ? "text-amber-700 dark:text-amber-400" : "text-foreground",
              )}
            >
              {formatCurrency(totalOutstanding)}
            </span>
          </div>
        </Card>
      </div>

      {/* 3. Search Bar & Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="size-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or email..."
            className="h-10 pl-10 pr-4 text-xs sm:text-sm rounded-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-2xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={cn(
              "h-8.5 px-3.5 rounded-xl text-xs font-semibold shrink-0 transition-all select-none",
              filterTab === "all"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                : "bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900",
            )}
          >
            All ({totalCustomers})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab("active")}
            className={cn(
              "h-8.5 px-3.5 rounded-xl text-xs font-semibold shrink-0 transition-all select-none",
              filterTab === "active"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                : "bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900",
            )}
          >
            Active ({activeCustomers})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab("due")}
            className={cn(
              "h-8.5 px-3.5 rounded-xl text-xs font-semibold shrink-0 transition-all select-none",
              filterTab === "due"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                : "bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900",
            )}
          >
            Due Balance ({customersWithDue.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab("inactive")}
            className={cn(
              "h-8.5 px-3.5 rounded-xl text-xs font-semibold shrink-0 transition-all select-none",
              filterTab === "inactive"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                : "bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900",
            )}
          >
            Inactive ({totalCustomers - activeCustomers})
          </button>
        </div>
      </div>

      {/* 4. Professional Monochrome Customer Table & Mobile Card View */}
      <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 overflow-hidden shadow-2xs">
        <CardContent className="p-0">
          {/* Mobile Card List (< sm) */}
          <div className="sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {paginatedCustomers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="size-8 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                <p className="font-semibold text-foreground">No customer records match</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Try modifying your search or switching filter tabs.
                </p>
              </div>
            ) : (
              paginatedCustomers.map((cust) => {
                const hasDue = cust.outstanding > 0;
                return (
                  <div key={cust.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-300 shrink-0 font-mono">
                          {cust.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground text-sm truncate">{cust.name}</p>
                          {cust.phone && (
                            <p className="text-xs text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                              <Phone className="size-3 text-zinc-400" />
                              <span>{cust.phone}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold shrink-0",
                          cust.is_active
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700",
                        )}
                      >
                        {cust.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/60 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Spent</span>
                        <p className="font-mono font-bold text-foreground">{formatCurrency(cust.total_purchases)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Due Balance</span>
                        <p className={cn("font-mono font-bold", hasDue ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
                          {hasDue ? formatCurrency(cust.outstanding) : "৳0"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-muted-foreground">
                        {cust.bills} {cust.bills === 1 ? "bill" : "bills"} · {cust.last_visit ? formatDate(cust.last_visit) : "Never"}
                      </span>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-7.5 px-3 rounded-lg text-xs font-semibold gap-1 border-zinc-200 dark:border-zinc-800"
                      >
                        <Link href={`/customers/${cust.id}`}>
                          <span>CRM Profile</span>
                          <ChevronRight className="size-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop & Tablet Table (sm:) */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 text-muted-foreground text-xs font-semibold">
                  {/* Customer */}
                  <TableHead
                    onClick={() => handleSort("name")}
                    className="py-3 px-4 text-left cursor-pointer hover:text-foreground select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Customer</span>
                      {renderSortIcon("name")}
                    </div>
                  </TableHead>

                  {/* Phone */}
                  <TableHead className="py-3 px-4 text-left">Phone</TableHead>

                  {/* Email */}
                  <TableHead className="py-3 px-4 text-left hidden sm:table-cell">Email</TableHead>

                  {/* Total Purchases */}
                  <TableHead
                    onClick={() => handleSort("total_purchases")}
                    className="py-3 px-4 text-right cursor-pointer hover:text-foreground select-none"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Total Purchases</span>
                      {renderSortIcon("total_purchases")}
                    </div>
                  </TableHead>

                  {/* Bills */}
                  <TableHead
                    onClick={() => handleSort("bills")}
                    className="py-3 px-4 text-center cursor-pointer hover:text-foreground select-none"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Bills</span>
                      {renderSortIcon("bills")}
                    </div>
                  </TableHead>

                  {/* Outstanding */}
                  <TableHead
                    onClick={() => handleSort("outstanding")}
                    className="py-3 px-4 text-right cursor-pointer hover:text-foreground select-none"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Outstanding</span>
                      {renderSortIcon("outstanding")}
                    </div>
                  </TableHead>

                  {/* Last Visit */}
                  <TableHead
                    onClick={() => handleSort("last_visit")}
                    className="py-3 px-4 text-left cursor-pointer hover:text-foreground select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Last Visit</span>
                      {renderSortIcon("last_visit")}
                    </div>
                  </TableHead>

                  {/* Status */}
                  <TableHead className="py-3 px-4 text-center">Status</TableHead>

                  {/* Actions */}
                  <TableHead className="py-3 px-4 text-right">Action</TableHead>
                </tr>
              </TableHeader>

              <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                {paginatedCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-14 text-center text-muted-foreground">
                      <Users className="size-8 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                      <p className="font-semibold text-foreground">No customer records match</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Try modifying your search or switching filter tabs.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCustomers.map((cust) => {
                    const hasDue = cust.outstanding > 0;

                    return (
                      <TableRow
                        key={cust.id}
                        className="group hover:bg-zinc-50/80 dark:hover:bg-zinc-900/60 transition-colors select-none"
                      >
                        {/* Customer Info with Avatar Thumbnail */}
                        <TableCell className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-300 shrink-0 font-mono">
                              {cust.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground text-sm group-hover:text-zinc-900 dark:group-hover:text-white truncate">
                                {cust.name}
                              </p>
                              {cust.address && (
                                <p className="text-[10px] text-muted-foreground truncate max-w-[170px]">
                                  {cust.address}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Phone */}
                        <TableCell className="py-3 px-4 font-mono font-medium text-foreground">
                          {cust.phone ? (
                            <span className="flex items-center gap-1.5">
                              <Phone className="size-3 text-zinc-400" />
                              <span>{cust.phone}</span>
                            </span>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </TableCell>

                        {/* Email */}
                        <TableCell className="py-3 px-4 text-muted-foreground hidden sm:table-cell">
                          {cust.email ? (
                            <span className="truncate max-w-[160px] block">{cust.email}</span>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </TableCell>

                        {/* Total Purchases */}
                        <TableCell className="py-3 px-4 text-right font-mono font-bold text-foreground tabular-nums text-sm">
                          {formatCurrency(cust.total_purchases)}
                        </TableCell>

                        {/* Bills Count */}
                        <TableCell className="py-3 px-4 text-center font-mono font-semibold text-foreground tabular-nums">
                          <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700 text-xs">
                            {cust.bills}
                          </span>
                        </TableCell>

                        {/* Outstanding Due */}
                        <TableCell className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                          {hasDue ? (
                            <span className="text-amber-700 dark:text-amber-400">
                              {formatCurrency(cust.outstanding)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground font-normal">৳0</span>
                          )}
                        </TableCell>

                        {/* Last Visit */}
                        <TableCell className="py-3 px-4 text-muted-foreground text-xs font-medium">
                          {cust.last_visit ? formatDate(cust.last_visit) : "—"}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3 px-4 text-center">
                          {cust.is_active ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                            >
                              Active
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700"
                            >
                              Inactive
                            </Badge>
                          )}
                        </TableCell>

                        {/* Action View */}
                        <TableCell className="py-3 px-4 text-right">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-7.5 px-2.5 rounded-lg text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-800 gap-1"
                          >
                            <Link href={`/customers/${cust.id}`}>
                              <span>CRM</span>
                              <ChevronRight className="size-3 text-zinc-400" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* 5. Pagination & Page Sizer Footer */}
          <div className="px-4 py-3.5 border-t border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            {/* Page Size & Total Info */}
            <div className="flex items-center gap-3">
              <span>
                Showing <strong className="text-foreground">{totalItems === 0 ? 0 : startIndex + 1}</strong> to{" "}
                <strong className="text-foreground">
                  {Math.min(startIndex + pageSize, totalItems)}
                </strong>{" "}
                of <strong className="text-foreground">{totalItems}</strong> customers
              </span>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[11px]">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-7 px-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-7.5 px-2.5 rounded-lg border-zinc-200 dark:border-zinc-800 gap-1 text-xs"
              >
                <ChevronLeft className="size-3.5" />
                <span>Prev</span>
              </Button>

              <div className="flex items-center gap-1 px-1 text-xs font-mono">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1,
                  )
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-1 text-zinc-400">…</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        className={cn(
                          "size-7 rounded-lg text-xs font-bold transition-colors select-none",
                          currentPage === p
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-7.5 px-2.5 rounded-lg border-zinc-200 dark:border-zinc-800 gap-1 text-xs"
              >
                <span>Next</span>
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
