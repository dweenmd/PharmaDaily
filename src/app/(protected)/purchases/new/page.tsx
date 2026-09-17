import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Truck } from "lucide-react";

import { PurchaseForm } from "@/features/purchases/components/purchase-form";
import { getMedicines } from "@/features/medicines/queries";
import { getSuppliers } from "@/features/suppliers/queries";
import { getAccessibleBranches } from "@/features/branches/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "New purchase",
};

const STOCK_EDITORS = ["super_admin", "branch_manager", "stock_manager"];

export default async function NewPurchasePage() {
  const profile = await getCurrentProfile();
  if (!profile || !STOCK_EDITORS.includes(profile.role)) notFound();

  const [suppliers, medicines, branches] = await Promise.all([
    getSuppliers(),
    getMedicines({ status: "active" }),
    getAccessibleBranches(),
  ]);

  // Both are prerequisites, so say which one is missing rather than showing a
  // form with two empty dropdowns.
  if (suppliers.length === 0 || medicines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader title="New purchase" />
        <EmptyState
          icon={Truck}
          title={suppliers.length === 0 ? "No suppliers yet" : "No medicines yet"}
          description={
            suppliers.length === 0
              ? "Add the supplier this consignment came from before recording it."
              : "Add the medicines in this consignment to the catalogue first."
          }
          action={
            <Button asChild>
              <Link href={suppliers.length === 0 ? "/suppliers/new" : "/medicines/new"}>
                {suppliers.length === 0 ? "Add Supplier" : "Add Medicine"}
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New purchase"
        description="Receiving a consignment creates or tops up stock and updates the supplier balance."
      />
      <PurchaseForm
        suppliers={suppliers}
        medicines={medicines}
        branches={branches}
        defaultBranchId={profile.branch_id}
        canChooseBranch={isSuperAdmin(profile.role)}
      />
    </div>
  );
}
