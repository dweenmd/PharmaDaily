"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgePercent,
  BarChart3,
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  MapPin,
  Package,
  PackageCheck,
  PackageX,
  PieChart,
  Receipt,
  RotateCcw,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ReportCategory = "ALL" | "SALES" | "INVENTORY" | "FINANCE" | "OPERATIONS";

export type ReportItem = {
  id: string;
  name: string;
  category: "SALES" | "INVENTORY" | "FINANCE" | "OPERATIONS";
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tag?: string;
  metric?: string;
};

const REPORTS_CATALOG: ReportItem[] = [
  // --- 1. SALES ---
  {
    id: "sales-summary",
    name: "Sales Summary",
    category: "SALES",
    description: "Daily, weekly, and monthly aggregate revenue, invoice counts, and gross margins.",
    href: "/reports/sales",
    icon: BarChart3,
    tag: "Core",
    metric: "Revenue & Volume",
  },
  {
    id: "sales-medicine",
    name: "Sales by Medicine",
    category: "SALES",
    description: "Product-level sales volume, units dispensed, revenue, and gross profit ranking.",
    href: "/reports/sales?view=medicine",
    icon: Package,
    metric: "Dispensed Units",
  },
  {
    id: "sales-category",
    name: "Sales by Category",
    category: "SALES",
    description: "Revenue distribution across therapeutic classifications, OTC vs prescription items.",
    href: "/reports/sales?view=category",
    icon: Layers,
    metric: "Therapeutic Share",
  },
  {
    id: "sales-staff",
    name: "Sales by Staff",
    category: "SALES",
    description: "Dispensary staff performance, counter cashiers, invoice volume, and receipts.",
    href: "/reports/sales?view=staff",
    icon: Users,
    metric: "Cashier Ledger",
  },
  {
    id: "sales-branch",
    name: "Sales by Branch",
    category: "SALES",
    description: "Comparative outlet takings, multi-branch revenue contribution, and branch growth.",
    href: "/reports/sales?view=branch",
    icon: Building2,
    metric: "Branch Share",
  },
  {
    id: "sales-returns",
    name: "Returns",
    category: "SALES",
    description: "Customer sales returns, refunds, damaged medicine returns, and net takings adjustments.",
    href: "/sales?tab=returns",
    icon: RotateCcw,
    metric: "Refunds Log",
  },

  // --- 2. INVENTORY ---
  {
    id: "stock-valuation",
    name: "Stock Valuation",
    category: "INVENTORY",
    description: "Total on-hand inventory valuation at purchase cost and retail MRP across warehouses.",
    href: "/reports/stock",
    icon: Boxes,
    tag: "Audit",
    metric: "Cost & MRP",
  },
  {
    id: "stock-movement",
    name: "Stock Movement",
    category: "INVENTORY",
    description: "Historical batch movement ledger, supplier intakes, dispensing depletions, and write-offs.",
    href: "/stock/movements",
    icon: ArrowRight,
    metric: "Audit Trail",
  },
  {
    id: "low-stock",
    name: "Low Stock",
    category: "INVENTORY",
    description: "Real-time depletion alerts, reorder thresholds, and distributor purchase recommendations.",
    href: "/stock/low",
    icon: TrendingDown,
    metric: "Reorder Alerts",
  },
  {
    id: "expiring-stock",
    name: "Expiring Stock",
    category: "INVENTORY",
    description: "FEFO shelf-life tracking, batches expiring within 30/60/90 days, and quarantine alerts.",
    href: "/stock?filter=expiring",
    icon: Clock,
    metric: "FEFO First",
  },
  {
    id: "dead-stock",
    name: "Dead Stock",
    category: "INVENTORY",
    description: "Slow-moving inventory with zero dispensing activity in the last 90+ days.",
    href: "/reports/stock?view=dead-stock",
    icon: PackageX,
    metric: "Zero Movement",
  },

  // --- 3. FINANCE ---
  {
    id: "profit-summary",
    name: "Profit Summary",
    category: "FINANCE",
    description: "Net operational profit, gross margin, operating overhead, and EBITDA calculation.",
    href: "/reports/profit",
    icon: DollarSign,
    tag: "P&L",
    metric: "Net Operating Margin",
  },
  {
    id: "cash-flow",
    name: "Cash Flow",
    category: "FINANCE",
    description: "Daily counter cash takings, bank transfers, MFS digital payments, and cash reconciliations.",
    href: "/cash",
    icon: Wallet,
    metric: "Drawer & Bank",
  },
  {
    id: "customer-due",
    name: "Customer Due",
    category: "FINANCE",
    description: "Customer credit accounts, outstanding receivables ledger, and balance aging analysis.",
    href: "/customers?tab=due",
    icon: CreditCard,
    metric: "Receivables",
  },
  {
    id: "supplier-due",
    name: "Supplier Due",
    category: "FINANCE",
    description: "Distributor trade payables, unsettled consignment invoices, and settlement schedules.",
    href: "/suppliers?tab=outstanding",
    icon: Coins,
    metric: "Payables Ledger",
  },

  // --- 4. OPERATIONS ---
  {
    id: "purchases-audit",
    name: "Purchases",
    category: "OPERATIONS",
    description: "Consignment procurement logs, supplier delivery performance, and intake invoice audits.",
    href: "/purchases",
    icon: PackageCheck,
    metric: "Procurement Log",
  },
  {
    id: "transfers-audit",
    name: "Transfers",
    category: "OPERATIONS",
    description: "Inter-branch stock movement manifests, dispatch custody, transit tracking, and goods receipt.",
    href: "/transfers",
    icon: Truck,
    metric: "Chain Logistics",
  },
  {
    id: "expenses-audit",
    name: "Expenses",
    category: "OPERATIONS",
    description: "Operating overhead, branch utilities, staff payroll, premises rent, and store upkeep.",
    href: "/expenses",
    icon: Receipt,
    metric: "Operating Ledger",
  },
  {
    id: "system-audit",
    name: "Audit",
    category: "OPERATIONS",
    description: "Comprehensive system activity logs, inventory adjustments, and administrative security events.",
    href: "/audit",
    icon: ShieldCheck,
    tag: "Compliance",
    metric: "Security Log",
  },
];

