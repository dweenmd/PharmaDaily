import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, RotateCcw } from "lucide-react";

import { InvoiceActions } from "@/features/sales/components/invoice-actions";
import { ReceiptPrintStyle } from "@/features/sales/components/receipt-print-style";
import { getSaleById } from "@/features/sales/queries";
import { getReceiptPaperSize } from "@/features/settings/queries";
import { PAYMENT_METHOD_LABELS } from "@/features/sales/schemas";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Invoice",
};

export default async function SaleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const isNewSale = query.new === "1";

  // RLS decides visibility: a sale belonging to another branch simply does not
  // come back, and is indistinguishable from one that does not exist.
  const sale = await getSaleById(id);
  if (!sale) notFound();

  const paperSize = await getReceiptPaperSize(sale.branch_id);
  const isThermal = paperSize !== "a4";

  const returnable = sale.items.some((i) => i.quantity - i.returned_quantity > 0);
  const anyReturned = sale.items.some((i) => i.returned_quantity > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <ReceiptPrintStyle paperSize={paperSize} />

      <div className="flex items-center justify-between gap-2 print:hidden">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/sales">
            <ArrowLeft className="size-4" />
            All sales
          </Link>
        </Button>

        {returnable && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/sales/${sale.id}/return`}>
              <RotateCcw className="size-4" />
              Process return
            </Link>
          </Button>
        )}
      </div>

      {isNewSale && (
        <Alert className="print:hidden">
          <CheckCircle2 />
          <AlertDescription>
            Sale completed. Stock has been deducted and the ledger updated.
          </AlertDescription>
        </Alert>
      )}

      {/*
        The invoice itself. Everything outside this card is hidden when
        printed. On a 58/80mm till printer, `print:w-[Xmm]` matches the card
        to the roll (paired with the @page size in ReceiptPrintStyle) and the
        rest of the print: classes below compact the layout to fit it — a
        card sized for a phone screen, not shrunk from a desktop one.
      */}
      <Card
        className={cn(
          "print:border-0 print:shadow-none",
          // Tailwind's compiler scans source text for literal class names —
          // it cannot see a class assembled from a runtime variable like
          // `` `print:w-[${paperSize}]` ``, so every width this could ever be
          // has to appear here spelled out, not interpolated.
          isThermal && "print:mx-auto print:text-[10px]",
          paperSize === "58mm" && "print:w-[58mm]",
          paperSize === "80mm" && "print:w-[80mm]",
        )}
      >
        <CardContent className={cn("space-y-5 pt-6", isThermal && "print:space-y-2 print:p-2")}>
          <div
            className={cn(
              "flex items-start justify-between gap-4",
              isThermal && "print:flex-col print:items-center print:text-center",
            )}
          >
            <div>
              <h1
                className={cn(
                  "text-lg font-semibold",
                  isThermal && "print:text-sm print:uppercase",
                )}
              >
                {sale.branch?.name ?? "PharmaDaily"}
              </h1>
              {sale.branch?.address && (
                <p className="text-muted-foreground text-xs">{sale.branch.address}</p>
              )}
              {sale.branch?.phone && (
                <p className="text-muted-foreground text-xs">{sale.branch.phone}</p>
              )}
            </div>

            <div className={cn("text-right", isThermal && "print:text-center")}>
              <p className="font-mono text-sm font-semibold">{sale.invoice_no}</p>
              <p className="text-muted-foreground text-xs">{formatDateTime(sale.created_at)}</p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-xs">Customer</p>
              <p className="font-medium">{sale.customer?.name ?? "Walk-in customer"}</p>
              {(sale.customer?.phone || sale.customer?.email) && (
                <p className="text-muted-foreground text-xs">
                  {[sale.customer?.phone, sale.customer?.email].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <div className="sm:text-right">
              <p className="text-muted-foreground text-xs">Served by</p>
              <p className="font-medium">{sale.cashier?.name ?? "—"}</p>
            </div>
          </div>

          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs">
                  <th className="pb-2 font-medium print:pb-1">Item</th>
                  <th className="pb-2 text-right font-medium print:pb-1">Qty</th>
                  <th className="pb-2 text-right font-medium print:pb-1">Price</th>
                  <th className="pb-2 text-right font-medium print:pb-1">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2 print:py-1">
                      <span className="font-medium">
                        {[item.medicine?.name, item.medicine?.strength].filter(Boolean).join(" ")}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        Batch {item.batch_no}
                        {item.returned_quantity > 0 && (
                          <span className="ml-1 text-amber-600 dark:text-amber-500">
                            · {item.returned_quantity} returned
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums print:py-1">{item.quantity}</td>
                    <td className="py-2 text-right tabular-nums print:py-1">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="py-2 text-right tabular-nums print:py-1">
                      {formatCurrency(item.total_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatCurrency(sale.subtotal)}</span>
            </div>
            {Number(sale.discount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="tabular-nums">-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1.5 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(sale.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span className="tabular-nums">{formatCurrency(sale.paid_amount)}</span>
            </div>
            {Number(sale.due_amount) > 0 && (
              <div className="flex justify-between font-medium text-amber-700 dark:text-amber-500">
                <span>Due</span>
                <span className="tabular-nums">{formatCurrency(sale.due_amount)}</span>
              </div>
            )}
          </div>

          {sale.payments.length > 0 && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-2">
                {sale.payments.map((payment) => (
                  <Badge key={payment.id} variant="secondary" className="font-normal">
                    {PAYMENT_METHOD_LABELS[payment.method]} {formatCurrency(payment.amount)}
                    {payment.reference && (
                      <span className="text-muted-foreground ml-1">· {payment.reference}</span>
                    )}
                  </Badge>
                ))}
              </div>
            </>
          )}

          {anyReturned && (
            <p className="text-muted-foreground text-xs">
              This invoice has been partly returned. The amounts above are as originally sold.
            </p>
          )}

          <p className="text-muted-foreground border-t pt-3 text-center text-xs">
            Thank you. Please keep this invoice for any return or exchange.
          </p>
        </CardContent>
      </Card>

      <InvoiceActions isNewSale={isNewSale} />
    </div>
  );
}
