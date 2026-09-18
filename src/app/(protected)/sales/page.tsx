import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { SalesListView } from "@/features/sales/components/sales-list-view";
import { getSales } from "@/features/sales/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sales",
};

const CAN_SELL = ["super_admin", "branch_manager", "cashier", "pharmacist"];

export default async function SalesPage() {
  const [profile, sales] = await Promise.all([getCurrentProfile(), getSales()]);

  const showBranch = profile ? isSuperAdmin(profile.role) : false;
  const canSell = profile ? CAN_SELL.includes(profile.role) && profile.branch_id !== null : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        description={showBranch ? "Every branch transactions and invoices." : "Your branch sales register."}
        action={
          canSell ? (
            <Button asChild className="h-9 px-3.5 rounded-xl font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs">
              <Link href="/pos">
                <ShoppingCart className="size-4 mr-1.5" />
                Open POS (F2)
              </Link>
            </Button>
          ) : undefined
        }
      />

      <SalesListView
        initialSales={sales}
        showBranch={showBranch}
        canSell={canSell}
      />
    </div>
  );
}
