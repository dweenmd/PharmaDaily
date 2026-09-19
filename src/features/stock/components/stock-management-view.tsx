"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpDown,
  Barcode,
  Boxes,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Filter,
  History,
  Layers,
  MoreHorizontal,
  Package,
  Pill,
  Plus,
  RefreshCw,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  Truck,
  Warehouse,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  daysUntil,
  expiryStatus,
  formatCurrency,
  formatDate,
  toNumber,
} from "@/lib/format";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type StockItemStatus = "In Stock" | "Low Stock" | "Expiring" | "Out of Stock";

export type StockInventoryItem = {
  id: string;
  medicine_id: string;
  medicine_name: string;
  brand_name?: string | null;
  generic_name?: string | null;
  dosage_form?: string | null;
  strength?: string | null;
  barcode?: string | null;
  reorder_level: number;
  batch_no: string;
  expiry_date: string;
  available: number;
  reserved: number;
  purchase_price: number; // Cost
  selling_price: number; // Selling Price
  mrp: number;
  branch_id?: string;
  branch_name?: string;
  branch_code?: string;
  supplier_name?: string;
  is_fefo_priority?: boolean;
};

// ============================================================================
// Demo Inventory Batches (Fallback & Realistic Demonstration)
// ============================================================================

export const DEMO_STOCK_ITEMS: StockInventoryItem[] = [
  {
    id: "stk-1",
    medicine_id: "demo-napa-500",
    medicine_name: "Paracetamol 500 mg",
    brand_name: "Napa",
    generic_name: "Paracetamol",
    dosage_form: "Tablet",
    strength: "500 mg",
    barcode: "894110012019",
    reorder_level: 100,
    batch_no: "BT-202601",
    expiry_date: "2026-10-31", // 42 days left -> Expiring
    available: 1120,
    reserved: 20,
    purchase_price: 1.2,
    selling_price: 1.5,
    mrp: 1.5,
    branch_code: "BR-HQ",
    branch_name: "Main Branch Counter",
    supplier_name: "Beximco Central Depot",
    is_fefo_priority: true,
  },
  {
    id: "stk-2",
    medicine_id: "med-2",
    medicine_name: "Omeprazole 20 mg",
    brand_name: "Seclo 20",
    generic_name: "Omeprazole",
    dosage_form: "Capsule",
    strength: "20 mg",
    barcode: "894110023401",
    reorder_level: 50,
    batch_no: "BT-202602",
    expiry_date: "2027-03-15",
    available: 920,
    reserved: 0,
    purchase_price: 4.2,
    selling_price: 5.0,
    mrp: 5.0,
    branch_code: "BR-HQ",
    branch_name: "Main Branch Counter",
    supplier_name: "Square Pharmaceuticals",
    is_fefo_priority: false,
  },
  {
    id: "stk-3",
    medicine_id: "med-3",
    medicine_name: "Azithromycin 200 mg/5 ml",
    brand_name: "Zimax Suspension",
    generic_name: "Azithromycin",
    dosage_form: "Syrup",
    strength: "200 mg/5 ml",
    barcode: "894110034981",
    reorder_level: 30,
    batch_no: "BT-202605",
    expiry_date: "2026-11-10",
    available: 14, // Low stock <= 30
    reserved: 2,
    purchase_price: 120.0,
    selling_price: 145.0,
    mrp: 145.0,
    branch_code: "BR-HQ",
    branch_name: "Main Branch Counter",
    supplier_name: "Incepta Pharma",
    is_fefo_priority: false,
  },
  {
    id: "stk-4",
    medicine_id: "med-7",
    medicine_name: "Metformin 500 mg",
    brand_name: "Comet 500",
    generic_name: "Metformin HCl",
    dosage_form: "Tablet",
    strength: "500 mg",
    barcode: "894110080707",
    reorder_level: 80,
    batch_no: "BT-202607",
    expiry_date: "2027-06-28",
    available: 1120,
    reserved: 15,
    purchase_price: 3.8,
    selling_price: 4.5,
    mrp: 4.5,
    branch_code: "BR-HQ",
    branch_name: "Main Branch Counter",
    supplier_name: "Square Pharmaceuticals",
    is_fefo_priority: false,
  },
  {
    id: "stk-5",
    medicine_id: "med-8",
    medicine_name: "Amoxicillin 500 mg",
    brand_name: "Moxacil 500",
    generic_name: "Amoxicillin Trihydrate",
    dosage_form: "Capsule",
    strength: "500 mg",
    barcode: "894110091102",
    reorder_level: 60,
    batch_no: "BT-202609",
    expiry_date: "2027-07-20",
    available: 680,
    reserved: 0,
    purchase_price: 6.1,
    selling_price: 7.5,
    mrp: 7.5,
    branch_code: "BR-02",
    branch_name: "Dhanmondi Branch",
    supplier_name: "Renata Limited",
    is_fefo_priority: false,
  },
  {
    id: "stk-6",
    medicine_id: "med-9",
    medicine_name: "Ciprofloxacin 500 mg",
    brand_name: "Ciprocin",
    generic_name: "Ciprofloxacin HCl",
    dosage_form: "Tablet",
    strength: "500 mg",
    barcode: "894110102203",
    reorder_level: 40,
    batch_no: "BT-202588",
    expiry_date: "2025-12-12",
    available: 0, // Out of stock
    reserved: 0,
    purchase_price: 12.5,
    selling_price: 15.0,
    mrp: 15.0,
    branch_code: "BR-HQ",
    branch_name: "Main Branch Counter",
    supplier_name: "Square Pharmaceuticals",
    is_fefo_priority: false,
  },
  {
    id: "stk-7",
    medicine_id: "med-5",
    medicine_name: "Triamcinolone Acetonide",
    brand_name: "Kenacort",
    generic_name: "Triamcinolone",
    dosage_form: "Injection",
    strength: "40 mg/ml",
    barcode: "894110060505",
    reorder_level: 20,
    batch_no: "BT-202611",
    expiry_date: "2026-10-05", // 16 days left -> Critical Expiring
    available: 8, // Low stock
    reserved: 0,
    purchase_price: 160.0,
    selling_price: 195.0,
    mrp: 195.0,
    branch_code: "BR-HQ",
    branch_name: "Main Branch Counter",
    supplier_name: "Incepta Pharma",
    is_fefo_priority: true,
  },
  {
    id: "stk-8",
    medicine_id: "med-10",
    medicine_name: "Montelukast 10 mg",
    brand_name: "Monas 10",
    generic_name: "Montelukast Sodium",
    dosage_form: "Tablet",
    strength: "10 mg",
    barcode: "894110113304",
    reorder_level: 50,
    batch_no: "BT-202614",
    expiry_date: "2026-10-18", // 29 days left -> Expiring
    available: 85,
    reserved: 10,
    purchase_price: 14.0,
    selling_price: 17.5,
    mrp: 17.5,
    branch_code: "BR-03",
    branch_name: "Uttara Outlet",
    supplier_name: "Acme Laboratories",
    is_fefo_priority: true,
  },
];

