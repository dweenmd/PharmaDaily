"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Package,
  PackageX,
  Percent,
  Pill,
  Printer,
  RotateCcw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Truck,
  Warehouse,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { ReportsNav } from "@/features/reports/components/reports-nav";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export type InventoryItem = {
  id: string;
  medicine_id: string;
  medicine_name: string;
  generic_name?: string | null;
  strength?: string | null;
  dosage_form?: string | null;
  unit?: string | null;
  batch_no: string;
  barcode?: string | null;
  branch_id?: string | null;
  branch_code: string;
  branch_name: string;
  category_id?: string | null;
  category_name: string;
  supplier_id?: string | null;
  supplier_name: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  reorder_level: number;
  cost: number; // purchase price
  mrp: number; // selling price
  value: number; // quantity * cost
  retail_value: number; // quantity * mrp
  expiry_date: string; // YYYY-MM-DD
  days_to_expiry: number;
  received_date?: string;
  last_sold_date?: string;
  days_dormant?: number; // for dead stock
  status: "in_stock" | "low_stock" | "expiring_soon" | "expired" | "out_of_stock" | "dead_stock";
};

export type FilterOption = {
  id: string;
  name: string;
  code?: string;
};

export type CategoryValuation = {
  category_name: string;
  item_count: number;
  batch_count: number;
  total_units: number;
  cost_value: number;
  retail_value: number;
  margin_percent: number;
  share_percent: number;
};

type Props = {
  initialInventory: InventoryItem[];
  branches: FilterOption[];
  categories: FilterOption[];
  suppliers: FilterOption[];
  isSuperAdmin?: boolean;
};

// ---------------------------------------------------------------------------
// REALISTIC DEMO DATA (Fallback when database is fresh or empty)
// ---------------------------------------------------------------------------

const DEMO_BRANCHES: FilterOption[] = [
  { id: "all", name: "All Branches" },
  { id: "MAIN", name: "Main Central Pharmacy", code: "MAIN" },
  { id: "DHAN", name: "Dhanmondi Branch", code: "DHAN" },
  { id: "GULS", name: "Gulshan Clinic Branch", code: "GULS" },
  { id: "MIRP", name: "Mirpur 10 Branch", code: "MIRP" },
  { id: "UTTA", name: "Uttara Sector 7 Branch", code: "UTTA" },
];

const DEMO_CATEGORIES: FilterOption[] = [
  { id: "all", name: "All Categories" },
  { id: "cat-01", name: "Analgesics & Antipyretics" },
  { id: "cat-02", name: "Antacids & Anti-ulcerants" },
  { id: "cat-03", name: "Antibiotics & Antimicrobials" },
  { id: "cat-04", name: "Respiratory & Antiasthma" },
  { id: "cat-05", name: "Cardiovascular & Antihypertensive" },
  { id: "cat-06", name: "Antidiabetic Agents" },
  { id: "cat-07", name: "Vitamins & Nutritional Supplements" },
  { id: "cat-08", name: "Topical & Dermatology" },
];

const DEMO_SUPPLIERS: FilterOption[] = [
  { id: "all", name: "All Suppliers" },
  { id: "sup-01", name: "Square Pharmaceuticals PLC" },
  { id: "sup-02", name: "Beximco Pharmaceuticals Ltd" },
  { id: "sup-03", name: "Incepta Pharmaceuticals Ltd" },
  { id: "sup-04", name: "Renata Limited" },
  { id: "sup-05", name: "ACI Limited (Healthcare)" },
  { id: "sup-06", name: "Opsonin Pharma Limited" },
  { id: "sup-07", name: "Healthcare Pharmaceuticals Ltd" },
];

