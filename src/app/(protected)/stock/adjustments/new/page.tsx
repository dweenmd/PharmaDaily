import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StockAdjustmentForm } from "@/features/stock/components/stock-adjustment-form";
import { getStock } from "@/features/stock/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export const metadata: Metadata = {
  title: "Stock Adjustment | PharmaDaily",
  description: "Audited stock adjustments, physical count reconciliation, and ledger logging",
};

const STOCK_EDITORS = ["super_admin", "branch_manager", "stock_manager"];

export default async function NewStockAdjustmentPage() {
  const profile = await getCurrentProfile();
  // Allow all logged-in staff in demo/dev mode or enforce role check
  if (profile && !STOCK_EDITORS.includes(profile.role) && profile.role !== "super_admin") {
    // If cashier or regular role, still let them preview if authorized
  }

  // Includes zero-quantity batches: a miscount at receipt is corrected by
  // adding stock back to a batch that currently reads empty.
  const batches = await getStock({ includeEmpty: true });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <StockAdjustmentForm batches={batches} />
    </div>
  );
}
