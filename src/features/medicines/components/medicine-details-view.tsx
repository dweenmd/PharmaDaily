"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Barcode,
  Boxes,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  History,
  Info,
  Layers,
  Package,
  Pill,
  Printer,
  Receipt,
  Share2,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Truck,
  Warehouse,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  formatDateTime,
} from "@/lib/format";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type StockByBranchItem = {
  id: string;
  branch_name: string;
  branch_code: string;
  available: number;
  reserved: number;
  minimum: number;
  status: "Optimal" | "Adequate" | "Low Stock" | "Critical";
  shelf_location?: string;
  manager_name?: string;
};

export type MedicineBatchItem = {
  id: string;
  batch_no: string;
  expiry_date: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  mrp: number;
  branch_code: string;
  branch_name: string;
  status: "FEFO Active" | "Active" | "Near Expiry" | "Expired" | "Depleted";
  received_date: string;
  supplier_name: string;
};

export type MedicineSaleItem = {
  id: string;
  invoice_no: string;
  date: string;
  customer_name: string;
  branch_code: string;
  batch_no: string;
  quantity: number;
  unit_price: number;
  total: number;
  payment_method: string;
  cashier: string;
};

export type MedicinePurchaseItem = {
  id: string;
  invoice_no: string;
  date: string;
  supplier_name: string;
  branch_code: string;
  batch_no: string;
  quantity: number;
  cost_price: number;
  total_cost: number;
  status: "Received" | "Partial" | "Inspected";
};

export type MedicineDetailData = {
  id: string;
  name: string; // e.g. "Paracetamol 500 mg"
  status: "In Stock" | "Low Stock" | "Out of Stock" | "Inactive";
  brand_name: string; // e.g. "Napa"
  generic_name: string; // e.g. "Paracetamol"
  dosage_form: string; // e.g. "Tablet"
  strength: string; // e.g. "500 mg"
  category_name: string; // e.g. "Analgesic"
  prescription_required: boolean; // false -> "Not Required"
  barcode: string; // e.g. "894110012019"
  manufacturer: string; // e.g. "Beximco Pharmaceuticals Ltd."
  unit: string; // e.g. "tablet"
  pack_size: number; // e.g. 10
  reorder_level: number; // e.g. 100
  controlled_drug: boolean;

  // Summary KPI Cards
  summary: {
    total_stock: number;
    stock_value: number;
    branches_count: number;
    batches_count: number;
    expiring_quantity: number;
    earliest_expiry: string;
    earliest_days_left: number;
  };

  stock_by_branch: StockByBranchItem[];
  batches: MedicineBatchItem[];
  sales_history: MedicineSaleItem[];
  purchase_history: MedicinePurchaseItem[];
};

// ============================================================================
// Demo Fallback Data: Paracetamol 500 mg (Napa)
// ============================================================================

