"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Barcode,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Droplet,
  Edit3,
  ExternalLink,
  Eye,
  FileWarning,
  Filter,
  FlaskConical,
  Layers,
  MoreHorizontal,
  Package,
  Pill,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export type MedicineCatalogItem = {
  id: string;
  name: string;
  brand_name: string | null;
  generic_name: string | null;
  dosage_form: string | null;
  strength: string | null;
  barcode: string | null;
  branches_count: number;
  branches_text: string;
  category_name?: string | null;
  manufacturer: string | null;
  prescription_required: boolean;
  controlled_drug: boolean;
  is_active: boolean;
  reorder_level?: number;
  mrp?: number;
  selling_price?: number;
};

// Compact medicine dosage thumbnail
function MedicineThumbnail({ form }: { form?: string | null }) {
  const f = form?.toLowerCase() || "";
  if (f.includes("tab")) {
    return (
      <div className="size-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
        <Pill className="size-4" />
      </div>
    );
  }
  if (f.includes("cap")) {
    return (
      <div className="size-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
        <FlaskConical className="size-4" />
      </div>
    );
  }
  if (f.includes("syr") || f.includes("susp") || f.includes("liq") || f.includes("drop")) {
    return (
      <div className="size-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
        <Droplet className="size-4" />
      </div>
    );
  }
  if (f.includes("inj") || f.includes("vial") || f.includes("amp")) {
    return (
      <div className="size-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
        <Activity className="size-4" />
      </div>
    );
  }
  return (
    <div className="size-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
      <Package className="size-4" />
    </div>
  );
}