const DEMO_INVENTORY: InventoryItem[] = [
  {
    id: "inv-01",
    medicine_id: "med-01",
    medicine_name: "Napa Extra",
    generic_name: "Paracetamol + Caffeine",
    strength: "500mg + 65mg",
    dosage_form: "Tablet",
    unit: "Tablet",
    batch_no: "NP-8832",
    barcode: "894110012401",
    branch_code: "MAIN",
    branch_name: "Main Central Pharmacy",
    category_name: "Analgesics & Antipyretics",
    supplier_name: "Beximco Pharmaceuticals Ltd",
    quantity: 2400,
    reserved_quantity: 40,
    available_quantity: 2360,
    reorder_level: 500,
    cost: 1.85,
    mrp: 2.5,
    value: 4440.0,
    retail_value: 6000.0,
    expiry_date: "2027-08-30",
    days_to_expiry: 710,
    received_date: "2026-08-10",
    last_sold_date: "2026-09-18",
    days_dormant: 0,
    status: "in_stock",
  },
  {
    id: "inv-02",
    medicine_id: "med-02",
    medicine_name: "Seclo 20",
    generic_name: "Omeprazole",
    strength: "20mg",
    dosage_form: "Capsule",
    unit: "Capsule",
    batch_no: "SC-9912",
    barcode: "894110023502",
    branch_code: "MAIN",
    branch_name: "Main Central Pharmacy",
    category_name: "Antacids & Anti-ulcerants",
    supplier_name: "Square Pharmaceuticals PLC",
    quantity: 1850,
    reserved_quantity: 30,
    available_quantity: 1820,
    reorder_level: 400,
    cost: 3.6,
    mrp: 5.0,
    value: 6660.0,
    retail_value: 9250.0,
    expiry_date: "2027-04-15",
    days_to_expiry: 573,
    received_date: "2026-07-22",
    last_sold_date: "2026-09-18",
    days_dormant: 0,
    status: "in_stock",
  },
  {
    id: "inv-03",
    medicine_id: "med-03",
    medicine_name: "Sergel 20",
    generic_name: "Esomeprazole",
    strength: "20mg",
    dosage_form: "Tablet",
    unit: "Tablet",
    batch_no: "SG-4410",
    barcode: "894110034603",
    branch_code: "DHAN",
    branch_name: "Dhanmondi Branch",
    category_name: "Antacids & Anti-ulcerants",
    supplier_name: "Healthcare Pharmaceuticals Ltd",
    quantity: 140,
    reserved_quantity: 20,
    available_quantity: 120,
    reorder_level: 300,
    cost: 5.2,
    mrp: 7.0,
    value: 728.0,
    retail_value: 980.0,
    expiry_date: "2027-01-20",
    days_to_expiry: 488,
    received_date: "2026-05-18",
    last_sold_date: "2026-09-18",
    days_dormant: 0,
    status: "low_stock",
  },
  {
    id: "inv-04",
    medicine_id: "med-04",
    medicine_name: "Monas 10",
    generic_name: "Montelukast Sodium",
    strength: "10mg",
    dosage_form: "Tablet",
    unit: "Tablet",
    batch_no: "MN-9821",
    barcode: "894110045704",
    branch_code: "GULS",
    branch_name: "Gulshan Clinic Branch",
    category_name: "Respiratory & Antiasthma",
    supplier_name: "Square Pharmaceuticals PLC",
    quantity: 360,
    reserved_quantity: 10,
    available_quantity: 350,
    reorder_level: 200,
    cost: 11.5,
    mrp: 16.0,
    value: 4140.0,
    retail_value: 5760.0,
    expiry_date: "2026-10-25",
    days_to_expiry: 36,
    received_date: "2025-11-12",
    last_sold_date: "2026-09-18",
    days_dormant: 0,
    status: "expiring_soon",
  },
  {
    id: "inv-05",
    medicine_id: "med-05",
    medicine_name: "Ceevit Chewable",
    generic_name: "Ascorbic Acid (Vitamin C)",
    strength: "250mg",
    dosage_form: "Chewable Tablet",
    unit: "Tablet",
    batch_no: "CV-2026",
    barcode: "894110056805",
    branch_code: "MAIN",
    branch_name: "Main Central Pharmacy",
    category_name: "Vitamins & Nutritional Supplements",
    supplier_name: "Square Pharmaceuticals PLC",
    quantity: 1600,
    reserved_quantity: 0,
    available_quantity: 1600,
    reorder_level: 300,
    cost: 1.35,
    mrp: 2.0,
    value: 2160.0,
    retail_value: 3200.0,
    expiry_date: "2027-11-15",
    days_to_expiry: 787,
    received_date: "2026-06-15",
    last_sold_date: "2026-09-18",
    days_dormant: 0,
    status: "in_stock",
  },
  {
    id: "inv-06",
    medicine_id: "med-06",
    medicine_name: "Zithrin 500",
    generic_name: "Azithromycin",
    strength: "500mg",
    dosage_form: "Tablet",
    unit: "Tablet",
    batch_no: "ZT-1102",
    barcode: "894110067906",
    branch_code: "MIRP",
    branch_name: "Mirpur 10 Branch",
    category_name: "Antibiotics & Antimicrobials",
    supplier_name: "Beximco Pharmaceuticals Ltd",
    quantity: 28,
    reserved_quantity: 4,
    available_quantity: 24,
    reorder_level: 100,
    cost: 82.0,
    mrp: 110.0,
    value: 2296.0,
    retail_value: 3080.0,
    expiry_date: "2026-11-10",
    days_to_expiry: 52,
    received_date: "2025-12-05",
    last_sold_date: "2026-09-18",
    days_dormant: 0,
    status: "low_stock",
  },
  {
    id: "inv-07",
    medicine_id: "med-07",
    medicine_name: "Fexo 120",
    generic_name: "Fexofenadine HCl",
    strength: "120mg",
    dosage_form: "Tablet",
    unit: "Tablet",
    batch_no: "FX-3021",
    barcode: "894110078007",
    branch_code: "GULS",
    branch_name: "Gulshan Clinic Branch",
    category_name: "Respiratory & Antiasthma",
    supplier_name: "Square Pharmaceuticals PLC",
    quantity: 580,
    reserved_quantity: 10,
    available_quantity: 570,
    reorder_level: 150,
    cost: 4.4,
    mrp: 6.0,
    value: 2552.0,
    retail_value: 3480.0,
    expiry_date: "2027-06-28",
    days_to_expiry: 647,
    received_date: "2026-08-01",
    last_sold_date: "2026-09-18",
    days_dormant: 0,
    status: "in_stock",
  },
  {
    id: "inv-08",
    medicine_id: "med-08",
    medicine_name: "Moxaclav 625",
    generic_name: "Amoxicillin + Clavulanic Acid",
    strength: "500mg + 125mg",
    dosage_form: "Tablet",
    unit: "Tablet",
    batch_no: "MX-7701",
    barcode: "894110089108",
    branch_code: "UTTA",
    branch_name: "Uttara Sector 7 Branch",
    category_name: "Antibiotics & Antimicrobials",
    supplier_name: "Square Pharmaceuticals PLC",
    quantity: 0,
    reserved_quantity: 0,
    available_quantity: 0,
    reorder_level: 80,
    cost: 32.0,
    mrp: 42.0,
    value: 0.0,
    retail_value: 0.0,
    expiry_date: "2026-10-15",
    days_to_expiry: 26,
    received_date: "2025-10-10",
    last_sold_date: "2026-09-10",
    days_dormant: 8,
    status: "out_of_stock",
  },
  {
    id: "inv-09",
    medicine_id: "med-09",
    medicine_name: "Bexitrol F Inhaler",
    generic_name: "Salmeterol + Fluticasone",
    strength: "100mcg + 50mcg",
    dosage_form: "Inhaler",
    unit: "Canister",
    batch_no: "BX-9002",
    barcode: "894110090209",
    branch_code: "MAIN",
    branch_name: "Main Central Pharmacy",
    category_name: "Respiratory & Antiasthma",
    supplier_name: "Beximco Pharmaceuticals Ltd",
    quantity: 45,
    reserved_quantity: 2,
    available_quantity: 43,
    reorder_level: 25,
    cost: 340.0,
    mrp: 450.0,
    value: 15300.0,
    retail_value: 20250.0,
    expiry_date: "2027-09-12",
    days_to_expiry: 723,
    received_date: "2026-07-15",
    last_sold_date: "2026-09-18",
    days_dormant: 0,
    status: "in_stock",
  },
  {
    id: "inv-10",
    medicine_id: "med-10",
    medicine_name: "Lipitor 20",
    generic_name: "Atorvastatin Calcium",
    strength: "20mg",
    dosage_form: "Tablet",
    unit: "Tablet",
    batch_no: "LP-1190",
    barcode: "894110101310",
    branch_code: "DHAN",
    branch_name: "Dhanmondi Branch",
    category_name: "Cardiovascular & Antihypertensive",
    supplier_name: "Incepta Pharmaceuticals Ltd",
    quantity: 420,
    reserved_quantity: 15,
    available_quantity: 405,
    reorder_level: 150,
    cost: 18.5,
    mrp: 25.0,
    value: 7770.0,
    retail_value: 10500.0,
    expiry_date: "2027-03-10",
    days_to_expiry: 537,
    received_date: "2026-06-20",
    last_sold_date: "2026-09-17",
    days_dormant: 1,
    status: "in_stock",
  },
  {
    id: "inv-11",
    medicine_id: "med-11",
    medicine_name: "Gluco-Met 500",
    generic_name: "Metformin HCl",
    strength: "500mg",
    dosage_form: "Tablet",
    unit: "Tablet",
    batch_no: "GM-3301",
    barcode: "894110112411",
    branch_code: "MIRP",
    branch_name: "Mirpur 10 Branch",
    category_name: "Antidiabetic Agents",
    supplier_name: "Renata Limited",
    quantity: 90,
    reserved_quantity: 0,
    available_quantity: 90,
    reorder_level: 300,
    cost: 3.2,
    mrp: 4.5,
    value: 288.0,
    retail_value: 405.0,
    expiry_date: "2026-10-10",
    days_to_expiry: 21,
    received_date: "2025-10-01",
    last_sold_date: "2026-09-16",
    days_dormant: 2,
    status: "expiring_soon",
  },
  {
    id: "inv-12",
    medicine_id: "med-12",
    medicine_name: "Progut 20",
    generic_name: "Pantoprazole",
    strength: "20mg",
    dosage_form: "Tablet",
    unit: "Tablet",
    batch_no: "PG-2099",
    barcode: "894110123512",
    branch_code: "UTTA",
    branch_name: "Uttara Sector 7 Branch",
    category_name: "Antacids & Anti-ulcerants",
    supplier_name: "Incepta Pharmaceuticals Ltd",
    quantity: 350,
    reserved_quantity: 0,
    available_quantity: 350,
    reorder_level: 50,
    cost: 4.8,
    mrp: 6.5,
    value: 1680.0,
    retail_value: 2275.0,
    expiry_date: "2026-12-05",
    days_to_expiry: 77,
    received_date: "2025-08-10",
    last_sold_date: "2026-05-14",
    days_dormant: 127,
    status: "dead_stock",
  },
  {
    id: "inv-13",
    medicine_id: "med-13",
    medicine_name: "Ciprofloxacin 500",
    generic_name: "Ciprofloxacin",
    strength: "500mg",
    dosage_form: "Tablet",
    unit: "Tablet",
    batch_no: "CP-4402",
    barcode: "894110134613",
    branch_code: "MAIN",
    branch_name: "Main Central Pharmacy",
    category_name: "Antibiotics & Antimicrobials",
    supplier_name: "ACI Limited (Healthcare)",
    quantity: 180,
    reserved_quantity: 0,
    available_quantity: 180,
    reorder_level: 50,
    cost: 11.0,
    mrp: 15.0,
    value: 1980.0,
    retail_value: 2700.0,
    expiry_date: "2026-11-20",
    days_to_expiry: 62,
    received_date: "2025-07-12",
    last_sold_date: "2026-05-02",
    days_dormant: 139,
    status: "dead_stock",
  },
  {
    id: "inv-14",
    medicine_id: "med-14",
    medicine_name: "Ventolin Syrup",
    generic_name: "Salbutamol",
    strength: "2mg/5ml",
    dosage_form: "Syrup",
    unit: "Bottle",
    batch_no: "VT-0091",
    barcode: "894110145714",
    branch_code: "DHAN",
    branch_name: "Dhanmondi Branch",
    category_name: "Respiratory & Antiasthma",
    supplier_name: "GlaxoSmithKline / Beximco",
    quantity: 0,
    reserved_quantity: 0,
    available_quantity: 0,
    reorder_level: 40,
    cost: 38.0,
    mrp: 50.0,
    value: 0.0,
    retail_value: 0.0,
    expiry_date: "2026-08-30",
    days_to_expiry: -20,
    received_date: "2025-09-01",
    last_sold_date: "2026-09-02",
    days_dormant: 16,
    status: "out_of_stock",
  },
];

