import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PackageCheck } from "lucide-react";

import { SalesReturnForm } from "@/features/sales/components/sales-return-form";
import { getSaleById } from "@/features/sales/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Process return",
};

const CAN_RETURN = ["super_admin", "branch_manager", "cashier", "pharmacist"];

export default async function SalesReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const profile = await getCurrentProfile();
  if (!profile || !CAN_RETURN.includes(profile.role)) notFound();

  const sale = await getSaleById(id);
  if (!sale) notFound();

  const items = sale.items.map((item) => ({
    id: item.id,
    batch_no: item.batch_no,
    quantity: item.quantity,
    returned_quantity: item.returned_quantity,
    unit_price: Number(item.unit_price),
    medicine_name: item.medicine?.name ?? "Unknown medicine",
    strength: item.medicine?.strength ?? null,
  }));

  const anythingLeft = items.some((i) => i.quantity - i.returned_quantity > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/sales/${sale.id}`}>
          <ArrowLeft className="size-4" />
          Back to invoice
        </Link>
      </Button>

      <PageHeader
        title="Process return"
        description={`${sale.invoice_no} · ${sale.customer?.name ?? "Walk-in customer"} · ${formatDateTime(sale.created_at)}`}
      />

      {!anythingLeft ? (
        <EmptyState
          icon={PackageCheck}
          title="Everything has been returned"
          description="Every item on this invoice has already come back. There is nothing left to refund."
          action={
            <Button asChild variant="outline">
              <Link href={`/sales/${sale.id}`}>View invoice</Link>
            </Button>
          }
        />
      ) : (
        <SalesReturnForm
          saleId={sale.id}
          invoiceNo={sale.invoice_no}
          items={items}
          saleDue={Number(sale.due_amount)}
        />
      )}
    </div>
  );
}