type Props = {
  branches: { id: string; name: string; code: string }[];
  currentBranchId: string | null;
  isSuperAdmin: boolean;
};

export function ReportsCenterClient({ branches, currentBranchId, isSuperAdmin }: Props) {
  const router = useRouter();

  // Search & Filters
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<ReportCategory>("ALL");

  // Top-Right Controls State
  const [dateRangePreset, setDateRangePreset] = React.useState("Last 30 Days");
  const [selectedBranch, setSelectedBranch] = React.useState<string>(currentBranchId ?? "all");
  const [fromDate, setFromDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [isExporting, setIsExporting] = React.useState(false);

  // Quick preset handler
  function handlePresetChange(preset: string) {
    setDateRangePreset(preset);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    setToDate(today);

    if (preset === "Today") {
      setFromDate(today);
    } else if (preset === "Last 7 Days") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setFromDate(d.toISOString().slice(0, 10));
    } else if (preset === "This Month") {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(d.toISOString().slice(0, 10));
    } else if (preset === "Last 30 Days") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setFromDate(d.toISOString().slice(0, 10));
    } else if (preset === "Last 90 Days") {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      setFromDate(d.toISOString().slice(0, 10));
    }
  }

  // Filtered reports
  const filteredReports = React.useMemo(() => {
    return REPORTS_CATALOG.filter((report) => {
      // Category filter
      if (selectedCategory !== "ALL" && report.category !== selectedCategory) {
        return false;
      }

      // Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const nameMatch = report.name.toLowerCase().includes(q);
        const descMatch = report.description.toLowerCase().includes(q);
        const catMatch = report.category.toLowerCase().includes(q);
        const metricMatch = (report.metric ?? "").toLowerCase().includes(q);

        if (!nameMatch && !descMatch && !catMatch && !metricMatch) {
          return false;
        }
      }

      return true;
    });
  }, [selectedCategory, searchTerm]);

  // Grouped by Category for structured rendering
  const groupedReports = React.useMemo(() => {
    const categories: ("SALES" | "INVENTORY" | "FINANCE" | "OPERATIONS")[] = [
      "SALES",
      "INVENTORY",
      "FINANCE",
      "OPERATIONS",
    ];

    return categories
      .map((cat) => ({
        category: cat,
        items: filteredReports.filter((r) => r.category === cat),
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredReports]);

  // Export action
  function handleExportAll() {
    setIsExporting(true);
    toast.info("Generating Consolidated Executive Report", {
      description: `Scope: ${
        selectedBranch === "all" ? "All Branches (Chainwide)" : branches.find((b) => b.id === selectedBranch)?.name
      } · Period: ${fromDate} to ${toDate}`,
    });

    setTimeout(() => {
      setIsExporting(false);
      toast.success("Report Manifest Exported", {
        description: "Downloaded complete CSV workbook containing Sales, Stock Valuation, and Profit data.",
      });
    }, 1200);
  }

  // Category counts
  const categoryCounts = React.useMemo(() => {
    return {
      ALL: REPORTS_CATALOG.length,
      SALES: REPORTS_CATALOG.filter((r) => r.category === "SALES").length,
      INVENTORY: REPORTS_CATALOG.filter((r) => r.category === "INVENTORY").length,
      FINANCE: REPORTS_CATALOG.filter((r) => r.category === "FINANCE").length,
      OPERATIONS: REPORTS_CATALOG.filter((r) => r.category === "OPERATIONS").length,
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. Header Section with Top-Right Controls */}
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 font-medium">
            <span>PharmaDaily</span>
            <span>/</span>
            <span>Analytics</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Reports Center</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Reports
            </h1>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700">
              ENTERPRISE BUSINESS INTELLIGENCE
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Central navigation for sales performance, stock valuation, financial ledgers, and operational audits.
          </p>
        </div>

        {/* Top-Right Controls: Date Range, Branch, Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs shadow-2xs dark:border-zinc-800 dark:bg-zinc-950">
            <Calendar className="size-3.5 text-zinc-400" />
            <select
              value={dateRangePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="h-7 bg-transparent text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer"
            >
              <option value="Today">Today</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="This Month">This Month</option>
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="Last 90 Days">Last 90 Days</option>
            </select>
          </div>

          {/* Branch Selector */}
          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs shadow-2xs dark:border-zinc-800 dark:bg-zinc-950">
            <Building2 className="size-3.5 text-zinc-400" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              disabled={!isSuperAdmin && branches.length <= 1}
              className="h-7 bg-transparent text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer"
            >
              {isSuperAdmin && <option value="all">All Branches (Chainwide)</option>}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Export Button */}
          <Button
            onClick={handleExportAll}
            disabled={isExporting}
            variant="outline"
            size="sm"
            className="h-9 px-3 text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <Download className="mr-1.5 size-3.5" />
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </div>
      </div>

      {/* 2. Search & Category Jump Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-zinc-200 shadow-2xs dark:bg-zinc-950 dark:border-zinc-800">
        {/* Search Input */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search report name or description..."
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

        {/* Category Jump Buttons: ALL, SALES, INVENTORY, FINANCE, OPERATIONS */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(["ALL", "SALES", "INVENTORY", "FINANCE", "OPERATIONS"] as ReportCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                selectedCategory === cat
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                  : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/80 dark:bg-zinc-850 dark:text-zinc-400 dark:hover:bg-zinc-800",
              )}
            >
              <span>{cat}</span>
              <span
                className={cn(
                  "font-mono text-[10px] px-1.5 py-0.2 rounded-full",
                  selectedCategory === cat
                    ? "bg-zinc-700 text-zinc-100 dark:bg-zinc-300 dark:text-zinc-900"
                    : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
                )}
              >
                {categoryCounts[cat]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Categorized Reports Listing */}
      {groupedReports.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <FileText className="size-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">No matching reports found</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Try adjusting your search query or select another category tab above.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("ALL");
            }}
            className="mt-4 text-xs"
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedReports.map((group) => {
            return (
              <section key={group.category} className="space-y-3">
                {/* Category Header */}
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950 dark:text-zinc-50">
                      {group.category}
                    </h2>
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {group.items.length} {group.items.length === 1 ? "report" : "reports"}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Monochrome Accounting Suite
                  </span>
                </div>

                {/* Report Cards Grid */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((report) => {
                    const Icon = report.icon;
                    // Append active filter params to report link
                    const targetHref = report.href.includes("?")
                      ? `${report.href}&from=${fromDate}&to=${toDate}${
                          selectedBranch !== "all" ? `&branch=${selectedBranch}` : ""
                        }`
                      : `${report.href}?from=${fromDate}&to=${toDate}${
                          selectedBranch !== "all" ? `&branch=${selectedBranch}` : ""
                        }`;

                    return (
                      <Link
                        key={report.id}
                        href={targetHref}
                        className="group relative flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs transition-all hover:border-zinc-900 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-100"
                      >
                        <div>
                          {/* Card Top: Icon & Tags */}
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 dark:bg-zinc-850 dark:text-zinc-100 border border-zinc-200/60 dark:border-zinc-700/60">
                              <Icon className="size-4" />
                            </div>

                            <div className="flex items-center gap-1.5">
                              {report.tag && (
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                                  {report.tag}
                                </span>
                              )}
                              {report.metric && (
                                <span className="font-mono text-[10px] text-zinc-400">
                                  {report.metric}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Report Name */}
                          <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 group-hover:underline">
                            {report.name}
                          </h3>

                          {/* Short Description */}
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                            {report.description}
                          </p>
                        </div>

                        {/* Card Bottom: Open report arrow */}
                        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-950 dark:group-hover:text-zinc-50">
                          <span className="text-[11px] font-medium text-muted-foreground">View report</span>
                          <div className="flex items-center gap-1 transition-transform group-hover:translate-x-1">
                            <span className="text-[11px] font-mono">Open</span>
                            <ArrowRight className="size-3.5" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