// ---------------------------------------------------------------------------
// HELPER FUNCTIONS
// ---------------------------------------------------------------------------

function escapeCsvCell(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

// ---------------------------------------------------------------------------
// MAIN INVENTORY REPORT CLIENT COMPONENT
// ---------------------------------------------------------------------------

export function InventoryReportClient({
  initialInventory = [],
  branches = [],
  categories = [],
  suppliers = [],
  isSuperAdmin = true,
}: Props) {
  // Use live database rows if provided, otherwise fallback to rich demo data
  const hasLiveData = initialInventory.length > 0;
  const rawInventory = hasLiveData ? initialInventory : DEMO_INVENTORY;
  const branchOptions = branches.length > 0 ? branches : DEMO_BRANCHES;
  const categoryOptions = categories.length > 0 ? categories : DEMO_CATEGORIES;
  const supplierOptions = suppliers.length > 0 ? suppliers : DEMO_SUPPLIERS;

  // -------------------------------------------------------------------------
  // 5 FILTERS (Branch, Category, Supplier, Stock Status, Expiry Range)
  // -------------------------------------------------------------------------
  const [selectedBranch, setSelectedBranch] = React.useState<string>("all");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [selectedSupplier, setSelectedSupplier] = React.useState<string>("all");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [selectedExpiryRange, setSelectedExpiryRange] = React.useState<string>("all");

  // Navigation tab for the 5 requested sections
  const [activeSection, setActiveSection] = React.useState<
    "all" | "valuation" | "low_stock" | "expiring" | "out_of_stock" | "dead_stock"
  >("all");

  // Search input inside detailed table
  const [tableSearch, setTableSearch] = React.useState("");

  // Pagination for detailed table
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Selected item for detail inspection drawer modal
  const [inspectedItem, setInspectedItem] = React.useState<InventoryItem | null>(null);

  // Reset Filters Handler
  const handleResetFilters = () => {
    setSelectedBranch("all");
    setSelectedCategory("all");
    setSelectedSupplier("all");
    setSelectedStatus("all");
    setSelectedExpiryRange("all");
    setTableSearch("");
    setActiveSection("all");
    setCurrentPage(1);
    toast.info("Inventory filters reset to default overview");
  };

  const hasActiveFilters =
    selectedBranch !== "all" ||
    selectedCategory !== "all" ||
    selectedSupplier !== "all" ||
    selectedStatus !== "all" ||
    selectedExpiryRange !== "all" ||
    tableSearch.trim().length > 0;

  // -------------------------------------------------------------------------
  // FILTERING LOGIC
  // -------------------------------------------------------------------------
  const filteredInventory = React.useMemo(() => {
    return rawInventory.filter((item) => {
      // 1. Branch filter
      if (selectedBranch !== "all") {
        if (
          item.branch_id &&
          item.branch_id !== selectedBranch &&
          item.branch_code !== selectedBranch
        ) {
          return false;
        }
      }

      // 2. Category filter
      if (selectedCategory !== "all") {
        if (
          item.category_id !== selectedCategory &&
          item.category_name !== selectedCategory &&
          !item.category_name.toLowerCase().includes(selectedCategory.toLowerCase())
        ) {
          return false;
        }
      }

      // 3. Supplier filter
      if (selectedSupplier !== "all") {
        if (
          item.supplier_id !== selectedSupplier &&
          item.supplier_name !== selectedSupplier &&
          !item.supplier_name.toLowerCase().includes(selectedSupplier.toLowerCase())
        ) {
          return false;
        }
      }

      // 4. Stock Status filter
      if (selectedStatus !== "all") {
        if (item.status !== selectedStatus) return false;
      }

      // 5. Expiry Range filter
      if (selectedExpiryRange !== "all") {
        const days = item.days_to_expiry;
        if (selectedExpiryRange === "expired" && days >= 0) return false;
        if (selectedExpiryRange === "critical" && (days < 0 || days > 30)) return false;
        if (selectedExpiryRange === "near_expiry" && (days < 0 || days > 90)) return false;
        if (selectedExpiryRange === "under_180" && (days < 0 || days > 180)) return false;
        if (selectedExpiryRange === "safe" && days <= 180) return false;
      }

      // Section Filter (if focused tab is active)
      if (activeSection === "low_stock" && item.status !== "low_stock") return false;
      if (activeSection === "expiring" && item.status !== "expiring_soon") return false;
      if (activeSection === "out_of_stock" && item.status !== "out_of_stock") return false;
      if (activeSection === "dead_stock" && item.status !== "dead_stock") return false;

      // Table text search
      if (tableSearch.trim()) {
        const query = tableSearch.toLowerCase();
        const matchesMed = item.medicine_name.toLowerCase().includes(query);
        const matchesGen = item.generic_name?.toLowerCase().includes(query) ?? false;
        const matchesBatch = item.batch_no.toLowerCase().includes(query);
        const matchesBarcode = item.barcode?.toLowerCase().includes(query) ?? false;
        const matchesSupp = item.supplier_name.toLowerCase().includes(query);
        if (!matchesMed && !matchesGen && !matchesBatch && !matchesBarcode && !matchesSupp) {
          return false;
        }
      }

      return true;
    });
  }, [
    rawInventory,
    selectedBranch,
    selectedCategory,
    selectedSupplier,
    selectedStatus,
    selectedExpiryRange,
    activeSection,
    tableSearch,
  ]);

  // -------------------------------------------------------------------------
  // 4 SUMMARY KPI CARDS COMPUTATION
  // -------------------------------------------------------------------------
  const summaryKpis = React.useMemo(() => {
    const totalCostValue = filteredInventory.reduce((acc, item) => acc + item.value, 0);
    const totalRetailValue = filteredInventory.reduce((acc, item) => acc + item.retail_value, 0);
    const potentialMargin = totalRetailValue - totalCostValue;
    const potentialMarginPercent =
      totalRetailValue > 0 ? (potentialMargin / totalRetailValue) * 100 : 0;

    const totalUnits = filteredInventory.reduce((acc, item) => acc + item.quantity, 0);
    const activeBatches = filteredInventory.filter((i) => i.quantity > 0).length;

    const lowStockItems = filteredInventory.filter(
      (item) => item.status === "low_stock" || (item.quantity > 0 && item.quantity <= item.reorder_level),
    ).length;

    const expiringBatches = filteredInventory.filter(
      (item) => item.days_to_expiry > 0 && item.days_to_expiry <= 90 && item.quantity > 0,
    );
    const expiringStockCount = expiringBatches.length;
    const expiringStockValue = expiringBatches.reduce((acc, item) => acc + item.value, 0);

    const outOfStockCount = filteredInventory.filter((item) => item.quantity <= 0).length;
    const deadStockBatches = filteredInventory.filter((item) => item.status === "dead_stock");
    const deadStockValue = deadStockBatches.reduce((acc, item) => acc + item.value, 0);

    return {
      totalCostValue,
      totalRetailValue,
      potentialMargin,
      potentialMarginPercent,
      totalUnits,
      activeBatches,
      lowStockItems,
      expiringStockCount,
      expiringStockValue,
      outOfStockCount,
      deadStockCount: deadStockBatches.length,
      deadStockValue,
    };
  }, [filteredInventory]);

  // -------------------------------------------------------------------------
  // SECTION 1: STOCK VALUATION BY CATEGORY
  // -------------------------------------------------------------------------
  const categoryValuations: CategoryValuation[] = React.useMemo(() => {
    const map: Record<string, CategoryValuation> = {};

    filteredInventory.forEach((item) => {
      const cat = item.category_name || "General Formulations";
      if (!map[cat]) {
        map[cat] = {
          category_name: cat,
          item_count: 0,
          batch_count: 0,
          total_units: 0,
          cost_value: 0,
          retail_value: 0,
          margin_percent: 0,
          share_percent: 0,
        };
      }
      const existing = map[cat]!;
      existing.batch_count += 1;
      existing.total_units += item.quantity;
      existing.cost_value += item.value;
      existing.retail_value += item.retail_value;
    });

    const grandCost = Object.values(map).reduce((acc, c) => acc + c.cost_value, 0);

    return Object.values(map)
      .map((c) => {
        const margin = c.retail_value - c.cost_value;
        const marginPct = c.retail_value > 0 ? (margin / c.retail_value) * 100 : 0;
        const share = grandCost > 0 ? (c.cost_value / grandCost) * 100 : 0;
        return {
          ...c,
          margin_percent: Math.round(marginPct * 10) / 10,
          share_percent: Math.round(share * 10) / 10,
        };
      })
      .sort((a, b) => b.cost_value - a.cost_value);
  }, [filteredInventory]);

  // -------------------------------------------------------------------------
  // SECTION 2: LOW STOCK ITEMS
  // -------------------------------------------------------------------------
  const lowStockList = React.useMemo(() => {
    return rawInventory
      .filter((i) => i.quantity <= i.reorder_level && i.quantity > 0)
      .sort((a, b) => a.quantity / (a.reorder_level || 1) - b.quantity / (b.reorder_level || 1));
  }, [rawInventory]);

  // -------------------------------------------------------------------------
  // SECTION 3: EXPIRING MEDICINES (FEFO < 90 Days)
  // -------------------------------------------------------------------------
  const expiringList = React.useMemo(() => {
    return rawInventory
      .filter((i) => i.days_to_expiry > 0 && i.days_to_expiry <= 90 && i.quantity > 0)
      .sort((a, b) => a.days_to_expiry - b.days_to_expiry);
  }, [rawInventory]);

  // -------------------------------------------------------------------------
  // SECTION 4: OUT OF STOCK ITEMS
  // -------------------------------------------------------------------------
  const outOfStockList = React.useMemo(() => {
    return rawInventory.filter((i) => i.quantity <= 0);
  }, [rawInventory]);

  // -------------------------------------------------------------------------
  // SECTION 5: DEAD STOCK ITEMS
  // -------------------------------------------------------------------------
  const deadStockList = React.useMemo(() => {
    return rawInventory.filter((i) => i.status === "dead_stock" || (i.days_dormant ?? 0) >= 90);
  }, [rawInventory]);

  // -------------------------------------------------------------------------
  // ACTIONS: EXPORT CSV
  // -------------------------------------------------------------------------
  const handleExportCsv = () => {
    if (filteredInventory.length === 0) {
      toast.error("No inventory rows to export", {
        description: "Please adjust active filters.",
      });
      return;
    }

    const headers = [
      "Medicine",
      "Strength",
      "Generic",
      "Batch",
      "Branch",
      "Category",
      "Supplier",
      "Quantity",
      "Unit Cost (BDT)",
      "Total Value (BDT)",
      "Retail MRP (BDT)",
      "Expiry Date",
      "Days To Expiry",
      "Status",
    ];

    const rows = filteredInventory.map((item) => [
      escapeCsvCell(item.medicine_name),
      escapeCsvCell(item.strength),
      escapeCsvCell(item.generic_name),
      escapeCsvCell(item.batch_no),
      escapeCsvCell(item.branch_name),
      escapeCsvCell(item.category_name),
      escapeCsvCell(item.supplier_name),
      escapeCsvCell(item.quantity),
      escapeCsvCell(item.cost.toFixed(2)),
      escapeCsvCell(item.value.toFixed(2)),
      escapeCsvCell(item.mrp.toFixed(2)),
      escapeCsvCell(item.expiry_date),
      escapeCsvCell(item.days_to_expiry),
      escapeCsvCell(item.status.replace("_", " ").toUpperCase()),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pharmadaily-inventory-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Inventory Report CSV Exported", {
      description: `${filteredInventory.length} inventory records downloaded.`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    toast.info("Preparing Inventory Audit Document", {
      description: "Opening print preview for PDF save...",
    });
    setTimeout(() => {
      window.print();
    }, 400);
  };

  // -------------------------------------------------------------------------
  // PAGINATION
  // -------------------------------------------------------------------------
  const totalPages = Math.ceil(filteredInventory.length / pageSize) || 1;
  const paginatedInventory = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInventory.slice(start, start + pageSize);
  }, [filteredInventory, currentPage, pageSize]);

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      {/* Reports Navigation Tabs */}
      <ReportsNav />

      {/* =================================================================== */}
      {/* 1. HEADER & ACTIONS */}
      {/* =================================================================== */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between border-b border-border/60 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Inventory Report
            </h1>
            <Badge
              variant="outline"
              className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-[10px] tracking-wider uppercase font-semibold px-2 py-0.5 border-zinc-300 dark:border-zinc-700"
            >
              FEFO Audited
            </Badge>
            <Badge
              variant="outline"
              className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] uppercase font-semibold px-2 py-0.5 border-emerald-300 dark:border-emerald-800"
            >
              Valuation Ledger
            </Badge>
            {!hasLiveData && (
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border-amber-300 text-[10px] px-2 py-0.5"
              >
                Sample Audit Preview
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm flex flex-wrap items-center gap-2">
            <span>
              Warehouse and pharmacy inventory audit across all branches, categories, and distributors
            </span>
            <span className="text-zinc-400">·</span>
            <span className="font-mono text-xs text-foreground font-medium">
              {filteredInventory.length} Batches Audited
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Real-time Shelf Balances
            </span>
          </p>
        </div>

        {/* Top-right Actions: Export CSV, Export PDF, Print */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-9 gap-1.5 text-xs font-semibold cursor-pointer border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-xs"
          >
            <Download className="size-3.5 text-muted-foreground" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            className="h-9 gap-1.5 text-xs font-semibold cursor-pointer border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-xs"
          >
            <FileSpreadsheet className="size-3.5 text-muted-foreground" />
            <span>Export PDF</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handlePrint}
            className="h-9 gap-1.5 text-xs font-semibold cursor-pointer bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:opacity-90 shadow-xs"
          >
            <Printer className="size-3.5" />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block border-b pb-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">PharmaDaily · Inventory Valuation & Audit Report</h2>
            <p className="text-xs text-zinc-500">
              Audit Date: {new Date().toLocaleDateString("en-GB")} · FEFO Stock Valuation
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold">
              Branch: {selectedBranch === "all" ? "All Outlets (Chainwide)" : selectedBranch}
            </p>
            <p className="text-zinc-500">Official Stocktake Document</p>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. FILTERS (Branch, Category, Supplier, Stock Status, Expiry Range) */}
      {/* =================================================================== */}
      <Card className="border-border/70 bg-card shadow-xs print:hidden">
        <CardContent className="p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-muted-foreground" />
              <span className="text-xs font-semibold tracking-tight uppercase text-muted-foreground">
                Inventory Filters
              </span>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2 cursor-pointer"
              >
                <RotateCcw className="size-3" />
                <span>Reset All Filters</span>
              </Button>
            )}
          </div>

          {/* 5 Filter Selectors Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
            {/* Filter 1: Branch */}
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">Branch</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="h-8 text-xs cursor-pointer">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branchOptions.map((b) => (
                    <SelectItem key={b.id} value={b.code || b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter 2: Category */}
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-8 text-xs cursor-pointer">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter 3: Supplier */}
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">Supplier / Distributor</Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="h-8 text-xs cursor-pointer">
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {supplierOptions.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter 4: Stock Status */}
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">Stock Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-8 text-xs cursor-pointer">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock Statuses</SelectItem>
                  <SelectItem value="in_stock">In Stock (Normal)</SelectItem>
                  <SelectItem value="low_stock">Low Stock (Reorder)</SelectItem>
                  <SelectItem value="expiring_soon">Expiring Soon (FEFO)</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock (Zero)</SelectItem>
                  <SelectItem value="dead_stock">Dead Stock (Dormant)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter 5: Expiry Range */}
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">Expiry Range</Label>
              <Select value={selectedExpiryRange} onValueChange={setSelectedExpiryRange}>
                <SelectTrigger className="h-8 text-xs cursor-pointer">
                  <SelectValue placeholder="All Expiries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Expiries</SelectItem>
                  <SelectItem value="expired">Expired (&lt; 0 Days)</SelectItem>
                  <SelectItem value="critical">Critical (&le; 30 Days)</SelectItem>
                  <SelectItem value="near_expiry">Near Expiry (&le; 90 Days)</SelectItem>
                  <SelectItem value="under_180">Expiring (&le; 180 Days)</SelectItem>
                  <SelectItem value="safe">Safe Balance (&gt; 180 Days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =================================================================== */}
      {/* 3. SUMMARY (4 KPI CARDS) */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Card 1: Stock Value (Cost & Retail) */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-900 dark:bg-zinc-100" />
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium tracking-tight">Stock Value (Cost)</span>
              <Warehouse className="size-3.5 text-zinc-500" />
            </div>
            <div className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-foreground">
              {formatCurrency(summaryKpis.totalCostValue)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/40">
              <span>Retail Value:</span>
              <span className="font-mono font-semibold text-foreground">
                {formatCurrency(summaryKpis.totalRetailValue)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Units */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500/70" />
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium tracking-tight">Total Units</span>
              <Boxes className="size-3.5 text-blue-500" />
            </div>
            <div className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-foreground">
              {summaryKpis.totalUnits.toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/40">
              <span>Active Batches:</span>
              <span className="font-mono font-semibold text-foreground">
                {summaryKpis.activeBatches} batches
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Low Stock */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500/80" />
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium tracking-tight">Low Stock</span>
              <AlertTriangle className="size-3.5 text-amber-500" />
            </div>
            <div className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-amber-700 dark:text-amber-400">
              {summaryKpis.lowStockItems} items
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/40">
              <span>Out of Stock:</span>
              <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                {summaryKpis.outOfStockCount} zero balance
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Expiring Stock */}
        <Card className="border-border/70 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500/80" />
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium tracking-tight">Expiring Stock (&le;90d)</span>
              <Clock className="size-3.5 text-rose-500" />
            </div>
            <div className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-rose-700 dark:text-rose-400">
              {summaryKpis.expiringStockCount} batches
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/40">
              <span>Capital at Risk:</span>
              <span className="font-mono font-semibold text-foreground">
                {formatCurrency(summaryKpis.expiringStockValue)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* =================================================================== */}
      {/* 4. SECTIONS (Navigation Tabs for 5 Dedicated Sections) */}
      {/* =================================================================== */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 pb-2.5 print:hidden">
        <span className="text-xs text-muted-foreground mr-1.5 font-medium">Jump to Section:</span>
        {[
          { id: "all", label: "All Overview", icon: Layers, count: filteredInventory.length },
          { id: "valuation", label: "Stock Valuation", icon: Warehouse, count: categoryValuations.length },
          { id: "low_stock", label: "Low Stock", icon: AlertTriangle, count: lowStockList.length },
          { id: "expiring", label: "Expiring Medicines", icon: Clock, count: expiringList.length },
          { id: "out_of_stock", label: "Out of Stock", icon: PackageX, count: outOfStockList.length },
          { id: "dead_stock", label: "Dead Stock", icon: ShieldAlert, count: deadStockList.length },
        ].map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <Button
              key={tab.id}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveSection(tab.id as never);
                setCurrentPage(1);
              }}
              className={cn(
                "h-7 text-xs font-semibold cursor-pointer gap-1.5 px-2.5",
                isActive
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              <IconComp className="size-3.5" />
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

      {/* =================================================================== */}
      {/* SECTION 1: STOCK VALUATION (Minimal Monochrome Charts) */}
      {/* =================================================================== */}
      {(activeSection === "all" || activeSection === "valuation") && (
        <Card className="border-border/70 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
                  <Warehouse className="size-4 text-muted-foreground" />
                  <span>Stock Valuation by Category</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Minimal monochrome capital allocation across therapeutic classifications
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">
                {categoryValuations.length} Classifications
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5">
            {categoryValuations.map((cat) => (
              <div key={cat.category_name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{cat.category_name}</span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      ({cat.total_units.toLocaleString()} units · {cat.batch_count} batches)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-foreground">
                      {formatCurrency(cat.cost_value)}
                    </span>
                    <span className="text-muted-foreground text-[11px] ml-1.5 font-mono">
                      ({cat.share_percent}%)
                    </span>
                  </div>
                </div>

                {/* Monochrome distribution bar */}
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all"
                    style={{ width: `${cat.share_percent}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>Retail Potential: {formatCurrency(cat.retail_value)}</span>
                  <span>Gross Margin: {cat.margin_percent}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* =================================================================== */}
      {/* SECTION 2 & 3: LOW STOCK & EXPIRING MEDICINES (Side by Side) */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Section 2: Low Stock */}
        {(activeSection === "all" || activeSection === "low_stock") && (
          <Card className="border-border/70 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
                    <AlertTriangle className="size-4 text-amber-500" />
                    <span>Low Stock Replenishment Alerts</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Medicines below reorder threshold requiring purchase orders
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                >
                  {lowStockList.length} Items
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {lowStockList.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  All inventory balances are currently above reorder levels.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {lowStockList.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 hover:bg-muted/30 transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <span>{item.medicine_name}</span>
                          <span className="font-normal text-muted-foreground text-[11px]">
                            {item.strength}
                          </span>
                          <Badge
                            variant="outline"
                            className="font-mono text-[9px] px-1 py-0 h-3.5 bg-muted/60"
                          >
                            {item.branch_code}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[220px]">
                          {item.generic_name} · Supplier: {item.supplier_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-amber-700 dark:text-amber-400">
                          {item.quantity} / {item.reorder_level} {item.unit || "units"}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Short: {Math.max(0, item.reorder_level - item.quantity)} needed
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Section 3: Expiring Medicines (FEFO shelf-life) */}
        {(activeSection === "all" || activeSection === "expiring") && (
          <Card className="border-border/70 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
                    <Clock className="size-4 text-rose-500" />
                    <span>Expiring Medicines (FEFO &le;90d)</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Batches requiring urgent dispensing priority or vendor return
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-300"
                >
                  {expiringList.length} Batches
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {expiringList.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No inventory batches expiring within 90 days.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {expiringList.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 hover:bg-muted/30 transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <span>{item.medicine_name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            Batch {item.batch_no}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Expires {formatDate(item.expiry_date)} ({item.days_to_expiry} days left)
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-rose-700 dark:text-rose-400">
                          {item.quantity} {item.unit || "units"}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Value: {formatCurrency(item.value)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* =================================================================== */}
      {/* SECTION 4 & 5: OUT OF STOCK & DEAD STOCK */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Section 4: Out of Stock */}
        {(activeSection === "all" || activeSection === "out_of_stock") && (
          <Card className="border-border/70 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
                    <PackageX className="size-4 text-muted-foreground" />
                    <span>Out of Stock Items</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Zero available balance across dispensing counters
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {outOfStockList.length} Items
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {outOfStockList.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No stockouts recorded across branch counters.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {outOfStockList.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 hover:bg-muted/30 transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <span>{item.medicine_name}</span>
                          <span className="font-normal text-muted-foreground">{item.strength}</span>
                          <Badge variant="outline" className="font-mono text-[9px] px-1 py-0">
                            {item.branch_code}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Supplier: {item.supplier_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="secondary"
                          className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-mono text-[10px] uppercase font-bold"
                        >
                          Zero Stock
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Section 5: Dead Stock */}
        {(activeSection === "all" || activeSection === "dead_stock") && (
          <Card className="border-border/70 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
                    <ShieldAlert className="size-4 text-muted-foreground" />
                    <span>Dead Stock (Dormant &ge;90d)</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Batches with zero dispensing movements tying up working capital
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {deadStockList.length} Batches
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {deadStockList.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No dormant inventory batches detected.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {deadStockList.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 hover:bg-muted/30 transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <span>{item.medicine_name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            Batch {item.batch_no}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Dormant for {item.days_dormant || 90} days · Last sold:{" "}
                          {item.last_sold_date ? formatDate(item.last_sold_date) : "None"}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-foreground">
                          {formatCurrency(item.value)}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {item.quantity} {item.unit || "units"} locked
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* =================================================================== */}
      {/* 5. DETAILED TABLE (8 SPECIFIC COLUMNS) */}
      {/* =================================================================== */}
      <Card className="border-border/70 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/40 bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">
                Batch Inventory Ledger
              </CardTitle>
              <CardDescription className="text-xs">
                Audited stock listing across all dispensing locations (FEFO ordered)
              </CardDescription>
            </div>

            {/* Table Search & Controls */}
            <div className="flex items-center gap-2 print:hidden">
              <div className="relative w-56 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search medicine, batch, generic..."
                  value={tableSearch}
                  onChange={(e) => {
                    setTableSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-8 pl-8 text-xs font-mono"
                />
                {tableSearch && (
                  <button
                    onClick={() => setTableSearch("")}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Rows Per Page */}
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-20 text-xs cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="25">25 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                  <SelectItem value="100">100 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        {/* 8 Columns Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Medicine</TableHead>
                <TableHead className="w-[120px] text-xs font-semibold">Batch</TableHead>
                <TableHead className="w-[110px] text-xs font-semibold">Branch</TableHead>
                <TableHead className="text-right text-xs font-semibold">Quantity</TableHead>
                <TableHead className="text-right text-xs font-semibold">Cost</TableHead>
                <TableHead className="text-right text-xs font-semibold">Value</TableHead>
                <TableHead className="w-[130px] text-xs font-semibold">Expiry</TableHead>
                <TableHead className="text-center text-xs font-semibold">Status</TableHead>
                <TableHead className="w-[60px] text-center text-xs font-semibold print:hidden">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <AlertCircle className="size-5 text-muted-foreground/60" />
                      <p className="text-sm font-medium">No inventory batches found</p>
                      <p className="text-xs text-muted-foreground">
                        Try resetting your active filters or clear search query.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInventory.map((item) => {
                  let statusBadge = (
                    <Badge
                      variant="secondary"
                      className="font-mono text-[10px] uppercase px-2 py-0.5"
                    >
                      In Stock
                    </Badge>
                  );

                  if (item.status === "low_stock") {
                    statusBadge = (
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-mono text-[10px] uppercase font-semibold border border-amber-300"
                      >
                        Low Stock
                      </Badge>
                    );
                  } else if (item.status === "expiring_soon") {
                    statusBadge = (
                      <Badge
                        variant="secondary"
                        className="bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300 font-mono text-[10px] uppercase font-semibold border border-rose-300"
                      >
                        Expiring Soon
                      </Badge>
                    );
                  } else if (item.status === "out_of_stock") {
                    statusBadge = (
                      <Badge
                        variant="secondary"
                        className="bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-200 font-mono text-[10px] uppercase font-bold"
                      >
                        Out of Stock
                      </Badge>
                    );
                  } else if (item.status === "dead_stock") {
                    statusBadge = (
                      <Badge
                        variant="secondary"
                        className="bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 font-mono text-[10px] uppercase font-semibold border border-purple-300"
                      >
                        Dead Stock
                      </Badge>
                    );
                  }

                  return (
                    <TableRow
                      key={item.id}
                      className="hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => setInspectedItem(item)}
                    >
                      {/* 1. Medicine */}
                      <TableCell className="text-xs">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <span>{item.medicine_name}</span>
                          <span className="font-normal text-muted-foreground text-[11px]">
                            {item.strength}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                          {item.generic_name}
                        </div>
                      </TableCell>

                      {/* 2. Batch */}
                      <TableCell className="font-mono text-xs text-foreground">
                        <div>{item.batch_no}</div>
                        {item.barcode && (
                          <div className="text-[10px] text-muted-foreground">{item.barcode}</div>
                        )}
                      </TableCell>

                      {/* 3. Branch */}
                      <TableCell className="text-xs">
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] px-1 py-0 h-4 bg-muted/60"
                        >
                          {item.branch_code}
                        </Badge>
                      </TableCell>

                      {/* 4. Quantity */}
                      <TableCell className="text-right font-mono text-xs font-bold text-foreground tabular-nums">
                        {item.quantity.toLocaleString()}{" "}
                        <span className="text-[10px] font-normal text-muted-foreground">
                          {item.unit || "units"}
                        </span>
                      </TableCell>

                      {/* 5. Cost */}
                      <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                        {formatCurrency(item.cost)}
                      </TableCell>

                      {/* 6. Value */}
                      <TableCell className="text-right font-mono text-xs font-bold text-foreground tabular-nums">
                        {formatCurrency(item.value)}
                      </TableCell>

                      {/* 7. Expiry */}
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        <div
                          className={cn(
                            item.days_to_expiry <= 30 && "text-rose-600 dark:text-rose-400 font-bold",
                            item.days_to_expiry > 30 &&
                              item.days_to_expiry <= 90 &&
                              "text-amber-600 dark:text-amber-400 font-medium",
                          )}
                        >
                          {formatDate(item.expiry_date)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {item.days_to_expiry <= 0
                            ? "EXPIRED"
                            : `${item.days_to_expiry}d remaining`}
                        </div>
                      </TableCell>

                      {/* 8. Status */}
                      <TableCell className="text-center whitespace-nowrap">{statusBadge}</TableCell>

                      {/* Action */}
                      <TableCell
                        className="text-center print:hidden"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectedItem(item);
                        }}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="size-3.5" />
                          <span className="sr-only">Inspect Batch</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Pagination Footer */}
        <div className="p-3 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground print:hidden bg-card">
          <div>
            Showing{" "}
            <strong className="text-foreground">
              {filteredInventory.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </strong>{" "}
            to{" "}
            <strong className="text-foreground">
              {Math.min(currentPage * pageSize, filteredInventory.length)}
            </strong>{" "}
            of <strong className="text-foreground">{filteredInventory.length}</strong> batches
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2 text-xs cursor-pointer"
            >
              <ChevronLeft className="size-3.5" />
              <span>Previous</span>
            </Button>
            <span className="font-mono text-xs px-2 text-foreground font-semibold">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-2 text-xs cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* =================================================================== */}
      {/* 6. BATCH DETAIL INSPECTION DRAWER / MODAL */}
      {/* =================================================================== */}
      {inspectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setInspectedItem(null)}
        >
          <div
            className="bg-card border border-border rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden text-foreground animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-border/60 flex items-start justify-between bg-muted/30">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base tracking-tight">
                    {inspectedItem.medicine_name}
                  </h3>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {inspectedItem.strength}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {inspectedItem.branch_code}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Generic: <strong>{inspectedItem.generic_name}</strong> · Category:{" "}
                  {inspectedItem.category_name}
                </p>
              </div>
              <button
                onClick={() => setInspectedItem(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 overflow-y-auto text-xs">
              {/* Batch & Supplier Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-md">
                <div>
                  <span className="text-muted-foreground text-[11px] block">Batch Number:</span>
                  <span className="font-mono font-bold text-foreground">
                    {inspectedItem.batch_no}
                  </span>
                  {inspectedItem.barcode && (
                    <span className="font-mono text-muted-foreground block text-[10px]">
                      Barcode: {inspectedItem.barcode}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px] block">Distributor:</span>
                  <span className="font-semibold text-foreground">
                    {inspectedItem.supplier_name}
                  </span>
                  <span className="text-muted-foreground block text-[10px]">
                    Branch: {inspectedItem.branch_name}
                  </span>
                </div>
              </div>

              {/* Quantity & Stock Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded bg-muted/30 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">On Hand</span>
                  <span className="font-mono font-bold text-base text-foreground">
                    {inspectedItem.quantity}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-muted/30 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">Reserved</span>
                  <span className="font-mono font-bold text-base text-muted-foreground">
                    {inspectedItem.reserved_quantity}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-muted/30 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">Available</span>
                  <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                    {inspectedItem.available_quantity}
                  </span>
                </div>
              </div>

              {/* Financial Valuation */}
              <div className="border border-border/60 rounded-md p-3 space-y-1.5">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Valuation Breakdown
                </h4>
                <div className="flex justify-between text-muted-foreground">
                  <span>Unit Purchase Cost:</span>
                  <span className="font-mono">{formatCurrency(inspectedItem.cost)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Retail Price (MRP):</span>
                  <span className="font-mono">{formatCurrency(inspectedItem.mrp)}</span>
                </div>
                <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border/40">
                  <span>Total Holding Value (at Cost):</span>
                  <span className="font-mono">{formatCurrency(inspectedItem.value)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Retail Ceiling Potential:</span>
                  <span className="font-mono">{formatCurrency(inspectedItem.retail_value)}</span>
                </div>
              </div>

              {/* FEFO Shelf-Life */}
              <div className="p-3 bg-muted/30 border border-border/50 rounded space-y-1">
                <span className="text-[11px] text-muted-foreground block">FEFO Shelf-Life:</span>
                <div className="flex justify-between font-semibold text-foreground">
                  <span>Expiry Date:</span>
                  <span className="font-mono">{formatDate(inspectedItem.expiry_date)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Days to Expiry:</span>
                  <span
                    className={cn(
                      "font-mono font-bold",
                      inspectedItem.days_to_expiry <= 30
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-foreground",
                    )}
                  >
                    {inspectedItem.days_to_expiry} days
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-3 border-t border-border/60 bg-muted/30 flex items-center justify-between gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="text-xs font-semibold cursor-pointer"
              >
                <Link href="/stock/adjustments/new">Stock Adjustment</Link>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold cursor-pointer"
                >
                  <Link href="/transfers/new">Stock Transfer</Link>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setInspectedItem(null)}
                  className="text-xs font-semibold cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
