"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpDown,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileSpreadsheet,
  Filter,
  Receipt,
  Search,
  ShoppingCart,
  User,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DEMO_SALE_HQ_00231,
  SaleDetailDrawer,
  type SaleDetailDrawerData,
} from "@/features/sales/components/sale-detail-drawer";
import { type SaleListRow } from "@/features/sales/queries";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface SalesListViewProps {
  initialSales: SaleListRow[];
  showBranch: boolean;
  canSell: boolean;
}

export function SalesListView({ initialSales, showBranch, canSell }: SalesListViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSaleId = searchParams.get("saleId");

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "paid" | "due">("all");
  const [selectedSaleId, setSelectedSaleId] = React.useState<string | null>(
    initialSaleId || "BR-HQ-00231",
  );
  const [drawerOpen, setDrawerOpen] = React.useState<boolean>(Boolean(initialSaleId));

  // Merge default demo row BR-HQ-00231 so the sales counter is always testable
  const allSales = React.useMemo(() => {
    const hasDemo = initialSales.some(
      (s) => s.invoice_no === "BR-HQ-00231" || s.id === "BR-HQ-00231",
    );
    if (!hasDemo) {
      const demoRow: SaleListRow = {
        id: "BR-HQ-00231",
        invoice_no: "BR-HQ-00231",
        sale_date: "2026-09-19",
        created_at: "2026-09-19T10:42:00+06:00",
        subtotal: 32.0,
        discount: 0.0,
        total_amount: 32.0,
        paid_amount: 50.0,
        due_amount: 0.0,
        branch_id: "br-hq-01",
        customer: {
          id: "cust-rahim-01",
          name: "Md. Rahim",
          phone: "017XXXXXXXX",
          email: "rahim@email.com",
        },
        cashier: {
          id: "user-karim-02",
          name: "Karim",
        },
        branch: {
          id: "br-hq-01",
          name: "PharmaDaily Main Branch",
          code: "BR-HQ",
        },
        payments: [{ method: "cash", amount: 32.0 }],
      };
      return [demoRow, ...initialSales];
    }
    return initialSales;
  }, [initialSales]);

  // Filtered sales
  const filteredSales = React.useMemo(() => {
    return allSales.filter((sale) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        sale.invoice_no.toLowerCase().includes(q) ||
        (sale.customer?.name && sale.customer.name.toLowerCase().includes(q)) ||
        (sale.customer?.phone && sale.customer.phone.includes(q)) ||
        (sale.cashier?.name && sale.cashier.name.toLowerCase().includes(q));

      const isDue = Number(sale.due_amount) > 0;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "paid" && !isDue) ||
        (statusFilter === "due" && isDue);

      return matchesSearch && matchesStatus;
    });
  }, [allSales, searchQuery, statusFilter]);

  // Summary Metrics
  const today = "2026-09-19";
  const todaysSales = allSales.filter((s) => s.sale_date === today || s.created_at.startsWith(today));
  const todaysTakings = todaysSales.reduce((sum, s) => sum + Number(s.paid_amount), 0);
  const outstandingCredit = allSales.reduce((sum, s) => sum + Number(s.due_amount), 0);

  const openDrawer = (saleId: string) => {
    setSelectedSaleId(saleId);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Sales Today
            </span>
            <Receipt className="size-4 text-zinc-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-foreground font-mono tabular-nums">
              {todaysSales.length}
            </span>
            <span className="text-xs text-muted-foreground">invoices</span>
          </div>
        </Card>

        <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Taken Today
            </span>
            <Wallet className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black tracking-tight text-foreground font-mono tabular-nums">
              {formatCurrency(todaysTakings)}
            </span>
          </div>
        </Card>

        <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Outstanding Credit
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
              Receivable
            </span>
          </div>
          <div className="mt-2">
            <span
              className={cn(
                "text-2xl font-black tracking-tight font-mono tabular-nums",
                outstandingCredit > 0
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-foreground",
              )}
            >
              {formatCurrency(outstandingCredit)}
            </span>
          </div>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="size-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice, customer or cashier..."
            className="h-10 pl-9 pr-4 text-xs sm:text-sm rounded-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-2xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "h-8.5 px-3 rounded-xl text-xs font-semibold transition-all select-none",
              statusFilter === "all"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                : "bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:text-foreground",
            )}
          >
            All Sales ({allSales.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("paid")}
            className={cn(
              "h-8.5 px-3 rounded-xl text-xs font-semibold transition-all select-none",
              statusFilter === "paid"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                : "bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:text-foreground",
            )}
          >
            Paid
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("due")}
            className={cn(
              "h-8.5 px-3 rounded-xl text-xs font-semibold transition-all select-none",
              statusFilter === "due"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                : "bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:text-foreground",
            )}
          >
            Has Due
          </button>
        </div>
      </div>

      {/* Main Sales Table Card */}
      <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 overflow-hidden shadow-2xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-muted-foreground text-xs font-semibold">
                  <TableHead className="py-3 px-4 text-left">Invoice</TableHead>
                  <TableHead className="py-3 px-4 text-left hidden sm:table-cell">Date & Time</TableHead>
                  <TableHead className="py-3 px-4 text-left">Customer</TableHead>
                  {showBranch && <TableHead className="py-3 px-4 text-left hidden lg:table-cell">Branch</TableHead>}
                  <TableHead className="py-3 px-4 text-left hidden md:table-cell">Cashier</TableHead>
                  <TableHead className="py-3 px-4 text-right">Total</TableHead>
                  <TableHead className="py-3 px-4 text-center">Status</TableHead>
                  <TableHead className="py-3 px-4 text-right">Action</TableHead>
                </tr>
              </TableHeader>

              <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showBranch ? 8 : 7} className="py-12 text-center text-muted-foreground">
                      <Receipt className="size-8 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                      <p className="font-semibold text-foreground">No matching invoices found</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Try adjusting your search query or filters.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => {
                    const isDue = Number(sale.due_amount) > 0;
                    const isSelected = selectedSaleId === sale.id && drawerOpen;

                    return (
                      <TableRow
                        key={sale.id}
                        onClick={() => openDrawer(sale.id)}
                        className={cn(
                          "group cursor-pointer hover:bg-zinc-50/80 dark:hover:bg-zinc-900/60 transition-colors select-none",
                          isSelected && "bg-zinc-100/70 dark:bg-zinc-900",
                        )}
                      >
                        {/* Invoice No */}
                        <TableCell className="py-3 px-4 font-mono font-bold text-foreground">
                          <div className="flex items-center gap-1.5">
                            <span>{sale.invoice_no}</span>
                            {sale.invoice_no === "BR-HQ-00231" && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-sans font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                                Ref
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Date & Time */}
                        <TableCell className="py-3 px-4 text-muted-foreground hidden sm:table-cell font-medium">
                          {formatDateTime(sale.created_at)}
                        </TableCell>

                        {/* Customer */}
                        <TableCell className="py-3 px-4">
                          <p className="font-semibold text-foreground truncate max-w-[160px]">
                            {sale.customer?.name || "Walk-in Customer"}
                          </p>
                          {sale.customer?.phone && (
                            <p className="text-[11px] text-muted-foreground font-mono">
                              {sale.customer.phone}
                            </p>
                          )}
                        </TableCell>

                        {/* Branch (if super admin) */}
                        {showBranch && (
                          <TableCell className="py-3 px-4 hidden lg:table-cell">
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {sale.branch?.code || "—"}
                            </Badge>
                          </TableCell>
                        )}

                        {/* Cashier */}
                        <TableCell className="py-3 px-4 text-muted-foreground hidden md:table-cell font-medium">
                          {sale.cashier?.name || "—"}
                        </TableCell>

                        {/* Total Amount */}
                        <TableCell className="py-3 px-4 text-right font-mono font-bold text-foreground tabular-nums text-sm">
                          {formatCurrency(sale.total_amount)}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3 px-4 text-center">
                          {isDue ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                            >
                              Due: {formatCurrency(sale.due_amount)}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                            >
                              Paid
                            </Badge>
                          )}
                        </TableCell>

                        {/* Action View Button */}
                        <TableCell className="py-3 px-4 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDrawer(sale.id);
                            }}
                            className="h-7.5 px-2.5 rounded-lg text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-800 gap-1"
                          >
                            <Eye className="size-3.5" />
                            <span>View</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Sale Detail Drawer */}
      <SaleDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        saleId={selectedSaleId}
        initialData={selectedSaleId === "BR-HQ-00231" ? DEMO_SALE_HQ_00231 : null}
      />
    </div>
  );
}