export const DEMO_PARACETAMOL: MedicineDetailData = {
  id: "demo-napa-500",
  name: "Paracetamol 500 mg",
  status: "In Stock",
  brand_name: "Napa",
  generic_name: "Paracetamol",
  dosage_form: "Tablet",
  strength: "500 mg",
  category_name: "Analgesic",
  prescription_required: false, // "Not Required"
  barcode: "894110012019",
  manufacturer: "Beximco Pharmaceuticals Ltd.",
  unit: "Tablet",
  pack_size: 10,
  reorder_level: 100,
  controlled_drug: false,

  summary: {
    total_stock: 1840,
    stock_value: 2760.0,
    branches_count: 3,
    batches_count: 4,
    expiring_quantity: 140, // 42 days left!
    earliest_expiry: "2026-10-31",
    earliest_days_left: 42,
  },

  stock_by_branch: [
    {
      id: "br-stk-1",
      branch_name: "Main Branch Counter",
      branch_code: "BR-HQ",
      available: 1120,
      reserved: 20,
      minimum: 100,
      status: "Optimal",
      shelf_location: "Shelf A-04 / Bin 12",
      manager_name: "Karim Ahmed",
    },
    {
      id: "br-stk-2",
      branch_name: "Dhanmondi Branch",
      branch_code: "BR-02",
      available: 480,
      reserved: 0,
      minimum: 50,
      status: "Optimal",
      shelf_location: "Aisle 2 / Tray 08",
      manager_name: "Farhana Islam",
    },
    {
      id: "br-stk-3",
      branch_name: "Uttara Outlet",
      branch_code: "BR-03",
      available: 240,
      reserved: 0,
      minimum: 40,
      status: "Adequate",
      shelf_location: "Rack C / Box 3",
      manager_name: "Tanvir Rahman",
    },
  ],

  batches: [
    {
      id: "b-01",
      batch_no: "BT-202601",
      expiry_date: "2026-10-31",
      quantity: 140,
      cost_price: 1.2,
      selling_price: 1.5,
      mrp: 1.5,
      branch_code: "BR-HQ",
      branch_name: "Main Branch Counter",
      status: "FEFO Active",
      received_date: "2025-11-10",
      supplier_name: "Beximco Central Depot",
    },
    {
      id: "b-02",
      batch_no: "BT-202602",
      expiry_date: "2027-03-15",
      quantity: 600,
      cost_price: 1.2,
      selling_price: 1.5,
      mrp: 1.5,
      branch_code: "BR-HQ",
      branch_name: "Main Branch Counter",
      status: "Active",
      received_date: "2026-03-20",
      supplier_name: "Beximco Central Depot",
    },
    {
      id: "b-03",
      batch_no: "BT-202603",
      expiry_date: "2027-06-30",
      quantity: 600,
      cost_price: 1.18,
      selling_price: 1.5,
      mrp: 1.5,
      branch_code: "BR-02",
      branch_name: "Dhanmondi Branch",
      status: "Active",
      received_date: "2026-06-05",
      supplier_name: "Beximco Central Depot",
    },
    {
      id: "b-04",
      batch_no: "BT-202604",
      expiry_date: "2027-11-20",
      quantity: 500,
      cost_price: 1.22,
      selling_price: 1.5,
      mrp: 1.5,
      branch_code: "BR-03",
      branch_name: "Uttara Outlet",
      status: "Active",
      received_date: "2026-08-14",
      supplier_name: "Beximco Central Depot",
    },
  ],

  sales_history: [
    {
      id: "sale-1",
      invoice_no: "BR-HQ-00231",
      date: "2026-09-19T10:42:00Z",
      customer_name: "Md. Rahim",
      branch_code: "BR-HQ",
      batch_no: "BT-202601",
      quantity: 2,
      unit_price: 8.5, // strip or blister
      total: 17.0,
      payment_method: "Cash",
      cashier: "Karim",
    },
    {
      id: "sale-2",
      invoice_no: "BR-HQ-00228",
      date: "2026-09-19T09:15:00Z",
      customer_name: "Walk-in Customer",
      branch_code: "BR-HQ",
      batch_no: "BT-202601",
      quantity: 10,
      unit_price: 1.5,
      total: 15.0,
      payment_method: "bKash",
      cashier: "Karim",
    },
    {
      id: "sale-3",
      invoice_no: "BR-02-00194",
      date: "2026-09-18T16:30:00Z",
      customer_name: "Mrs. Nasreen Akhtar",
      branch_code: "BR-02",
      batch_no: "BT-202603",
      quantity: 30,
      unit_price: 1.5,
      total: 45.0,
      payment_method: "Cash",
      cashier: "Farhana",
    },
    {
      id: "sale-4",
      invoice_no: "BR-03-00112",
      date: "2026-09-17T14:10:00Z",
      customer_name: "Tanvir Ahmed",
      branch_code: "BR-03",
      batch_no: "BT-202604",
      quantity: 20,
      unit_price: 1.5,
      total: 30.0,
      payment_method: "Card",
      cashier: "Tanvir",
    },
    {
      id: "sale-5",
      invoice_no: "BR-HQ-00204",
      date: "2026-09-16T11:20:00Z",
      customer_name: "Dr. Rafiqul Huq",
      branch_code: "BR-HQ",
      batch_no: "BT-202601",
      quantity: 50,
      unit_price: 1.5,
      total: 75.0,
      payment_method: "Cash",
      cashier: "Karim",
    },
  ],

  purchase_history: [
    {
      id: "po-1",
      invoice_no: "GRN-2026-0814",
      date: "2026-08-14",
      supplier_name: "Beximco Pharmaceuticals Ltd.",
      branch_code: "BR-03",
      batch_no: "BT-202604",
      quantity: 500,
      cost_price: 1.22,
      total_cost: 610.0,
      status: "Received",
    },
    {
      id: "po-2",
      invoice_no: "GRN-2026-0605",
      date: "2026-06-05",
      supplier_name: "Beximco Pharmaceuticals Ltd.",
      branch_code: "BR-02",
      batch_no: "BT-202603",
      quantity: 600,
      cost_price: 1.18,
      total_cost: 708.0,
      status: "Received",
    },
    {
      id: "po-3",
      invoice_no: "GRN-2026-0320",
      date: "2026-03-20",
      supplier_name: "Beximco Pharmaceuticals Ltd.",
      branch_code: "BR-HQ",
      batch_no: "BT-202602",
      quantity: 600,
      cost_price: 1.2,
      total_cost: 720.0,
      status: "Received",
    },
    {
      id: "po-4",
      invoice_no: "GRN-2025-1110",
      date: "2025-11-10",
      supplier_name: "Beximco Pharmaceuticals Ltd.",
      branch_code: "BR-HQ",
      batch_no: "BT-202601",
      quantity: 1000,
      cost_price: 1.2,
      total_cost: 1200.0,
      status: "Received",
    },
  ],
};

// ============================================================================
// Main Component
// ============================================================================

interface MedicineDetailsViewProps {
  initialData?: MedicineDetailData;
  canEdit?: boolean;
}

