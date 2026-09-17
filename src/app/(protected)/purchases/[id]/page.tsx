import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getPurchaseById } from "@/features/purchases/queries";
import { expiryStatus, formatCurrency, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Purchase",
};

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // RLS decides visibility: a purchase belonging to another branch simply does
  // not come back, and is indistinguishable from one that does not exist.
  const purchase = await getPurchaseById(id);
  if (!purchase) notFound();

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/purchases">
          <ArrowLeft className="size-4" />
          Back to purchases
        </Link>
      </Button>

      <PageHeader
        title={purchase.invoice_no}
        description={`${purchase.supplier?.name ?? "Unknown supplier"} · ${formatDate(purchase.purchase_date)}`}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatCurrency(purchase.total_amount)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatCurrency(purchase.paid_amount)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding</CardDescription>
            <CardTitle
              className={`text-2xl tabular-nums ${Number(purchase.due_amount) > 0 ? "text-amber-700 dark:text-amber-500" : ""}`}
            >
              {formatCurrency(purchase.due_amount)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="overflow-hidden pb-0">
        <CardHeader>
          <CardTitle className="text-base">Items received</CardTitle>
          <CardDescription>
            Each line created or topped up a batch and wrote an entry to the stock ledger.
          </CardDescription>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Selling</TableHead>
                <TableHead className="hidden text-right sm:table-cell">MRP</TableHead>
                <TableHead className="text-right">Line total</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {purchase.items.map((item) => {
                const status = expiryStatus(item.expiry_date);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {[item.medicine?.name, item.medicine?.strength].filter(Boolean).join(" ")}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.batch_no}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-sm">
                        {formatDate(item.expiry_date)}
                        {status === "expired" && <Badge variant="destructive">Expired</Badge>}
                        {status === "critical" && <Badge variant="secondary">Expiring</Badge>}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(item.cost_price)}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {formatCurrency(item.selling_price)}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {formatCurrency(item.mrp)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(Number(item.quantity) * Number(item.cost_price))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {purchase.notes && (
          <CardContent className="border-t pt-4">
            <p className="text-muted-foreground text-sm">{purchase.notes}</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
