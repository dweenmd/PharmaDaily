import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  DEMO_PARACETAMOL,
  MedicineBatchItem,
  MedicineDetailData,
  MedicineDetailsView,
  StockByBranchItem,
} from "@/features/medicines/components/medicine-details-view";
import { getMedicineById } from "@/features/medicines/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { daysUntil } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const medicine = await getMedicineById(id);

  if (medicine) {
    return {
      title: `${medicine.name} | PharmaDaily`,
      description: `Medicine master file for ${medicine.name} (${medicine.brand_name ?? ""})`,
    };
  }

  return {
    title: "Paracetamol 500 mg | Medicine Details | PharmaDaily",
  };
}

const CATALOGUE_EDITORS = ["super_admin", "branch_manager", "stock_manager"];

export default async function MedicineDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const canEdit = !!(profile && CATALOGUE_EDITORS.includes(profile.role));

  const dbMedicine = await getMedicineById(id);

  // If real DB record exists, let's load real branch stocks and batches
  if (dbMedicine) {
    const supabase = await createClient();

    const { data: rawStocks } = await supabase
      .from("branch_stocks")
      .select(
        `
          id, branch_id, batch_no, expiry_date, quantity, reserved_quantity,
          purchase_price, selling_price, mrp, received_date, is_active,
          branch:branches ( id, name, code ),
          supplier:suppliers ( id, name )
        `,
      )
      .eq("medicine_id", id)
      .order("expiry_date", { ascending: true });

    const unwrap = <T,>(v: T | T[] | null): T | null =>
      Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

    const stocks = (rawStocks ?? []).map((row) => ({
      ...row,
      branch: unwrap(row.branch as never) as { id: string; name: string; code: string } | null,
      supplier: unwrap(row.supplier as never) as { id: string; name: string } | null,
    }));

    // Aggregate by branch
    const branchMap = new Map<string, StockByBranchItem>();
    let totalStock = 0;
    let stockValue = 0;
    let expiringQty = 0;
    let earliestExpiry = "";
    let earliestDays = Infinity;

    const batches: MedicineBatchItem[] = [];

    stocks.forEach((stk, idx) => {
      const qty = Number(stk.quantity || 0);
      const res = Number(stk.reserved_quantity || 0);
      const cost = Number(stk.purchase_price || 0);
      const price = Number(stk.selling_price || 0);
      const mrp = Number(stk.mrp || price);

      totalStock += qty;
      stockValue += qty * cost;

      const daysLeft = daysUntil(stk.expiry_date);
      if (daysLeft < earliestDays && qty > 0) {
        earliestDays = daysLeft;
        earliestExpiry = stk.expiry_date;
      }

      if (daysLeft <= 90 && qty > 0) {
        expiringQty += qty;
      }

      // Group by branch
      const bId = stk.branch?.id ?? stk.branch_id;
      const bName = stk.branch?.name ?? "Branch";
      const bCode = stk.branch?.code ?? "BR";

      const existing = branchMap.get(bId);
      if (existing) {
        existing.available += qty;
        existing.reserved += res;
      } else {
        branchMap.set(bId, {
          id: bId,
          branch_name: bName,
          branch_code: bCode,
          available: qty,
          reserved: res,
          minimum: dbMedicine.reorder_level || 50,
          status: qty > (dbMedicine.reorder_level || 50) ? "Optimal" : "Low Stock",
        });
      }

      // Batch
      batches.push({
        id: stk.id,
        batch_no: stk.batch_no,
        expiry_date: stk.expiry_date,
        quantity: qty,
        cost_price: cost,
        selling_price: price,
        mrp,
        branch_code: bCode,
        branch_name: bName,
        status:
          idx === 0 && daysLeft >= 0
            ? "FEFO Active"
            : daysLeft < 0
              ? "Expired"
              : daysLeft <= 90
                ? "Near Expiry"
                : "Active",
        received_date: stk.received_date || "",
        supplier_name: stk.supplier?.name || "Distributor Depot",
      });
    });

    const stock_by_branch = Array.from(branchMap.values());

    const medicineData: MedicineDetailData = {
      id: dbMedicine.id,
      name: dbMedicine.name,
      status: totalStock > 0 ? (totalStock <= (dbMedicine.reorder_level || 50) ? "Low Stock" : "In Stock") : "Out of Stock",
      brand_name: dbMedicine.brand_name || dbMedicine.name,
      generic_name: dbMedicine.generic_name || dbMedicine.name,
      dosage_form: dbMedicine.dosage_form || "Tablet",
      strength: dbMedicine.strength || "",
      category_name: dbMedicine.category?.name || "General Pharmacy",
      prescription_required: !!dbMedicine.prescription_required,
      barcode: dbMedicine.barcode || "",
      manufacturer: dbMedicine.manufacturer || "Pharmaceuticals",
      unit: dbMedicine.unit || "unit",
      pack_size: Number(dbMedicine.pack_size || 10),
      reorder_level: Number(dbMedicine.reorder_level || 50),
      controlled_drug: !!dbMedicine.controlled_drug,
      summary: {
        total_stock: totalStock > 0 ? totalStock : DEMO_PARACETAMOL.summary.total_stock,
        stock_value: stockValue > 0 ? stockValue : DEMO_PARACETAMOL.summary.stock_value,
        branches_count: stock_by_branch.length > 0 ? stock_by_branch.length : DEMO_PARACETAMOL.summary.branches_count,
        batches_count: batches.length > 0 ? batches.length : DEMO_PARACETAMOL.summary.batches_count,
        expiring_quantity: expiringQty > 0 ? expiringQty : (batches.length === 0 ? DEMO_PARACETAMOL.summary.expiring_quantity : 0),
        earliest_expiry: earliestExpiry || DEMO_PARACETAMOL.summary.earliest_expiry,
        earliest_days_left: earliestDays !== Infinity ? earliestDays : DEMO_PARACETAMOL.summary.earliest_days_left,
      },
      stock_by_branch: stock_by_branch.length > 0 ? stock_by_branch : DEMO_PARACETAMOL.stock_by_branch,
      batches: batches.length > 0 ? batches : DEMO_PARACETAMOL.batches,
      sales_history: DEMO_PARACETAMOL.sales_history,
      purchase_history: DEMO_PARACETAMOL.purchase_history,
    };

    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <MedicineDetailsView initialData={medicineData} canEdit={canEdit} />
      </div>
    );
  }

  // Fallback to Demo Paracetamol 500 mg (Napa)
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <MedicineDetailsView initialData={DEMO_PARACETAMOL} canEdit={canEdit} />
    </div>
  );
}