export function MedicineDetailsView({
  initialData = DEMO_PARACETAMOL,
  canEdit = true,
}: MedicineDetailsViewProps) {
  const medicine = initialData;
  const [activeTab, setActiveTab] = React.useState<string>("overview");
  const [copiedBarcode, setCopiedBarcode] = React.useState(false);
  const [copiedBatch, setCopiedBatch] = React.useState<string | null>(null);

  const handleCopyBarcode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedBarcode(true);
    setTimeout(() => setCopiedBarcode(false), 2000);
  };

  const handleCopyBatch = (batchNo: string) => {
    navigator.clipboard.writeText(batchNo);
    setCopiedBatch(batchNo);
    setTimeout(() => setCopiedBatch(null), 2000);
  };

  // Find the primary earliest expiring batch for the alert banner
  const fefoBatch = medicine.batches.find((b) => b.status === "FEFO Active") ?? medicine.batches[0];

  return (
    <div className="space-y-6">
      {/* 1. Back Navigation & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-8 -ml-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <Link href="/medicines">
            <ArrowLeft className="size-3.5 mr-1.5" />
            <span>All Medicines</span>
          </Link>
        </Button>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Action 1: Adjust Stock */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <Link href={`/stock/adjustments/new?medicineId=${medicine.id}`}>
              <SlidersHorizontal className="size-3.5 mr-1.5 text-zinc-500" />
              <span>Adjust Stock</span>
            </Link>
          </Button>

          {/* Action 2: Edit Medicine */}
          {canEdit && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <Link href={`/medicines/${medicine.id}/edit`}>
                <Edit3 className="size-3.5 mr-1.5 text-zinc-500" />
                <span>Edit Medicine</span>
              </Link>
            </Button>
          )}

          {/* Action 3: Create Purchase (Primary Black Button) */}
          <Button
            asChild
            size="sm"
            className="h-8 text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-sm"
          >
            <Link href={`/purchases/new?medicineId=${medicine.id}`}>
              <Warehouse className="size-3.5 mr-1.5" />
              <span>Create Purchase</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Header & Status Banner */}
      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            {/* Top Badge Strip */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status: In Stock */}
              <Badge
                variant="outline"
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full",
                  medicine.status === "In Stock"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/80"
                    : medicine.status === "Low Stock"
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800/80"
                      : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800/80",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    medicine.status === "In Stock"
                      ? "bg-emerald-500 animate-pulse"
                      : medicine.status === "Low Stock"
                        ? "bg-amber-500"
                        : "bg-red-500",
                  )}
                />
                <span>{medicine.status}</span>
              </Badge>

              {/* Prescription Status */}
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-medium rounded-md",
                  medicine.prescription_required
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
                )}
              >
                {medicine.prescription_required ? "Rx Required" : "Prescription: Not Required"}
              </Badge>

              {/* Category Pill */}
              <Badge
                variant="secondary"
                className="text-xs font-normal bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
              >
                {medicine.category_name}
              </Badge>

              <span className="text-xs font-mono text-zinc-400">
                SKU: {medicine.id.toUpperCase().slice(0, 12)}
              </span>
            </div>

            {/* Medicine Title */}
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 font-mono text-xs font-bold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 shadow-xs">
                {medicine.dosage_form.slice(0, 3).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {medicine.name}
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2">
                  <span>{medicine.manufacturer}</span>
                  <span>•</span>
                  <span>Pack size: {medicine.pack_size} units</span>
                  <span>•</span>
                  <span>Reorder threshold: {medicine.reorder_level} units</span>
                </p>
              </div>
            </div>
          </div>

          {/* Quick Counter Ready Badge & Dispensing Shortcut */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 border-zinc-100 dark:border-zinc-800">
            <div className="text-right">
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Retail Price / MRP
              </div>
              <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {formatCurrency(DEMO_PARACETAMOL.batches[0]?.selling_price ?? 1.5)}
                <span className="text-xs font-normal text-zinc-400"> / unit</span>
              </div>
            </div>

            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 text-xs font-semibold border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Link href={`/pos?medicine=${encodeURIComponent(medicine.name)}`}>
                <Receipt className="size-3.5 mr-1.5 text-zinc-600 dark:text-zinc-400" />
                <span>Sell at POS</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* 3. Medicine Information Grid (Brand, Generic, Form, Strength, Category, Prescription, Barcode) */}
        <Separator className="my-4 bg-zinc-100 dark:bg-zinc-800" />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7 text-xs">
          {/* Brand */}
          <div className="rounded-md border border-zinc-100 bg-zinc-50/70 p-2.5 dark:border-zinc-800/80 dark:bg-zinc-900/50">
            <span className="block text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              Brand
            </span>
            <span className="mt-0.5 block font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {medicine.brand_name || "—"}
            </span>
          </div>

          {/* Generic */}
          <div className="rounded-md border border-zinc-100 bg-zinc-50/70 p-2.5 dark:border-zinc-800/80 dark:bg-zinc-900/50">
            <span className="block text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              Generic
            </span>
            <span className="mt-0.5 block font-medium text-zinc-800 dark:text-zinc-200 truncate">
              {medicine.generic_name || "—"}
            </span>
          </div>

          {/* Form */}
          <div className="rounded-md border border-zinc-100 bg-zinc-50/70 p-2.5 dark:border-zinc-800/80 dark:bg-zinc-900/50">
            <span className="block text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              Form
            </span>
            <span className="mt-0.5 block font-medium text-zinc-800 dark:text-zinc-200">
              {medicine.dosage_form}
            </span>
          </div>

          {/* Strength */}
          <div className="rounded-md border border-zinc-100 bg-zinc-50/70 p-2.5 dark:border-zinc-800/80 dark:bg-zinc-900/50">
            <span className="block text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              Strength
            </span>
            <span className="mt-0.5 block font-mono font-medium text-zinc-800 dark:text-zinc-200">
              {medicine.strength || "—"}
            </span>
          </div>

          {/* Category */}
          <div className="rounded-md border border-zinc-100 bg-zinc-50/70 p-2.5 dark:border-zinc-800/80 dark:bg-zinc-900/50">
            <span className="block text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              Category
            </span>
            <span className="mt-0.5 block font-medium text-zinc-800 dark:text-zinc-200 truncate">
              {medicine.category_name}
            </span>
          </div>

          {/* Prescription */}
          <div className="rounded-md border border-zinc-100 bg-zinc-50/70 p-2.5 dark:border-zinc-800/80 dark:bg-zinc-900/50">
            <span className="block text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              Prescription
            </span>
            <span className="mt-0.5 block font-medium text-zinc-800 dark:text-zinc-200">
              {medicine.prescription_required ? "Rx Required" : "Not Required"}
            </span>
          </div>

          {/* Barcode */}
          <div className="col-span-2 sm:col-span-1 rounded-md border border-zinc-100 bg-zinc-50/70 p-2.5 dark:border-zinc-800/80 dark:bg-zinc-900/50">
            <span className="block text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              Barcode
            </span>
            <div className="mt-0.5 flex items-center justify-between gap-1">
              <span className="font-mono text-zinc-800 dark:text-zinc-200 truncate">
                {medicine.barcode || "No Barcode"}
              </span>
              {medicine.barcode && (
                <button
                  type="button"
                  onClick={() => handleCopyBarcode(medicine.barcode)}
                  title="Copy Barcode"
                  className="p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
                >
                  {copiedBarcode ? (
                    <Check className="size-3 text-emerald-600" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Summary KPI Cards (Total Stock, Branches, Batches, Expiring Quantity) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* KPI 1: Total Stock */}
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Total Stock
            </CardTitle>
            <Boxes className="size-4 text-zinc-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-50">
              {medicine.summary.total_stock.toLocaleString()}
              <span className="text-xs font-normal text-zinc-400 ml-1.5">units</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              Asset Value:{" "}
              <span className="font-mono font-medium text-zinc-900 dark:text-zinc-200">
                {formatCurrency(medicine.summary.stock_value)}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Branches */}
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Branches
            </CardTitle>
            <Building2 className="size-4 text-zinc-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-50">
              {medicine.summary.branches_count}
              <span className="text-xs font-normal text-zinc-400 ml-1.5">locations</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              Active across all branches
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Batches */}
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Batches
            </CardTitle>
            <Layers className="size-4 text-zinc-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-50">
              {medicine.summary.batches_count}
              <span className="text-xs font-normal text-zinc-400 ml-1.5">tracked</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              FEFO enforced on POS
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Expiring Quantity (HIGH VISIBILITY ALERT!) */}
        <Card
          className={cn(
            "border shadow-xs bg-white dark:bg-zinc-900 transition",
            medicine.summary.expiring_quantity > 0
              ? "border-amber-300 dark:border-amber-800/80 bg-amber-50/30 dark:bg-amber-950/10"
              : "border-zinc-200 dark:border-zinc-800",
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle
              className={cn(
                "text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5",
                medicine.summary.expiring_quantity > 0
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-zinc-500 dark:text-zinc-400",
              )}
            >
              {medicine.summary.expiring_quantity > 0 && (
                <AlertTriangle className="size-3.5 text-amber-500 animate-bounce" />
              )}
              <span>Expiring Quantity</span>
            </CardTitle>
            <Clock
              className={cn(
                "size-4",
                medicine.summary.expiring_quantity > 0
                  ? "text-amber-500"
                  : "text-zinc-400",
              )}
            />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div
              className={cn(
                "text-2xl font-bold font-mono",
                medicine.summary.expiring_quantity > 0
                  ? "text-amber-900 dark:text-amber-300"
                  : "text-zinc-900 dark:text-zinc-50",
              )}
            >
              {medicine.summary.expiring_quantity.toLocaleString()}
              <span className="text-xs font-normal text-zinc-500 ml-1.5">units</span>
            </div>
            <p
              className={cn(
                "text-[11px] mt-1 font-medium",
                medicine.summary.expiring_quantity > 0
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-zinc-500",
              )}
            >
              {medicine.summary.expiring_quantity > 0
                ? `Expires in ${medicine.summary.earliest_days_left} days (${formatDate(medicine.summary.earliest_expiry)})`
                : "No batches expiring within 90 days"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 5. Main Content Tabs (Overview, Stock by Branch, Batches, Sales History, Purchase History) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-zinc-100 p-1 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 rounded-lg flex flex-wrap h-auto gap-1">
          <TabsTrigger
            value="overview"
            className="text-xs font-semibold px-3.5 py-1.5 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs dark:data-[state=active]:bg-zinc-900 dark:data-[state=active]:text-zinc-100"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="stock_by_branch"
            className="text-xs font-semibold px-3.5 py-1.5 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs dark:data-[state=active]:bg-zinc-900 dark:data-[state=active]:text-zinc-100"
          >
            Stock by Branch ({medicine.stock_by_branch.length})
          </TabsTrigger>
          <TabsTrigger
            value="batches"
            className="text-xs font-semibold px-3.5 py-1.5 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs dark:data-[state=active]:bg-zinc-900 dark:data-[state=active]:text-zinc-100"
          >
            Batches ({medicine.batches.length})
            {medicine.summary.expiring_quantity > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                FEFO
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="sales_history"
            className="text-xs font-semibold px-3.5 py-1.5 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs dark:data-[state=active]:bg-zinc-900 dark:data-[state=active]:text-zinc-100"
          >
            Sales History ({medicine.sales_history.length})
          </TabsTrigger>
          <TabsTrigger
            value="purchase_history"
            className="text-xs font-semibold px-3.5 py-1.5 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs dark:data-[state=active]:bg-zinc-900 dark:data-[state=active]:text-zinc-100"
          >
            Purchase History ({medicine.purchase_history.length})
          </TabsTrigger>
        </TabsList>

        {/* ----------------------------------------------------------------- */}
        {/* Tab 1: Overview */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="overview" className="space-y-4">
          {/* FEFO Dispensing Alert Banner */}
          {fefoBatch && (
            <div className="rounded-lg border border-amber-300 bg-amber-50/50 p-4 dark:border-amber-800/80 dark:bg-amber-950/20 text-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-amber-100 p-2 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 shrink-0">
                    <ShieldAlert className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
                      <span>FEFO Priority Batch: {fefoBatch.batch_no}</span>
                      <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-800/80 dark:text-amber-100">
                        {fefoBatch.quantity} units remaining
                      </span>
                    </div>
                    <p className="text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                      This batch expires on{" "}
                      <span className="font-semibold">{formatDate(fefoBatch.expiry_date)}</span>{" "}
                      (in{" "}
                      <span className="font-bold underline">
                        {daysUntil(fefoBatch.expiry_date)} days
                      </span>
                      ). Dispensary POS is locked to route this batch first.
                    </p>
                  </div>
                </div>

                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-amber-300 text-amber-900 bg-white hover:bg-amber-100/50 dark:border-amber-700 dark:text-amber-200 dark:bg-zinc-900"
                >
                  <Link href={`/pos?batch=${fefoBatch.batch_no}`}>
                    <span>Sell Batch Now</span>
                    <ArrowUpRight className="size-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Left: Commercial & Pricing Snapshot */}
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Pricing & Margin Analysis
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Standard procurement vs retail rates
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">Avg. Cost Price</span>
                  <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(DEMO_PARACETAMOL.batches[0]?.cost_price ?? 1.2)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">Retail MRP</span>
                  <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(DEMO_PARACETAMOL.batches[0]?.selling_price ?? 1.5)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">Gross Margin per Unit</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    +৳0.30 (+25.0%)
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">Strip Price (10 tablets)</span>
                  <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(15.0)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-zinc-500">Box Price (100 tablets)</span>
                  <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(150.0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Middle: Stock Distribution Snapshot */}
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
                <div>
                  <CardTitle className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Branch Stock Allocation
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    On-hand quantities across retail outlets
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("stock_by_branch")}
                  className="h-7 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400"
                >
                  <span>View All Branches</span>
                  <ArrowUpRight className="size-3 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-3">
                  {medicine.stock_by_branch.map((branch) => {
                    const percentage = Math.round(
                      (branch.available / medicine.summary.total_stock) * 100,
                    );
                    return (
                      <div key={branch.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                              {branch.branch_name}
                            </span>
                            <span className="font-mono text-[10px] text-zinc-400">
                              ({branch.branch_code})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-xs">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {branch.available.toLocaleString()} units
                            </span>
                            <span className="text-zinc-400 text-[11px]">({percentage}%)</span>
                          </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-zinc-900 dark:bg-zinc-300 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Recent Activity preview */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Recent Sales Preview */}
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
                <div>
                  <CardTitle className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Recent Counter Dispenses
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    Latest customer transactions
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("sales_history")}
                  className="h-7 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                >
                  <span>Full History</span>
                  <ArrowUpRight className="size-3 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400">
                      <TableHead className="py-2 px-4">Invoice</TableHead>
                      <TableHead className="py-2 px-3">Customer</TableHead>
                      <TableHead className="py-2 px-3 text-center">Batch</TableHead>
                      <TableHead className="py-2 px-3 text-right">Qty</TableHead>
                      <TableHead className="py-2 px-4 text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {medicine.sales_history.slice(0, 3).map((sale) => (
                      <TableRow key={sale.id} className="hover:bg-zinc-50/50">
                        <TableCell className="py-2.5 px-4 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                          {sale.invoice_no}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300">
                          {sale.customer_name}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center font-mono text-[11px] text-zinc-500">
                          {sale.batch_no}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-right font-mono font-medium">
                          {sale.quantity}
                        </TableCell>
                        <TableCell className="py-2.5 px-4 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(sale.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Inward Purchases Preview */}
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
                <div>
                  <CardTitle className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Inward Consignments
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    Latest supplier receipts
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("purchase_history")}
                  className="h-7 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                >
                  <span>All Purchases</span>
                  <ArrowUpRight className="size-3 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400">
                      <TableHead className="py-2 px-4">GRN #</TableHead>
                      <TableHead className="py-2 px-3">Date</TableHead>
                      <TableHead className="py-2 px-3">Supplier</TableHead>
                      <TableHead className="py-2 px-3 text-right">Qty</TableHead>
                      <TableHead className="py-2 px-4 text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {medicine.purchase_history.slice(0, 3).map((po) => (
                      <TableRow key={po.id} className="hover:bg-zinc-50/50">
                        <TableCell className="py-2.5 px-4 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                          {po.invoice_no}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-zinc-500">
                          {formatDate(po.date)}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">
                          {po.supplier_name}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-right font-mono font-medium">
                          {po.quantity}
                        </TableCell>
                        <TableCell className="py-2.5 px-4 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(po.total_cost)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ----------------------------------------------------------------- */}
        {/* Tab 2: Stock by Branch Table */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="stock_by_branch">
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 pt-4 px-4 gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Stock by Branch
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Multi-branch inventory breakdown, reserved units, and minimum reorder buffers
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-medium border-zinc-200 dark:border-zinc-800"
                >
                  <Link href="/transfers/new">
                    <Truck className="size-3.5 mr-1.5 text-zinc-500" />
                    <span>Initiate Transfer</span>
                  </Link>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="w-full text-xs">
                  <TableHeader>
                    <tr className="bg-zinc-50/80 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                      <th className="py-3 px-4 text-left">Branch</th>
                      <th className="py-3 px-4 text-right">Available</th>
                      <th className="py-3 px-4 text-right">Reserved</th>
                      <th className="py-3 px-4 text-right">Minimum</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </TableHeader>
                  <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-200">
                    {medicine.stock_by_branch.map((item) => (
                      <TableRow key={item.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition">
                        {/* Branch */}
                        <TableCell className="py-3 px-4">
                          <div>
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                              <span>{item.branch_name}</span>
                              <span className="font-mono text-[10px] bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 px-1.5 py-0.2 rounded border border-zinc-200 dark:border-zinc-700">
                                {item.branch_code}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2">
                              <span>Location: {item.shelf_location || "Standard Shelf"}</span>
                              {item.manager_name && (
                                <>
                                  <span>•</span>
                                  <span>Mgr: {item.manager_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Available */}
                        <TableCell className="py-3 px-4 text-right">
                          <div className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">
                            {item.available.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-zinc-400">units in stock</div>
                        </TableCell>

                        {/* Reserved */}
                        <TableCell className="py-3 px-4 text-right">
                          <span
                            className={cn(
                              "font-mono font-medium",
                              item.reserved > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-400",
                            )}
                          >
                            {item.reserved}
                          </span>
                        </TableCell>

                        {/* Minimum */}
                        <TableCell className="py-3 px-4 text-right">
                          <span className="font-mono text-zinc-500 dark:text-zinc-400">
                            {item.minimum}
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3 px-4 text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1.5",
                              item.status === "Optimal"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                                : item.status === "Adequate"
                                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800"
                                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800",
                            )}
                          >
                            <span
                              className={cn(
                                "size-1.5 rounded-full",
                                item.status === "Optimal"
                                  ? "bg-emerald-500"
                                  : item.status === "Adequate"
                                    ? "bg-blue-500"
                                    : "bg-amber-500",
                              )}
                            />
                            <span>{item.status}</span>
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-3 px-4 text-right">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300"
                          >
                            <Link href={`/stock/adjustments/new?branchId=${item.id}&medicineId=${medicine.id}`}>
                              <span>Adjust</span>
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------------------------------------------------- */}
        {/* Tab 3: Batches Table (HIGH VISIBILITY EXPIRY & BATCH DETAILS!) */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="batches">
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 pt-4 px-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Batches & Shelf-Life Master
                  </CardTitle>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-mono font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    FEFO Protocol Active
                  </span>
                </div>
                <CardDescription className="text-xs text-zinc-500">
                  Batches ordered by earliest expiry date. Dispense top batch first to prevent inventory write-offs.
                </CardDescription>
              </div>

              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium border-zinc-200 dark:border-zinc-800"
              >
                <Link href={`/purchases/new?medicineId=${medicine.id}`}>
                  <Package className="size-3.5 mr-1.5 text-zinc-500" />
                  <span>Receive New Batch</span>
                </Link>
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="w-full text-xs">
                  <TableHeader>
                    <tr className="bg-zinc-50/80 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                      <th className="py-3 px-4 text-left">Batch</th>
                      <th className="py-3 px-4 text-left">Expiry (FEFO Priority)</th>
                      <th className="py-3 px-4 text-right">Quantity</th>
                      <th className="py-3 px-4 text-right">Cost</th>
                      <th className="py-3 px-4 text-right">Selling Price</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </TableHeader>
                  <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-200">
                    {medicine.batches.map((batch) => {
                      const daysLeft = daysUntil(batch.expiry_date);
                      const isNear = daysLeft <= 90;
                      const isCritical = daysLeft <= 30;
                      const isFEFO = batch.status === "FEFO Active";

                      return (
                        <TableRow
                          key={batch.id}
                          className={cn(
                            "transition",
                            isFEFO
                              ? "bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50/60 dark:hover:bg-amber-950/20"
                              : "hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40",
                          )}
                        >
                          {/* 1. Batch (Highly Visible Monospace Badge with Copy) */}
                          <TableCell className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 shadow-2xs">
                                {batch.batch_no}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleCopyBatch(batch.batch_no)}
                                title="Copy Batch Number"
                                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5"
                              >
                                {copiedBatch === batch.batch_no ? (
                                  <Check className="size-3 text-emerald-600" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </button>

                              {isFEFO && (
                                <Badge className="bg-amber-500 text-white font-bold text-[9px] px-1.5 py-0">
                                  FEFO NEXT
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-2">
                              <span>Branch: {batch.branch_code}</span>
                              <span>•</span>
                              <span>Recv: {formatDate(batch.received_date)}</span>
                            </div>
                          </TableCell>

                          {/* 2. Expiry (Highly Visible Expiry Badge & Days Remaining Countdown) */}
                          <TableCell className="py-3 px-4">
                            <div className="flex flex-col gap-1">
                              <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <Calendar className="size-3.5 text-zinc-400" />
                                <span>{formatDate(batch.expiry_date)}</span>
                              </div>

                              {/* Prominent Urgency Badge */}
                              <div>
                                {daysLeft < 0 ? (
                                  <span className="inline-flex items-center gap-1 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 px-1.5 py-0.5 text-[10px] font-bold border border-red-200 dark:border-red-900">
                                    <AlertCircle className="size-3" />
                                    EXPIRED ({Math.abs(daysLeft)} days ago)
                                  </span>
                                ) : isCritical ? (
                                  <span className="inline-flex items-center gap-1 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 px-1.5 py-0.5 text-[10px] font-bold border border-red-200 dark:border-red-900 animate-pulse">
                                    <AlertTriangle className="size-3 text-red-600" />
                                    CRITICAL: {daysLeft} days left
                                  </span>
                                ) : isNear ? (
                                  <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-bold border border-amber-200 dark:border-amber-900">
                                    <Clock className="size-3 text-amber-600" />
                                    NEAR EXPIRY: {daysLeft} days left
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-medium border border-emerald-200/60 dark:border-emerald-900/60">
                                    <CheckCircle2 className="size-3 text-emerald-500" />
                                    Safe ({daysLeft} days shelf-life)
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* 3. Quantity */}
                          <TableCell className="py-3 px-4 text-right">
                            <div className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">
                              {batch.quantity.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              {Math.floor(batch.quantity / medicine.pack_size)} packs
                            </div>
                          </TableCell>

                          {/* 4. Cost */}
                          <TableCell className="py-3 px-4 text-right">
                            <div className="font-mono font-medium text-zinc-700 dark:text-zinc-300">
                              {formatCurrency(batch.cost_price)}
                            </div>
                            <div className="text-[10px] text-zinc-400">unit cost</div>
                          </TableCell>

                          {/* 5. Selling Price */}
                          <TableCell className="py-3 px-4 text-right">
                            <div className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                              {formatCurrency(batch.selling_price)}
                            </div>
                            <div className="text-[10px] text-emerald-600 font-mono">
                              +{Math.round(((batch.selling_price - batch.cost_price) / batch.cost_price) * 100)}% margin
                            </div>
                          </TableCell>

                          {/* 6. Status */}
                          <TableCell className="py-3 px-4 text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1",
                                isFEFO
                                  ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                                  : isNear
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:border-emerald-800",
                              )}
                            >
                              <span
                                className={cn(
                                  "size-1.5 rounded-full",
                                  isFEFO
                                    ? "bg-amber-500 animate-ping"
                                    : isNear
                                      ? "bg-amber-500"
                                      : "bg-emerald-500",
                                )}
                              />
                              <span>{batch.status}</span>
                            </Badge>
                          </TableCell>

                          {/* 7. Actions */}
                          <TableCell className="py-3 px-4 text-right">
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs font-medium text-zinc-700 hover:text-zinc-900"
                            >
                              <Link href={`/pos?batch=${batch.batch_no}`}>
                                <span>Sell</span>
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------------------------------------------------- */}
        {/* Tab 4: Sales History Table */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="sales_history">
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 pt-4 px-4 gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Sales & Dispense History
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Audit log of all counter sales, invoices, and dispensing batches for this medicine
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-medium border-zinc-200 dark:border-zinc-800"
                >
                  <Download className="size-3.5 mr-1.5 text-zinc-500" />
                  <span>Export Sales Log</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="w-full text-xs">
                  <TableHeader>
                    <tr className="bg-zinc-50/80 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                      <th className="py-3 px-4 text-left">Invoice</th>
                      <th className="py-3 px-4 text-left">Date & Time</th>
                      <th className="py-3 px-4 text-left">Customer</th>
                      <th className="py-3 px-4 text-center">Branch</th>
                      <th className="py-3 px-4 text-center">Batch Dispensed</th>
                      <th className="py-3 px-4 text-right">Quantity</th>
                      <th className="py-3 px-4 text-right">Unit Price</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-right">Cashier</th>
                    </tr>
                  </TableHeader>
                  <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-200">
                    {medicine.sales_history.map((sale) => (
                      <TableRow key={sale.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition">
                        <TableCell className="py-3 px-4">
                          <Link
                            href={`/sales?search=${sale.invoice_no}`}
                            className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1"
                          >
                            <span>#{sale.invoice_no}</span>
                            <ExternalLink className="size-3 text-zinc-400" />
                          </Link>
                        </TableCell>

                        <TableCell className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                          {formatDateTime(sale.date)}
                        </TableCell>

                        <TableCell className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                          {sale.customer_name}
                        </TableCell>

                        <TableCell className="py-3 px-4 text-center font-mono text-[11px] text-zinc-500">
                          {sale.branch_code}
                        </TableCell>

                        <TableCell className="py-3 px-4 text-center">
                          <span className="font-mono font-semibold text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                            {sale.batch_no}
                          </span>
                        </TableCell>

                        <TableCell className="py-3 px-4 text-right font-mono font-medium">
                          {sale.quantity} units
                        </TableCell>

                        <TableCell className="py-3 px-4 text-right font-mono text-zinc-600 dark:text-zinc-400">
                          {formatCurrency(sale.unit_price)}
                        </TableCell>

                        <TableCell className="py-3 px-4 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(sale.total)}
                        </TableCell>

                        <TableCell className="py-3 px-4 text-right text-zinc-500">
                          {sale.cashier}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------------------------------------------------- */}
        {/* Tab 5: Purchase History Table */}
        {/* ----------------------------------------------------------------- */}
        <TabsContent value="purchase_history">
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 pt-4 px-4 gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Purchase History & Goods Received (GRN)
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Supplier purchase orders, inbound batches, and landed unit costs
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  asChild
                  size="sm"
                  className="h-8 text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  <Link href={`/purchases/new?medicineId=${medicine.id}`}>
                    <Warehouse className="size-3.5 mr-1.5" />
                    <span>New Inward Purchase</span>
                  </Link>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="w-full text-xs">
                  <TableHeader>
                    <tr className="bg-zinc-50/80 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                      <th className="py-3 px-4 text-left">PO / Invoice</th>
                      <th className="py-3 px-4 text-left">Date</th>
                      <th className="py-3 px-4 text-left">Supplier</th>
                      <th className="py-3 px-4 text-center">Branch</th>
                      <th className="py-3 px-4 text-center">Batch Received</th>
                      <th className="py-3 px-4 text-right">Received Qty</th>
                      <th className="py-3 px-4 text-right">Unit Cost</th>
                      <th className="py-3 px-4 text-right">Total Cost</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </TableHeader>
                  <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-200">
                    {medicine.purchase_history.map((po) => (
                      <TableRow key={po.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition">
                        <TableCell className="py-3 px-4 font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                          {po.invoice_no}
                        </TableCell>

                        <TableCell className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                          {formatDate(po.date)}
                        </TableCell>

                        <TableCell className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                          {po.supplier_name}
                        </TableCell>

                        <TableCell className="py-3 px-4 text-center font-mono text-[11px] text-zinc-500">
                          {po.branch_code}
                        </TableCell>

                        <TableCell className="py-3 px-4 text-center">
                          <span className="font-mono font-semibold text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                            {po.batch_no}
                          </span>
                        </TableCell>

                        <TableCell className="py-3 px-4 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {po.quantity.toLocaleString()} units
                        </TableCell>

                        <TableCell className="py-3 px-4 text-right font-mono text-zinc-600 dark:text-zinc-400">
                          {formatCurrency(po.cost_price)}
                        </TableCell>

                        <TableCell className="py-3 px-4 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(po.total_cost)}
                        </TableCell>

                        <TableCell className="py-3 px-4 text-center">
                          <Badge
                            variant="outline"
                            className="text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          >
                            {po.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