// Helper to determine status
export function getStockItemStatus(item: StockInventoryItem): StockItemStatus {
  if (item.available <= 0) return "Out of Stock";
  const days = daysUntil(item.expiry_date);
  if (days <= 90) return "Expiring";
  if (item.available <= item.reorder_level) return "Low Stock";
  return "In Stock";
}

// Compact dosage thumbnail icon
function CompactDosageIcon({ form }: { form?: string | null }) {
  const code = (form || "TAB").slice(0, 3).toUpperCase();
  return (
    <div className="flex size-7 shrink-0 items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
      {code}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface StockManagementViewProps {
  initialItems?: StockInventoryItem[];
  canAdjust?: boolean;
  showBranch?: boolean;
}

export function StockManagementView({
  initialItems = DEMO_STOCK_ITEMS,
  canAdjust = true,
  showBranch = true,
}: StockManagementViewProps) {
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<
    "All" | "Low Stock" | "Expiring" | "Out of Stock" | "In Stock"
  >("All");
  const [sortColumn, setSortColumn] = React.useState<
    "medicine" | "batch" | "expiry" | "available" | "reserved" | "cost" | "selling"
  >("expiry"); // FEFO first by default!
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");
  const [copiedBatch, setCopiedBatch] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  const itemsWithStatus = React.useMemo(() => {
    return initialItems.map((item) => ({
      ...item,
      computedStatus: getStockItemStatus(item),
      daysLeft: daysUntil(item.expiry_date),
    }));
  }, [initialItems]);

  // 1. Summary Counts
  const summary = React.useMemo(() => {
    let lowStock = 0;
    let expiringSoon = 0;
    let outOfStock = 0;
    let inStock = 0;
    let totalUnits = 0;
    let totalCostVal = 0;

    for (const it of itemsWithStatus) {
      totalUnits += Math.max(0, it.available);
      totalCostVal += Math.max(0, it.available) * it.purchase_price;

      if (it.computedStatus === "Low Stock") lowStock++;
      else if (it.computedStatus === "Expiring") expiringSoon++;
      else if (it.computedStatus === "Out of Stock") outOfStock++;
      else inStock++;
    }

    return {
      totalItems: itemsWithStatus.length,
      lowStock,
      expiringSoon,
      outOfStock,
      inStock,
      totalUnits,
      totalCostVal,
    };
  }, [itemsWithStatus]);

  // 2. Filter & Search
  const filteredItems = React.useMemo(() => {
    return itemsWithStatus.filter((item) => {
      // Tab filter
      if (activeFilter !== "All" && item.computedStatus !== activeFilter) {
        return false;
      }

      // Search term
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchMed = item.medicine_name.toLowerCase().includes(q);
        const matchBrand = item.brand_name?.toLowerCase().includes(q);
        const matchGeneric = item.generic_name?.toLowerCase().includes(q);
        const matchBatch = item.batch_no.toLowerCase().includes(q);
        const matchBarcode = item.barcode?.toLowerCase().includes(q);
        const matchBranch = item.branch_code?.toLowerCase().includes(q);

        if (
          !matchMed &&
          !matchBrand &&
          !matchGeneric &&
          !matchBatch &&
          !matchBarcode &&
          !matchBranch
        ) {
          return false;
        }
      }

      return true;
    });
  }, [itemsWithStatus, activeFilter, search]);

  // 3. Sorting
  const sortedItems = React.useMemo(() => {
    const list = [...filteredItems];
    list.sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case "medicine":
          comparison = a.medicine_name.localeCompare(b.medicine_name);
          break;
        case "batch":
          comparison = a.batch_no.localeCompare(b.batch_no);
          break;
        case "expiry":
          comparison =
            new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
          break;
        case "available":
          comparison = a.available - b.available;
          break;
        case "reserved":
          comparison = a.reserved - b.reserved;
          break;
        case "cost":
          comparison = a.purchase_price - b.purchase_price;
          break;
        case "selling":
          comparison = a.selling_price - b.selling_price;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return list;
  }, [filteredItems, sortColumn, sortDirection]);

  // 4. Pagination
  const totalPages = Math.ceil(sortedItems.length / pageSize) || 1;
  const paginatedItems = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, page, pageSize]);

  const handleSort = (col: typeof sortColumn) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  const handleCopyBatch = (batchNo: string) => {
    navigator.clipboard.writeText(batchNo);
    setCopiedBatch(batchNo);
    setTimeout(() => setCopiedBatch(null), 2000);
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      "Medicine",
      "Brand",
      "Generic",
      "Batch",
      "Expiry",
      "Available",
      "Reserved",
      "Cost Price",
      "Selling Price",
      "MRP",
      "Status",
      "Branch",
    ];

    const rows = sortedItems.map((item) => [
      `"${item.medicine_name}"`,
      `"${item.brand_name || ""}"`,
      `"${item.generic_name || ""}"`,
      `"${item.batch_no}"`,
      `"${item.expiry_date}"`,
      item.available,
      item.reserved,
      item.purchase_price,
      item.selling_price,
      item.mrp,
      `"${item.computedStatus}"`,
      `"${item.branch_code || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `pharmadaily_stock_inventory_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderSortIndicator = (col: typeof sortColumn) => {
    if (sortColumn !== col) {
      return <ArrowUpDown className="size-3 opacity-30 group-hover:opacity-70 ml-1 inline" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="size-3 text-zinc-900 dark:text-zinc-100 ml-1 inline" />
    ) : (
      <ArrowDown className="size-3 text-zinc-900 dark:text-zinc-100 ml-1 inline" />
    );
  };

  return (
    <div className="space-y-5">
      {/* 1. Header with FEFO Indicator & Top-Right Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Stock
            </h1>

            {/* FEFO Indicator Badge: "Expiry First" */}
            <div
              title="First-Expiry-First-Out routing strictly enforced across counter POS & dispensing"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold tracking-tight shadow-2xs"
            >
              <ShieldCheck className="size-3.5 text-emerald-400 dark:text-emerald-600" />
              <span>Expiry First</span>
            </div>

            <span className="text-xs text-zinc-400 font-mono hidden md:inline">
              FEFO Protocol
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time batch-level inventory control, reorder thresholds, and shelf-life tracking
          </p>
        </div>

        {/* Top-right Actions: Stock Adjustment, Stock Transfer, Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Action 1: Stock Adjustment */}
          {canAdjust && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <Link href="/stock/adjustments/new">
                <SlidersHorizontal className="size-3.5 mr-1.5 text-zinc-500" />
                <span>Stock Adjustment</span>
              </Link>
            </Button>
          )}

          {/* Action 2: Stock Transfer */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <Link href="/transfers/new">
              <ArrowLeftRight className="size-3.5 mr-1.5 text-zinc-500" />
              <span>Stock Transfer</span>
            </Link>
          </Button>

          {/* Action 3: Export CSV */}
          <Button
            type="button"
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <Download className="size-3.5 mr-1.5 text-zinc-500" />
            <span>Export</span>
          </Button>

          {/* Primary Action: Receive Stock / New Purchase */}
          {canAdjust && (
            <Button
              asChild
              size="sm"
              className="h-8 text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs"
            >
              <Link href="/purchases/new">
                <Plus className="size-3.5 mr-1" />
                <span>Receive Stock</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Summary KPI Cards (Total Items, Low Stock, Expiring Soon, Out of Stock) */}
      <div className="grid grid-cols-1 min-[440px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Total Items */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Total Items
            </CardTitle>
            <Boxes className="size-4 text-zinc-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-50">
              {summary.totalItems.toLocaleString()}
              <span className="text-xs font-normal text-zinc-400 ml-1.5">batches</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              {summary.totalUnits.toLocaleString()} units · Value:{" "}
              <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                {formatCurrency(summary.totalCostVal)}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Low Stock */}
        <Card
          onClick={() => setActiveFilter("Low Stock")}
          className={cn(
            "border shadow-xs bg-white dark:bg-zinc-900 cursor-pointer transition hover:border-amber-400",
            activeFilter === "Low Stock"
              ? "ring-2 ring-zinc-900 dark:ring-zinc-100 border-transparent"
              : "border-zinc-200 dark:border-zinc-800",
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Low Stock
            </CardTitle>
            <TrendingDown className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-50">
              {summary.lowStock}
              <span className="text-xs font-normal text-zinc-400 ml-1.5">SKUs</span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-medium">
              At or below reorder minimum
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Expiring Soon */}
        <Card
          onClick={() => setActiveFilter("Expiring")}
          className={cn(
            "border shadow-xs bg-white dark:bg-zinc-900 cursor-pointer transition hover:border-orange-400",
            activeFilter === "Expiring"
              ? "ring-2 ring-zinc-900 dark:ring-zinc-100 border-transparent"
              : "border-zinc-200 dark:border-zinc-800",
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <span>Expiring Soon</span>
            </CardTitle>
            <Clock className="size-4 text-orange-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-50">
              {summary.expiringSoon}
              <span className="text-xs font-normal text-zinc-400 ml-1.5">batches</span>
            </div>
            <p className="text-[11px] text-orange-700 dark:text-orange-400 mt-1 font-medium">
              Expiring within 90 days (FEFO)
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Out of Stock */}
        <Card
          onClick={() => setActiveFilter("Out of Stock")}
          className={cn(
            "border shadow-xs bg-white dark:bg-zinc-900 cursor-pointer transition hover:border-red-400",
            activeFilter === "Out of Stock"
              ? "ring-2 ring-zinc-900 dark:ring-zinc-100 border-transparent"
              : "border-zinc-200 dark:border-zinc-800",
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Out of Stock
            </CardTitle>
            <AlertCircle className="size-4 text-zinc-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-50">
              {summary.outOfStock}
              <span className="text-xs font-normal text-zinc-400 ml-1.5">lines</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
              Zero shelf inventory
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Search Bar & Filters (All, Low Stock, Expiring, Out of Stock, In Stock) */}
      <div className="bg-white border border-zinc-200 rounded-lg p-3.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
        {/* Search Bar with Barcode Icon */}
        <div className="relative">
          <Search className="size-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search medicine, batch or barcode..."
            className="w-full pl-9 pr-24 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700/80 rounded-md focus:bg-white dark:focus:bg-zinc-900"
          />

          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="size-3.5" />
              </button>
            )}
            <span className="hidden sm:inline text-[10px] text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-0.5 bg-white dark:bg-zinc-800 font-mono">
              F3 / ⌘K
            </span>
          </div>
        </div>

        {/* Filter Pills (All, Low Stock, Expiring, Out of Stock, In Stock) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="flex overflow-x-auto pb-1 gap-1 no-scrollbar scroll-smooth w-full sm:w-auto">
            {(
              [
                { key: "All", label: "All", count: summary.totalItems },
                { key: "Low Stock", label: "Low Stock", count: summary.lowStock },
                { key: "Expiring", label: "Expiring", count: summary.expiringSoon },
                { key: "Out of Stock", label: "Out of Stock", count: summary.outOfStock },
                { key: "In Stock", label: "In Stock", count: summary.inStock },
              ] as const
            ).map((tab) => {
              const isActive = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveFilter(tab.key);
                    setPage(1);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer select-none",
                    isActive
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-2xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "text-[10px] font-mono px-1.5 py-0.2 rounded-full",
                      isActive
                        ? "bg-zinc-800 text-zinc-200 dark:bg-zinc-200 dark:text-zinc-800"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-zinc-400 font-mono">
            Showing {filteredItems.length} matching entries
          </div>
        </div>
      </div>

      {/* 4. Inventory Data Table */}
      <div className="bg-white border border-zinc-200 rounded-lg shadow-xs overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <Table className="w-full text-xs">
            <TableHeader>
              <tr className="bg-zinc-50/90 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider select-none">
                {/* 1. Medicine */}
                <th
                  onClick={() => handleSort("medicine")}
                  className="py-3 px-4 text-left cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 group"
                >
                  <span>Medicine</span>
                  {renderSortIndicator("medicine")}
                </th>

                {/* 2. Batch */}
                <th
                  onClick={() => handleSort("batch")}
                  className="py-3 px-3 text-left cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 group"
                >
                  <span>Batch</span>
                  {renderSortIndicator("batch")}
                </th>

                {/* 3. Expiry */}
                <th
                  onClick={() => handleSort("expiry")}
                  className="py-3 px-3 text-left cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 group"
                >
                  <span>Expiry (FEFO)</span>
                  {renderSortIndicator("expiry")}
                </th>

                {/* 4. Available */}
                <th
                  onClick={() => handleSort("available")}
                  className="py-3 px-3 text-right cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 group"
                >
                  <span>Available</span>
                  {renderSortIndicator("available")}
                </th>

                {/* 5. Reserved */}
                <th
                  onClick={() => handleSort("reserved")}
                  className="py-3 px-3 text-right cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 group"
                >
                  <span>Reserved</span>
                  {renderSortIndicator("reserved")}
                </th>

                {/* 6. Cost */}
                <th
                  onClick={() => handleSort("cost")}
                  className="py-3 px-3 text-right cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 group"
                >
                  <span>Cost</span>
                  {renderSortIndicator("cost")}
                </th>

                {/* 7. Selling Price */}
                <th
                  onClick={() => handleSort("selling")}
                  className="py-3 px-3 text-right cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 group"
                >
                  <span>Selling Price</span>
                  {renderSortIndicator("selling")}
                </th>

                {/* 8. Status */}
                <th className="py-3 px-3 text-center">Status</th>

                {/* 9. Actions */}
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </TableHeader>

            <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-200">
              {paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-14 text-center text-zinc-400">
                    <Package className="size-8 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                    <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                      No stock records match this view
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Try adjusting the search query or switching filter tabs.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => {
                  const days = item.daysLeft;
                  const isExpiring = item.computedStatus === "Expiring";
                  const isLow = item.computedStatus === "Low Stock";
                  const isOutOfStock = item.computedStatus === "Out of Stock";

                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        "transition hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40",
                        item.is_fefo_priority && "bg-amber-50/20 dark:bg-amber-950/10",
                      )}
                    >
                      {/* 1. Medicine */}
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <CompactDosageIcon form={item.dosage_form} />
                          <div className="min-w-0">
                            <Link
                              href={`/medicines/${item.medicine_id}`}
                              className="font-semibold text-zinc-900 dark:text-zinc-100 hover:underline block truncate"
                            >
                              {item.medicine_name}
                            </Link>
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                              {item.brand_name && (
                                <span className="font-medium text-zinc-600 dark:text-zinc-400">
                                  {item.brand_name}
                                </span>
                              )}
                              {item.generic_name && <span>· {item.generic_name}</span>}
                              {item.branch_code && (
                                <span className="font-mono text-[9px] bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 px-1 py-0.2 rounded border border-zinc-200 dark:border-zinc-700 ml-1">
                                  {item.branch_code}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* 2. Batch (Monospace badge with copy) */}
                      <TableCell className="py-3 px-3 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 text-[11px]">
                            {item.batch_no}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleCopyBatch(item.batch_no)}
                            title="Copy Batch Number"
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5"
                          >
                            {copiedBatch === item.batch_no ? (
                              <Check className="size-3 text-emerald-600" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </button>

                          {item.is_fefo_priority && (
                            <span className="text-[9px] font-bold bg-amber-500 text-white px-1 py-0 rounded">
                              FEFO
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* 3. Expiry (Date + countdown) */}
                      <TableCell className="py-3 px-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {formatDate(item.expiry_date)}
                          </span>

                          {days < 0 ? (
                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                              Expired ({Math.abs(days)}d ago)
                            </span>
                          ) : days <= 30 ? (
                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 animate-pulse">
                              {days} days remaining
                            </span>
                          ) : days <= 90 ? (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              {days} days remaining
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-400">
                              {days} days left
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* 4. Available */}
                      <TableCell className="py-3 px-3 text-right">
                        <span
                          className={cn(
                            "font-mono font-bold text-sm",
                            isOutOfStock
                              ? "text-zinc-400 line-through"
                              : isLow
                                ? "text-amber-700 dark:text-amber-400"
                                : "text-zinc-900 dark:text-zinc-100",
                          )}
                        >
                          {item.available.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-zinc-400 block">units</span>
                      </TableCell>

                      {/* 5. Reserved */}
                      <TableCell className="py-3 px-3 text-right font-mono">
                        {item.reserved > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            {item.reserved}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </TableCell>

                      {/* 6. Cost */}
                      <TableCell className="py-3 px-3 text-right font-mono text-zinc-600 dark:text-zinc-400">
                        {formatCurrency(item.purchase_price)}
                      </TableCell>

                      {/* 7. Selling Price */}
                      <TableCell className="py-3 px-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(item.selling_price)}
                      </TableCell>

                      {/* 8. Status (Subtle status indicators: In Stock, Low Stock, Expiring, Out of Stock) */}
                      <TableCell className="py-3 px-3 text-center">
                        {item.computedStatus === "In Stock" && (
                          <Badge
                            variant="outline"
                            className="text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60 rounded-full inline-flex items-center gap-1.5 px-2 py-0.5"
                          >
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            <span>In Stock</span>
                          </Badge>
                        )}

                        {item.computedStatus === "Low Stock" && (
                          <Badge
                            variant="outline"
                            className="text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60 rounded-full inline-flex items-center gap-1.5 px-2 py-0.5"
                          >
                            <span className="size-1.5 rounded-full bg-amber-500" />
                            <span>Low Stock</span>
                          </Badge>
                        )}

                        {item.computedStatus === "Expiring" && (
                          <Badge
                            variant="outline"
                            className="text-[11px] font-medium bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200/60 dark:border-orange-800/60 rounded-full inline-flex items-center gap-1.5 px-2 py-0.5"
                          >
                            <span className="size-1.5 rounded-full bg-orange-500 animate-pulse" />
                            <span>Expiring</span>
                          </Badge>
                        )}

                        {item.computedStatus === "Out of Stock" && (
                          <Badge
                            variant="outline"
                            className="text-[11px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 rounded-full inline-flex items-center gap-1.5 px-2 py-0.5"
                          >
                            <span className="size-1.5 rounded-full bg-zinc-400" />
                            <span>Out of Stock</span>
                          </Badge>
                        )}
                      </TableCell>

                      {/* 9. Actions */}
                      <TableCell className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canAdjust && (
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300"
                            >
                              <Link
                                href={`/stock/adjustments/new?batchId=${item.id}&medicineId=${item.medicine_id}`}
                              >
                                <span>Adjust</span>
                              </Link>
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="size-7 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                              >
                                <MoreHorizontal className="size-3.5" />
                                <span className="sr-only">More</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 text-xs">
                              <DropdownMenuItem asChild>
                                <Link href={`/medicines/${item.medicine_id}`}>
                                  <ExternalLink className="size-3.5 mr-2" />
                                  <span>Medicine Master</span>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/transfers/new?batchId=${item.id}`}>
                                  <ArrowLeftRight className="size-3.5 mr-2" />
                                  <span>Transfer Batch</span>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/pos?batch=${item.batch_no}`}>
                                  <Package className="size-3.5 mr-2" />
                                  <span>Dispense at POS</span>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link href="/stock/movements">
                                  <History className="size-3.5 mr-2" />
                                  <span>Movement Ledger</span>
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Footer & Pagination */}
        <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <div>
            Showing{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {sortedItems.length === 0 ? 0 : (page - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {Math.min(page * pageSize, sortedItems.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {sortedItems.length}
            </span>{" "}
            inventory batches
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2.5 text-xs font-medium border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
            >
              Previous
            </Button>

            <span className="px-2 text-xs font-mono text-zinc-700 dark:text-zinc-300">
              Page {page} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-2.5 text-xs font-medium border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