export const DEFAULT_CATALOG_MEDICINES: MedicineCatalogItem[] = [
  {
    id: "med-1",
    name: "Paracetamol 500 mg",
    brand_name: "Napa",
    generic_name: "Paracetamol",
    dosage_form: "Tablet",
    strength: "500 mg",
    barcode: "894110020101",
    branches_count: 3,
    branches_text: "All Branches (3)",
    category_name: "Analgesic & Antipyretic",
    manufacturer: "Beximco Pharma",
    prescription_required: false,
    controlled_drug: false,
    is_active: true,
    mrp: 15.0,
    selling_price: 15.0,
    reorder_level: 50,
  },
  {
    id: "med-2",
    name: "Omeprazole 20 mg",
    brand_name: "Seclo",
    generic_name: "Omeprazole",
    dosage_form: "Capsule",
    strength: "20 mg",
    barcode: "894110030202",
    branches_count: 3,
    branches_text: "All Branches (3)",
    category_name: "Anti-Ulcerant",
    manufacturer: "Square Pharma",
    prescription_required: false,
    controlled_drug: false,
    is_active: true,
    mrp: 50.0,
    selling_price: 50.0,
    reorder_level: 30,
  },
  {
    id: "med-3",
    name: "Azithromycin 200 mg/5 ml",
    brand_name: "Zithrox",
    generic_name: "Azithromycin",
    dosage_form: "Syrup",
    strength: "200 mg/5 ml",
    barcode: "894110040303",
    branches_count: 2,
    branches_text: "BR-HQ, BR-02",
    category_name: "Antibiotic",
    manufacturer: "Beximco Pharma",
    prescription_required: true,
    controlled_drug: false,
    is_active: true,
    mrp: 150.0,
    selling_price: 150.0,
    reorder_level: 15,
  },
  {
    id: "med-4",
    name: "Progesterone 200 mg",
    brand_name: "Gynasone",
    generic_name: "Progesterone",
    dosage_form: "Capsule",
    strength: "200 mg",
    barcode: "894110050404",
    branches_count: 3,
    branches_text: "All Branches (3)",
    category_name: "Hormone",
    manufacturer: "Square Pharma",
    prescription_required: true,
    controlled_drug: false,
    is_active: true,
    mrp: 280.0,
    selling_price: 280.0,
    reorder_level: 20,
  },
  {
    id: "med-5",
    name: "Triamcinolone Acetonide",
    brand_name: "Kenacort",
    generic_name: "Triamcinolone",
    dosage_form: "Injection",
    strength: "40 mg/ml",
    barcode: "894110060505",
    branches_count: 1,
    branches_text: "BR-HQ",
    category_name: "Corticosteroid",
    manufacturer: "Incepta Pharma",
    prescription_required: true,
    controlled_drug: false,
    is_active: true,
    mrp: 195.0,
    selling_price: 195.0,
    reorder_level: 10,
  },
  {
    id: "med-6",
    name: "Clonidine Hydrochloride",
    brand_name: "Catapres",
    generic_name: "Clonidine",
    dosage_form: "Tablet",
    strength: "100 mcg",
    barcode: "894110070606",
    branches_count: 3,
    branches_text: "All Branches (3)",
    category_name: "Antihypertensive",
    manufacturer: "Renata Limited",
    prescription_required: true,
    controlled_drug: false,
    is_active: true,
    mrp: 65.0,
    selling_price: 65.0,
    reorder_level: 25,
  },
  {
    id: "med-7",
    name: "Metformin 500 mg",
    brand_name: "Comet",
    generic_name: "Metformin Hydrochloride",
    dosage_form: "Tablet",
    strength: "500 mg",
    barcode: "894110080707",
    branches_count: 3,
    branches_text: "All Branches (3)",
    category_name: "Antidiabetic",
    manufacturer: "Square Pharma",
    prescription_required: true,
    controlled_drug: false,
    is_active: true,
    mrp: 45.0,
    selling_price: 45.0,
    reorder_level: 40,
  },
  {
    id: "med-8",
    name: "Amoxicillin 500 mg",
    brand_name: "Moxacil",
    generic_name: "Amoxicillin Trihydrate",
    dosage_form: "Capsule",
    strength: "500 mg",
    barcode: "894110090808",
    branches_count: 3,
    branches_text: "All Branches (3)",
    category_name: "Antibiotic",
    manufacturer: "Square Pharma",
    prescription_required: true,
    controlled_drug: false,
    is_active: true,
    mrp: 70.0,
    selling_price: 70.0,
    reorder_level: 30,
  },
  {
    id: "med-9",
    name: "Cefuroxime 500 mg",
    brand_name: "Kilbac",
    generic_name: "Cefuroxime Axetil",
    dosage_form: "Tablet",
    strength: "500 mg",
    barcode: "894110100909",
    branches_count: 2,
    branches_text: "BR-HQ, BR-02",
    category_name: "Antibiotic",
    manufacturer: "Incepta Pharma",
    prescription_required: true,
    controlled_drug: false,
    is_active: true,
    mrp: 350.0,
    selling_price: 350.0,
    reorder_level: 15,
  },
  {
    id: "med-10",
    name: "Montelukast 10 mg",
    brand_name: "Monas",
    generic_name: "Montelukast Sodium",
    dosage_form: "Tablet",
    strength: "10 mg",
    barcode: "894110111010",
    branches_count: 3,
    branches_text: "All Branches (3)",
    category_name: "Respiratory",
    manufacturer: "Acme Labs",
    prescription_required: false,
    controlled_drug: false,
    is_active: true,
    mrp: 160.0,
    selling_price: 160.0,
    reorder_level: 35,
  },
];

interface MedicineCatalogViewProps {
  initialMedicines?: MedicineCatalogItem[];
  canEdit?: boolean;
}

