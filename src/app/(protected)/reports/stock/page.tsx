import type { Metadata } from "next";

import { getAccessibleBranches } from "@/features/branches/queries";
import { getCategories } from "@/features/medicines/queries";
import {
  InventoryReportClient,
  type InventoryItem,
} from "@/features/reports/components/inventory-report-client";
import { getSuppliers } from "@/features/suppliers/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";
import { daysUntil } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Inventory Report · Business Intelligence",
  description: "Enterprise inventory valuation, FEFO shelf-life audit, low stock alerts, and dormant stock tracking.",
};

function unwrap<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export default async function StockReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();

  const branch = typeof params.branch === "string" ? params.branch : null;
  const superAdmin = profile ? isSuperAdmin(profile.role) : false;
  const branchFilter = superAdmin ? branch : (profile?.branch_id ?? null);

  const supabase = await createClient();

  // Fetch branches, categories, suppliers, and branch stock items
  let stockQuery = supabase
    .from("branch_stocks")
    .select(
      `
      id, branch_id, medicine_id, batch_no, expiry_date, quantity, reserved_quantity,
      purchase_price, selling_price, mrp, received_date, is_active,
      medicine:medicines (
        id, name, generic_name, strength, unit, dosage_form, barcode, reorder_level,
        category:medicine_categories ( id, name )
      ),
      supplier:suppliers ( id, name ),
      branch:branches ( id, name, code )
    `,
    )
    .is("deleted_at", null)
    .order("expiry_date", { ascending: true })
    .limit(1000);

  if (branchFilter) {
    stockQuery = stockQuery.eq("branch_id", branchFilter);
  }

  const [branches, categories, suppliers, stockRes] = await Promise.all([
    getAccessibleBranches(),
    getCategories(),
    getSuppliers(),
    stockQuery,
  ]);

  const rawRows = stockRes.data ?? [];

  // Map database rows to InventoryItem
  const initialInventory: InventoryItem[] = rawRows.map((row) => {
    const medRaw = unwrap(row.medicine as never) as {
      id: string;
      name: string;
      generic_name: string | null;
      strength: string | null;
      unit: string | null;
      dosage_form: string | null;
      barcode: string | null;
      reorder_level: number;
      category: { id: string; name: string } | { id: string; name: string }[] | null;
    } | null;

    const suppRaw = unwrap(row.supplier as never) as { id: string; name: string } | null;
    const branchRaw = unwrap(row.branch as never) as { id: string; name: string; code: string } | null;

    const categoryObj = medRaw?.category ? unwrap(medRaw.category as never) as { id: string; name: string } | null : null;
    const categoryName = categoryObj?.name ?? "General Formulations";
    const categoryId = categoryObj?.id ?? null;

    const qty = Number(row.quantity ?? 0);
    const reserved = Number(row.reserved_quantity ?? 0);
    const avail = Math.max(0, qty - reserved);
    const cost = Number(row.purchase_price ?? 0);
    const mrp = Number(row.mrp || row.selling_price || cost * 1.3);
    const value = qty * cost;
    const retailValue = qty * mrp;
    const expiryDate = row.expiry_date || new Date().toISOString().slice(0, 10);
    const daysLeft = daysUntil(expiryDate);
    const reorderLevel = Number(medRaw?.reorder_level ?? 50);

    // Determine Stock Status
    let status: InventoryItem["status"] = "in_stock";
    if (qty <= 0) {
      status = "out_of_stock";
    } else if (daysLeft < 0) {
      status = "expired";
    } else if (daysLeft <= 90) {
      status = "expiring_soon";
    } else if (qty <= reorderLevel) {
      status = "low_stock";
    }

    return {
      id: row.id,
      medicine_id: row.medicine_id,
      medicine_name: medRaw?.name ?? "Medicine",
      generic_name: medRaw?.generic_name,
      strength: medRaw?.strength,
      dosage_form: medRaw?.dosage_form,
      unit: medRaw?.unit,
      batch_no: row.batch_no,
      barcode: medRaw?.barcode,
      branch_id: row.branch_id,
      branch_code: branchRaw?.code ?? "MAIN",
      branch_name: branchRaw?.name ?? "Main Branch",
      category_id: categoryId,
      category_name: categoryName,
      supplier_id: suppRaw?.id ?? null,
      supplier_name: suppRaw?.name ?? "Primary Distributor",
      quantity: qty,
      reserved_quantity: reserved,
      available_quantity: avail,
      reorder_level: reorderLevel,
      cost,
      mrp,
      value,
      retail_value: retailValue,
      expiry_date: expiryDate,
      days_to_expiry: daysLeft,
      received_date: row.received_date,
      status,
    };
  });

  const branchFilterOptions = [
    { id: "all", name: "All Branches" },
    ...branches.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
    })),
  ];

  const categoryFilterOptions = [
    { id: "all", name: "All Categories" },
    ...categories.map((c) => ({
      id: c.id,
      name: c.name,
    })),
  ];

  const supplierFilterOptions = [
    { id: "all", name: "All Suppliers" },
    ...suppliers.map((s) => ({
      id: s.id,
      name: s.name,
    })),
  ];

  return (
    <InventoryReportClient
      initialInventory={initialInventory}
      branches={branchFilterOptions}
      categories={categoryFilterOptions}
      suppliers={supplierFilterOptions}
      isSuperAdmin={superAdmin}
    />
  );
}
