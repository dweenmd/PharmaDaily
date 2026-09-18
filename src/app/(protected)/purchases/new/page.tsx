import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ShieldCheck, Truck } from "lucide-react";

import { PurchaseForm } from "@/features/purchases/components/purchase-form";
import { getMedicines } from "@/features/medicines/queries";
import { getSuppliers } from "@/features/suppliers/queries";
import { getAccessibleBranches } from "@/features/branches/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { type SupplierRow } from "@/types";

export const metadata: Metadata = {
  title: "New Purchase — PharmaDaily",
  description: "Record supplier consignment, batch lot details, and purchase invoices.",
};

const STOCK_EDITORS = ["super_admin", "branch_manager", "stock_manager"];

const DEMO_SUPPLIERS: SupplierRow[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Beximco Pharmaceuticals Ltd.",
    phone: "01711-000001",
    address: "17 Dhanmondi R/A, Road 2, Dhaka",
    due_amount: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    name: "Square Pharmaceuticals Ltd.",
    phone: "01711-000002",
    address: "Square Centre, 48 Mohakhali C/A, Dhaka",
    due_amount: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    name: "Incepta Pharmaceuticals Ltd.",
    phone: "01711-000003",
    address: "40 Shahid Tajuddin Ahmed Sarani, Tejgaon, Dhaka",
    due_amount: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    name: "Renata Limited",
    phone: "01711-000004",
    address: "Plot 1, Milk Vita Road, Section 7, Mirpur, Dhaka",
    due_amount: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  },
];

const DEMO_MEDICINES = [
  {
    id: "00000000-0000-0000-0000-000000000011",
    name: "Napa 500mg",
    generic_name: "Paracetamol",
    strength: "500 mg",
    unit: "Tablet",
    barcode: "89411001001",
  },
  {
    id: "00000000-0000-0000-0000-000000000012",
    name: "Napa Extra",
    generic_name: "Paracetamol + Caffeine",
    strength: "500 mg + 65 mg",
    unit: "Tablet",
    barcode: "89411001002",
  },
  {
    id: "00000000-0000-0000-0000-000000000013",
    name: "Seclo 20mg",
    generic_name: "Omeprazole",
    strength: "20 mg",
    unit: "Capsule",
    barcode: "89411002001",
  },
  {
    id: "00000000-0000-0000-0000-000000000014",
    name: "Zimax 500mg",
    generic_name: "Azithromycin",
    strength: "500 mg",
    unit: "Tablet",
    barcode: "89411003001",
  },
  {
    id: "00000000-0000-0000-0000-000000000015",
    name: "Sergel 20mg",
    generic_name: "Esomeprazole",
    strength: "20 mg",
    unit: "Capsule",
    barcode: "89411004001",
  },
  {
    id: "00000000-0000-0000-0000-000000000016",
    name: "Fexo 120mg",
    generic_name: "Fexofenadine HCl",
    strength: "120 mg",
    unit: "Tablet",
    barcode: "89411005001",
  },
  {
    id: "00000000-0000-0000-0000-000000000017",
    name: "Ace Plus",
    generic_name: "Paracetamol + Caffeine",
    strength: "500 mg + 65 mg",
    unit: "Tablet",
    barcode: "89411006001",
  },
  {
    id: "00000000-0000-0000-0000-000000000018",
    name: "Ceevit 250mg",
    generic_name: "Ascorbic Acid (Vitamin C)",
    strength: "250 mg",
    unit: "Chewable Tablet",
    barcode: "89411007001",
  },
];

export default async function NewPurchasePage() {
  const profile = await getCurrentProfile();
  if (!profile || !STOCK_EDITORS.includes(profile.role)) notFound();

  const [suppliers, medicines, branches] = await Promise.all([
    getSuppliers(),
    getMedicines({ status: "active" }),
    getAccessibleBranches(),
  ]);

  const effectiveSuppliers = suppliers.length > 0 ? suppliers : DEMO_SUPPLIERS;
  const effectiveMedicines = medicines.length > 0 ? medicines : DEMO_MEDICINES;
  const effectiveBranches =
    branches.length > 0
      ? branches
      : [{ id: "00000000-0000-0000-0000-000000000001", name: "Main Branch", code: "MB-01" }];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/purchases" className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="size-3" />
              Purchases
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">New Purchase</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            New Purchase
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Consignment intake, batch lot numbers, supplier invoice, and payments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium font-mono text-[11px]">FEFO ENFORCED</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <ShieldCheck className="size-3.5 text-zinc-500" />
            <span>Audit-Ready Ledger</span>
          </div>
        </div>
      </div>

      <PurchaseForm
        suppliers={effectiveSuppliers}
        medicines={effectiveMedicines}
        branches={effectiveBranches}
        defaultBranchId={profile.branch_id}
        canChooseBranch={isSuperAdmin(profile.role)}
      />
    </div>
  );
}