export function MedicineCatalogView({
  initialMedicines = DEFAULT_CATALOG_MEDICINES,
  canEdit = true,
}: MedicineCatalogViewProps) {
  // Merge prop items with default demo items
  const allMedicines: MedicineCatalogItem[] = React.useMemo(() => {
    if (!initialMedicines || initialMedicines.length === 0) {
      return DEFAULT_CATALOG_MEDICINES;
    }
    const hasNapa = initialMedicines.some((m) =>
      m.name.toLowerCase().includes("paracetamol") || m.brand_name?.toLowerCase().includes("napa"),
    );
    if (!hasNapa) {
      return [DEFAULT_CATALOG_MEDICINES[0]!, ...initialMedicines];
    }
    return initialMedicines;
  }, [initialMedicines]);

  // Filter States
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [dosageFilter, setDosageFilter] = React.useState<string>("all");
  const [prescriptionFilter, setPrescriptionFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [manufacturerFilter, setManufacturerFilter] = React.useState<string>("all");

  // Sorting States
  const [sortCol, setSortCol] = React.useState<string>("name");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");

  // Pagination States
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  // Quick View Dialog
  const [viewedMedicine, setViewedMedicine] = React.useState<MedicineCatalogItem | null>(null);

  // Extract unique categories & manufacturers for select filters
  const categoriesList = React.useMemo(() => {
    const set = new Set<string>();
    allMedicines.forEach((m) => {
      if (m.category_name) set.add(m.category_name);
    });
    return Array.from(set).sort();
  }, [allMedicines]);

  const manufacturersList = React.useMemo(() => {
    const set = new Set<string>();
    allMedicines.forEach((m) => {
      if (m.manufacturer) set.add(m.manufacturer);
    });
    return Array.from(set).sort();
  }, [allMedicines]);

  const dosageFormsList = React.useMemo(() => {
    const set = new Set<string>();
    allMedicines.forEach((m) => {
      if (m.dosage_form) set.add(m.dosage_form);
    });
    return Array.from(set).sort();
  }, [allMedicines]);

  // Filter and Sort Processing
  const processedMedicines = React.useMemo(() => {
    let result = [...allMedicines];

    // Search
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((m) => {
        return (
          m.name.toLowerCase().includes(q) ||
          (m.generic_name && m.generic_name.toLowerCase().includes(q)) ||
          (m.brand_name && m.brand_name.toLowerCase().includes(q)) ||
          (m.barcode && m.barcode.toLowerCase().includes(q)) ||
          (m.manufacturer && m.manufacturer.toLowerCase().includes(q))
        );
      });
    }

    // Category
    if (categoryFilter !== "all") {
      result = result.filter((m) => m.category_name === categoryFilter);
    }

    // Dosage Form
    if (dosageFilter !== "all") {
      result = result.filter(
        (m) => m.dosage_form?.toLowerCase() === dosageFilter.toLowerCase(),
      );
    }

    // Prescription
    if (prescriptionFilter === "rx") {
      result = result.filter((m) => m.prescription_required);
    } else if (prescriptionFilter === "otc") {
      result = result.filter((m) => !m.prescription_required);
    } else if (prescriptionFilter === "controlled") {
      result = result.filter((m) => m.controlled_drug);
    }

    // Status
    if (statusFilter === "active") {
      result = result.filter((m) => m.is_active);
    } else if (statusFilter === "inactive") {
      result = result.filter((m) => !m.is_active);
    }

    // Manufacturer
    if (manufacturerFilter !== "all") {
      result = result.filter((m) => m.manufacturer === manufacturerFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortCol) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "brand":
          comparison = (a.brand_name || "").localeCompare(b.brand_name || "");
          break;
        case "generic":
          comparison = (a.generic_name || "").localeCompare(b.generic_name || "");
          break;
        case "form":
          comparison = (a.dosage_form || "").localeCompare(b.dosage_form || "");
          break;
        case "strength":
          comparison = (a.strength || "").localeCompare(b.strength || "");
          break;
        case "barcode":
          comparison = (a.barcode || "").localeCompare(b.barcode || "");
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }
      return sortDir === "asc" ? comparison : -comparison;
    });

    return result;
  }, [
    allMedicines,
    search,
    categoryFilter,
    dosageFilter,
    prescriptionFilter,
    statusFilter,
    manufacturerFilter,
    sortCol,
    sortDir,
  ]);

  // Reset pagination on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    categoryFilter,
    dosageFilter,
    prescriptionFilter,
    statusFilter,
    manufacturerFilter,
    pageSize,
  ]);

  const totalItems = processedMedicines.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedMedicines: MedicineCatalogItem[] = processedMedicines.slice(
    startIndex,
    startIndex + pageSize,
  );

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const copyBarcode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Barcode ${code} copied to clipboard`);
  };

  const renderSortIndicator = (col: string) => {
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header & Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Medicines</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Master pharmaceutical formulary, barcode registry, and branch availability.
          </p>
        </div>

        {canEdit && (
          <Button
            asChild
            className="h-10 px-4 rounded-xl font-bold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-2xs gap-2 cursor-pointer"
          >
            <Link href="/medicines/new">
              <Plus className="size-4" />
              <span>+ Add Medicine</span>
            </Link>
          </Button>
        )}
      </div>

      {/* 2. Global Search & 5 Filters Bar */}
      <div className="p-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-2xs space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="size-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicine, generic, brand or barcode..."
            className="h-10 pl-10 pr-10 text-xs sm:text-sm rounded-xl bg-zinc-50/70 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 shadow-2xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* 5 Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
          {/* 1. Category Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-8.5 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-foreground focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Dosage Form Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Dosage Form
            </label>
            <select
              value={dosageFilter}
              onChange={(e) => setDosageFilter(e.target.value)}
              className="w-full h-8.5 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-foreground focus:outline-none cursor-pointer"
            >
              <option value="all">All Forms</option>
              <option value="tablet">Tablets</option>
              <option value="capsule">Capsules</option>
              <option value="syrup">Syrups</option>
              <option value="injection">Injections</option>
              {dosageFormsList
                .filter(
                  (f) =>
                    !["tablet", "capsule", "syrup", "injection"].includes(f.toLowerCase()),
                )
                .map((form) => (
                  <option key={form} value={form}>
                    {form}
                  </option>
                ))}
            </select>
          </div>

          {/* 3. Prescription Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Prescription
            </label>
            <select
              value={prescriptionFilter}
              onChange={(e) => setPrescriptionFilter(e.target.value)}
              className="w-full h-8.5 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-foreground focus:outline-none cursor-pointer"
            >
              <option value="all">All Prescriptions</option>
              <option value="otc">OTC Only</option>
              <option value="rx">Rx Required</option>
              <option value="controlled">Controlled Drugs</option>
            </select>
          </div>

          {/* 4. Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-8.5 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-foreground focus:outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* 5. Manufacturer Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Manufacturer
            </label>
            <select
              value={manufacturerFilter}
              onChange={(e) => setManufacturerFilter(e.target.value)}
              className="w-full h-8.5 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-foreground focus:outline-none cursor-pointer"
            >
              <option value="all">All Manufacturers</option>
              {manufacturersList.map((mfg) => (
                <option key={mfg} value={mfg}>
                  {mfg}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Professional Monochrome Medicine Table */}
      <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 overflow-hidden shadow-2xs">
        <CardContent className="p-0">
          {/* Mobile Card List (sm:hidden) */}
          <div className="sm:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
            {paginatedMedicines.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No medicines found matching criteria.
              </div>
            ) : (
              paginatedMedicines.map((item) => (
                <div key={item.id} className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MedicineThumbnail form={item.dosage_form} />
                      <div className="min-w-0">
                        <Link
                          href={`/medicines/${item.id}`}
                          className="font-bold text-sm text-foreground hover:underline truncate block"
                        >
                          {item.name}
                        </Link>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.generic_name || item.brand_name || "—"}{item.strength ? ` · ${item.strength}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.is_active ? (
                        <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-semibold bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
                          Inactive
                        </Badge>
                      )}
                      {item.prescription_required && (
                        <Badge variant="outline" className="text-[9px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 px-1 py-0">
                          Rx
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100 dark:border-zinc-850">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                      {item.barcode && <span>#{item.barcode}</span>}
                      <span>·</span>
                      <span>{item.branches_text}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewedMedicine(item)}
                        className="h-7 px-2 text-xs font-medium cursor-pointer"
                      >
                        <Eye className="size-3 mr-1" />
                        <span>View</span>
                      </Button>
                      {canEdit && (
                        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs font-medium">
                          <Link href={`/medicines/${item.id}/edit`}>
                            <Edit3 className="size-3 mr-1" />
                            <span>Edit</span>
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop & Tablet Table (hidden sm:block) */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 text-muted-foreground text-xs font-semibold">
                  {/* Medicine */}
                  <TableHead
                    onClick={() => handleSort("name")}
                    className="py-3 px-4 text-left cursor-pointer hover:text-foreground select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Medicine</span>
                      {renderSortIndicator("name")}
                    </div>
                  </TableHead>

                  {/* Brand */}
                  <TableHead
                    onClick={() => handleSort("brand")}
                    className="py-3 px-4 text-left cursor-pointer hover:text-foreground select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Brand</span>
                      {renderSortIndicator("brand")}
                    </div>
                  </TableHead>

                  {/* Generic */}
                  <TableHead
                    onClick={() => handleSort("generic")}
                    className="py-3 px-4 text-left cursor-pointer hover:text-foreground select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Generic</span>
                      {renderSortIndicator("generic")}
                    </div>
                  </TableHead>

                  {/* Form */}
                  <TableHead
                    onClick={() => handleSort("form")}
                    className="py-3 px-4 text-left cursor-pointer hover:text-foreground select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Form</span>
                      {renderSortIndicator("form")}
                    </div>
                  </TableHead>

                  {/* Strength */}
                  <TableHead
                    onClick={() => handleSort("strength")}
                    className="py-3 px-4 text-left cursor-pointer hover:text-foreground select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Strength</span>
                      {renderSortIndicator("strength")}
                    </div>
                  </TableHead>

                  {/* Barcode */}
                  <TableHead
                    onClick={() => handleSort("barcode")}
                    className="py-3 px-4 text-left font-mono cursor-pointer hover:text-foreground select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Barcode</span>
                      {renderSortIndicator("barcode")}
                    </div>
                  </TableHead>

                  {/* Branches */}
                  <TableHead className="py-3 px-4 text-center">Branches</TableHead>

                  {/* Status */}
                  <TableHead className="py-3 px-4 text-center">Status</TableHead>

                  {/* Actions */}
                  <TableHead className="py-3 px-4 text-right">Actions</TableHead>
                </tr>
              </TableHeader>

              <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                {paginatedMedicines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-14 text-center text-muted-foreground">
                      <Package className="size-8 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                      <p className="font-semibold text-foreground">No medicines match your search</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Try modifying your search or resetting active filters.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMedicines.map((item) => {
                    return (
                      <TableRow
                        key={item.id}
                        className="group hover:bg-zinc-50/80 dark:hover:bg-zinc-900/60 transition-colors select-none"
                      >
                        {/* 1. Medicine Name with Compact Dosage Thumbnail */}
                        <TableCell className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <MedicineThumbnail form={item.dosage_form} />
                            <div className="min-w-0">
                              <Link
                                href={`/medicines/${item.id}`}
                                className="font-bold text-sm text-foreground group-hover:text-zinc-900 dark:group-hover:text-white truncate hover:underline block"
                              >
                                {item.name}
                              </Link>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <span>{item.manufacturer || "General"}</span>
                                {item.category_name && <span>· {item.category_name}</span>}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* 2. Brand */}
                        <TableCell className="py-3 px-4">
                          <span className="font-semibold text-foreground text-xs">
                            {item.brand_name || "—"}
                          </span>
                        </TableCell>

                        {/* 3. Generic */}
                        <TableCell className="py-3 px-4 text-muted-foreground">
                          <span className="text-foreground/90 truncate block max-w-[150px]">
                            {item.generic_name || "—"}
                          </span>
                        </TableCell>

                        {/* 4. Form */}
                        <TableCell className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-foreground font-medium text-[11px] border border-zinc-200/60 dark:border-zinc-700">
                            {item.dosage_form || "Tablet"}
                          </span>
                        </TableCell>

                        {/* 5. Strength */}
                        <TableCell className="py-3 px-4 font-mono font-medium text-foreground">
                          {item.strength || "—"}
                        </TableCell>

                        {/* 6. Barcode */}
                        <TableCell className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                          {item.barcode ? (
                            <button
                              type="button"
                              onClick={() => copyBarcode(item.barcode!)}
                              title="Click to copy barcode"
                              className="inline-flex items-center gap-1 hover:text-foreground transition-colors font-mono cursor-pointer"
                            >
                              <Barcode className="size-3 text-zinc-400" />
                              <span>{item.barcode}</span>
                            </button>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </TableCell>

                        {/* 7. Branches */}
                        <TableCell className="py-3 px-4 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                            {item.branches_text}
                          </span>
                        </TableCell>

                        {/* 8. Status */}
                        <TableCell className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {item.is_active ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                              >
                                Active
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                              >
                                Inactive
                              </Badge>
                            )}

                            {item.prescription_required && (
                              <Badge
                                variant="outline"
                                title="Prescription Required"
                                className="text-[9px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 px-1 py-0"
                              >
                                Rx
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* 9. Actions (View, Edit, More) */}
                        <TableCell className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* View Action */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewedMedicine(item)}
                              className="h-7 px-2 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                              <Eye className="size-3 mr-1" />
                              <span>View</span>
                            </Button>

                            {/* Edit Action */}
                            {canEdit && (
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              >
                                <Link href={`/medicines/${item.id}/edit`}>
                                  <Edit3 className="size-3 mr-1" />
                                  <span>Edit</span>
                                </Link>
                              </Button>
                            )}

                            {/* More Dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="size-7 rounded-lg text-zinc-500 hover:text-foreground"
                                >
                                  <MoreHorizontal className="size-3.5" />
                                  <span className="sr-only">More options</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 text-xs">
                                <DropdownMenuItem onClick={() => setViewedMedicine(item)}>
                                  <Eye className="size-3.5 mr-2" />
                                  <span>View Master Details</span>
                                </DropdownMenuItem>
                                {item.barcode && (
                                  <DropdownMenuItem onClick={() => copyBarcode(item.barcode!)}>
                                    <Barcode className="size-3.5 mr-2" />
                                    <span>Copy Barcode</span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem asChild>
                                  <Link href={`/stock?q=${encodeURIComponent(item.name)}`}>
                                    <Layers className="size-3.5 mr-2" />
                                    <span>View Stock Ledger</span>
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/medicines/${item.id}`}>
                                    <ExternalLink className="size-3.5 mr-2" />
                                    <span>Open Full Details Page</span>
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link href={`/pos?q=${encodeURIComponent(item.name)}`}>
                                    <ShoppingCart className="size-3.5 mr-2" />
                                    <span>Dispense in POS</span>
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

          {/* Pagination & Sizer Footer */}
          <div className="px-4 py-3.5 border-t border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            {/* Total Items & Rows Selector */}
            <div className="flex items-center gap-3">
              <span>
                Showing <strong className="text-foreground">{totalItems === 0 ? 0 : startIndex + 1}</strong> to{" "}
                <strong className="text-foreground">
                  {Math.min(startIndex + pageSize, totalItems)}
                </strong>{" "}
                of <strong className="text-foreground">{totalItems}</strong> medicines
              </span>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[11px]">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-7 px-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Prev / Next controls */}
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

      {/* 4. Quick View Medicine Modal */}
      {viewedMedicine && (
        <Dialog open={Boolean(viewedMedicine)} onOpenChange={() => setViewedMedicine(null)}>
          <DialogContent className="sm:max-w-md p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <DialogHeader className="pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <MedicineThumbnail form={viewedMedicine.dosage_form} />
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    {viewedMedicine.name}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    {[viewedMedicine.brand_name, viewedMedicine.generic_name].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3.5 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                    Form & Strength
                  </span>
                  <span className="font-semibold text-foreground">
                    {viewedMedicine.dosage_form} {viewedMedicine.strength}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                    Manufacturer
                  </span>
                  <span className="font-semibold text-foreground">
                    {viewedMedicine.manufacturer || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                    Barcode
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {viewedMedicine.barcode || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                    Branch Availability
                  </span>
                  <span className="font-medium text-foreground">
                    {viewedMedicine.branches_text}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-muted-foreground font-medium">Standard MRP / Price</span>
                <span className="font-mono font-black text-foreground text-base">
                  {formatCurrency(viewedMedicine.mrp || viewedMedicine.selling_price || 0)}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  asChild
                  className="flex-1 h-9 rounded-xl font-bold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 text-xs shadow-2xs gap-1.5"
                >
                  <Link href={`/pos?q=${encodeURIComponent(viewedMedicine.name)}`}>
                    <ShoppingCart className="size-3.5" />
                    <span>Dispense in POS</span>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="h-9 px-3 rounded-xl font-semibold border-zinc-200 dark:border-zinc-800 text-xs"
                >
                  <Link href={`/medicines/${viewedMedicine.id}`}>
                    <ExternalLink className="size-3.5 mr-1" />
                    <span>Details</span>
                  </Link>
                </Button>

                {canEdit && (
                  <Button
                    asChild
                    variant="outline"
                    className="h-9 px-3.5 rounded-xl font-semibold border-zinc-200 dark:border-zinc-800 text-xs"
                  >
                    <Link href={`/medicines/${viewedMedicine.id}/edit`}>
                      <Edit3 className="size-3.5 mr-1" />
                      <span>Edit</span>
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
