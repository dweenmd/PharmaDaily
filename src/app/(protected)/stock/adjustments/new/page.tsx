import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Boxes } from "lucide-react";

import { StockAdjustmentForm } from "@/features/stock/components/stock-adjustment-form";
import { getStock } from "@/features/stock/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Adjust stock",
};

const STOCK_EDITORS = ["super_admin", "branch_manager", "stock_manager"];

export default async function NewStockAdjustmentPage() {
  const profile = await getCurrentProfile();
  if (!profile || !STOCK_EDITORS.includes(profile.role)) notFound();

  // Includes zero-quantity batches: a miscount at receipt is corrected by
  // adding stock back to a batch that currently reads empty.
  const batches = await getStock({ includeEmpty: true });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/stock">
          <ArrowLeft className="size-4" />
          Back to stock
        </Link>
      </Button>

      <PageHeader
        title="Adjust stock"
        description="Correct a batch when the shelf and the system disagree. Every adjustment is recorded in the stock ledger against your name."
      />

      {batches.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No stock to adjust"
          description="Record a purchase first — there are no batches at your branch yet."
          action={
            <Button asChild>
              <Link href="/purchases/new">New Purchase</Link>
            </Button>
          }
        />
      ) : (
        <StockAdjustmentForm batches={batches} />
      )}
    </div>
  );
}
