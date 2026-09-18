import type { Metadata } from "next";

import {
  DEMO_STOCK_ITEMS,
  StockInventoryItem,
  StockManagementView,
} from "@/features/stock/components/stock-management-view";
import { getStock } from "@/features/stock/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";
import { toNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Stock | PharmaDaily",
  description: "Real-time multi-branch batch inventory tracking and FEFO expiry management",
};

const STOCK_EDITORS = ["super_admin", "branch_manager", "stock_manager"];

export default async function StockPage() {
  const [profile, dbStock] = await Promise.all([
    getCurrentProfile(),
    getStock({ includeEmpty: true }),
  ]);

  const canAdjust = profile ? STOCK_EDITORS.includes(profile.role) : true;
  const showBranch = profile ? isSuperAdmin(profile.role) : true;

  // Map real database rows if available, otherwise fallback to comprehensive demo inventory
  const stockItems: StockInventoryItem[] =
    dbStock && dbStock.length > 0
      ? dbStock.map((s, idx) => ({
          id: s.id,
          medicine_id: s.medicine_id,
          medicine_name:
            [s.medicine?.name, s.medicine?.strength].filter(Boolean).join(" ") || "Medicine",
          brand_name: s.medicine?.name,
          generic_name: s.medicine?.generic_name,
          dosage_form: "Tablet",
          strength: s.medicine?.strength,
          barcode: null,
          reorder_level: s.medicine?.reorder_level ?? 50,
          batch_no: s.batch_no,
          expiry_date: s.expiry_date,
          available: s.quantity,
          reserved: s.reserved_quantity || 0,
          purchase_price: toNumber(s.purchase_price),
          selling_price: toNumber(s.selling_price),
          mrp: toNumber(s.mrp || s.selling_price),
          branch_id: s.branch_id,
          branch_code: s.branch?.code || undefined,
          branch_name: s.branch?.name || undefined,
          supplier_name: s.supplier?.name || undefined,
          is_fefo_priority: idx === 0,
        }))
      : DEMO_STOCK_ITEMS;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <StockManagementView
        initialItems={stockItems}
        canAdjust={canAdjust}
        showBranch={showBranch}
      />
    </div>
  );
}
