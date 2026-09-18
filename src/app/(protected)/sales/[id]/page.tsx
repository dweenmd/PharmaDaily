import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, RotateCcw } from "lucide-react";

import { InvoiceActions } from "@/features/sales/components/invoice-actions";
import { ReceiptPrintStyle } from "@/features/sales/components/receipt-print-style";
import { getSaleById } from "@/features/sales/queries";
import { getReceiptPaperSize } from "@/features/settings/queries";
import { PAYMENT_METHOD_LABELS } from "@/features/sales/schemas";
import { amountInWords, formatCurrency, formatDateTime } from "@/lib/format";
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

  const sale = await getSaleById(id);
  if (!sale) notFound();

  const paperSize = await getReceiptPaperSize(sale.branch_id);
  const isThermal = paperSize !== "a4";

  const returnable = sale.items.some((i) => i.quantity - i.returned_quantity > 0);
  const anyReturned = sale.items.some((i) => i.returned_quantity > 0);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <ReceiptPrintStyle paperSize={paperSize} />

      <div className="flex items-center justify-between gap-2 print:hidden">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-xs">
          <Link href="/sales">
            <ArrowLeft className="size-4 mr-1" />
            All Sales
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          {returnable && (
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href={`/sales/${sale.id}/return`}>
                <RotateCcw className="size-3.5 mr-1" />
                Process Return
              </Link>
            </Button>
          )}
          <InvoiceActions isNewSale={isNewSale} />
        </div>
      </div>

      {isNewSale && (
        <Alert className="print:hidden border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <AlertDescription className="font-medium text-xs">
            Sale completed successfully. Inventory stock deducted and ledger updated.
          </AlertDescription>
        </Alert>
      )}

      {/* Professional Pharmacy Invoice Card */}
      <Card
        className={cn(
          "border border-border/80 shadow-md rounded-2xl bg-card overflow-hidden print:border-0 print:shadow-none print:m-0 print:p-0",
          isThermal && "print:mx-auto print:text-[11px]",
          paperSize === "58mm" && "print:w-[58mm]",
          paperSize === "80mm" && "print:w-[80mm]",
        )}
      >
        <CardContent className={cn("p-6 space-y-4", isThermal && "print:space-y-2.5 print:p-2.5")}>
          {/* Pharmacy Brand Header */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white tracking-wider uppercase">
                Rx
              </span>
              <h1 className="text-xl font-bold tracking-tight text-foreground uppercase">
                {sale.branch?.name ?? "PharmaDaily"}
              </h1>
            </div>
            {sale.branch?.address && (
              <p className="text-xs text-muted-foreground">{sale.branch.address}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Hotline: {sale.branch?.phone ?? "+880 1700-000000"} · Emergency Support 24/7
            </p>
            <p className="text-[10px] text-muted-foreground font-mono">
              Govt Reg / Drug Lic: DL-DHK-2024-8891 · BIN: 002391029-0101
            </p>
            <div className="pt-1.5 pb-1">
              <span className="inline-block border-y border-dashed border-border px-4 py-0.5 text-xs font-bold tracking-wider text-primary uppercase">
                CASH MEMO / SALES INVOICE (বিক্রয় রশিদ)
              </span>
            </div>
          </div>

          {/* Invoice Metadata & Customer Box */}
          <div className="grid grid-cols-2 gap-3 text-xs border rounded-xl p-3 bg-muted/20 print:border print:p-2">
            <div className="space-y-1">
              <div>
                <span className="text-muted-foreground">Invoice No: </span>
                <span className="font-mono font-bold text-foreground text-sm">{sale.invoice_no}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Date & Time: </span>
                <span className="font-medium text-foreground">{formatDateTime(sale.created_at)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Dispensed By: </span>
                <span className="font-semibold text-foreground">{sale.cashier?.name ?? "Pharmacist"}</span>
              </div>
            </div>

            <div className="space-y-1 sm:text-right">
              <div>
                <span className="text-muted-foreground">Customer: </span>
                <span className="font-bold text-foreground">{sale.customer?.name ?? "Walk-in Customer"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Contact: </span>
                <span className="font-medium text-foreground">{sale.customer?.phone ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status: </span>
                <span className={cn("font-bold", Number(sale.due_amount) > 0 ? "text-amber-600" : "text-emerald-600")}>
                  {Number(sale.due_amount) > 0 ? "PARTIAL / DUE" : "PAID IN FULL (পরিশোধিত)"}
                </span>
              </div>
            </div>
          </div>

          {/* Itemized Medicine Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                  <th className="w-7 py-2 px-1 text-left font-semibold">#</th>
                  <th className="py-2 px-1.5 text-left font-semibold">Medicine Description</th>
                  <th className="py-2 px-1 text-left font-semibold hidden sm:table-cell">Batch</th>
                  <th className="py-2 px-1 text-right font-semibold">Qty</th>
                  <th className="py-2 px-1 text-right font-semibold">MRP</th>
                  <th className="py-2 px-1.5 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {sale.items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-muted/20">
                    <td className="py-2 px-1 text-muted-foreground tabular-nums">{index + 1}</td>
                    <td className="py-2 px-1.5">
                      <span className="font-semibold text-foreground">
                        {[
                          item.medicine?.name,
                          item.medicine?.strength,
                          item.medicine?.unit ? `(${item.medicine.unit})` : null,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {item.medicine?.generic_name ? `${item.medicine.generic_name} · ` : ""}
                        Batch: {item.batch_no}
                        {item.returned_quantity > 0 && (
                          <span className="ml-1 text-amber-600 font-semibold">
                            ({item.returned_quantity} returned)
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 px-1 text-muted-foreground hidden sm:table-cell font-mono text-[11px]">
                      {item.batch_no}
                    </td>
                    <td className="py-2 px-1 text-right font-bold tabular-nums text-foreground">{item.quantity}</td>
                    <td className="py-2 px-1 text-right tabular-nums text-muted-foreground">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="py-2 px-1.5 text-right font-bold tabular-nums text-foreground">
                      {formatCurrency(item.total_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Summary */}
          <div className="border-t pt-3 space-y-1 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal (মোট মূল্য)</span>
              <span className="tabular-nums font-semibold text-foreground">{formatCurrency(sale.subtotal)}</span>
            </div>

            {Number(sale.discount) > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Special Discount (ছাড়)</span>
                <span className="tabular-nums font-semibold">-{formatCurrency(sale.discount)}</span>
              </div>
            )}

            {/* Total Banner */}
            <div className="flex justify-between items-center bg-slate-900 text-white dark:bg-emerald-950 dark:border dark:border-emerald-800/80 p-2.5 rounded-lg my-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 dark:text-emerald-300">
                Net Payable (সর্বমোট দেয়)
              </span>
              <span className="text-lg font-black tabular-nums tracking-tight text-white dark:text-emerald-100">
                {formatCurrency(sale.total_amount)}
              </span>
            </div>

            <div className="flex justify-between text-muted-foreground pt-1">
              <span>Paid Amount (পরিশোধিত)</span>
              <span className="tabular-nums font-semibold text-foreground">{formatCurrency(sale.paid_amount)}</span>
            </div>

            {Number(sale.paid_amount) > Number(sale.total_amount) && (
              <div className="flex justify-between font-bold text-emerald-600">
                <span>Change Returned (ফেরত)</span>
                <span className="tabular-nums">
                  {formatCurrency(Number(sale.paid_amount) - Number(sale.total_amount))}
                </span>
              </div>
            )}

            {Number(sale.due_amount) > 0 && (
              <div className="flex justify-between font-bold text-amber-600">
                <span>Total Due (চলতি বকেয়া)</span>
                <span className="tabular-nums">{formatCurrency(sale.due_amount)}</span>
              </div>
            )}
          </div>

          {/* In-Words Display */}
          <div className="bg-muted/30 border border-dashed rounded-lg p-2 text-xs">
            <span className="text-muted-foreground font-medium">In Words: </span>
            <span className="font-semibold text-foreground italic">
              {amountInWords(Number(sale.total_amount))}
            </span>
          </div>

          {/* Payment Method Badges */}
          {sale.payments.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs text-muted-foreground">Paid via:</span>
              {sale.payments.map((payment) => (
                <Badge key={payment.id} variant="secondary" className="text-[11px] font-medium">
                  {PAYMENT_METHOD_LABELS[payment.method]} {formatCurrency(payment.amount)}
                  {payment.reference && (
                    <span className="text-muted-foreground ml-1 font-mono">({payment.reference})</span>
                  )}
                </Badge>
              ))}
            </div>
          )}

          {/* Signatures */}
          <div className="pt-6 pb-2 flex items-end justify-between text-xs text-muted-foreground">
            <div className="text-center border-t border-dashed w-32 pt-1">
              <p className="font-semibold text-foreground text-xs">{sale.cashier?.name ?? "Sales Desk"}</p>
              <p className="text-[10px]">Prepared By</p>
            </div>
            <div className="text-center border-t border-dashed w-36 pt-1">
              <p className="font-semibold text-foreground text-xs">Registered Pharmacist</p>
              <p className="text-[10px]">Authorized Signature</p>
            </div>
          </div>

          {/* Bilingual Return / Exchange Policy Notice */}
          <div className="border-t border-dashed pt-3 text-center space-y-1 text-xs text-muted-foreground print:text-[10px]">
            <p className="font-bold text-foreground">ধন্যবাদ! দ্রুত আরোগ্য ও সুস্বাস্থ্য কামনা করি।</p>
            <p>১. বিক্রিত ঔষধ ৩ দিনের মধ্যে ক্যাশ মেমোসহ পরিবর্তনযোগ্য (রিফান্ড প্রযোজ্য নয়)।</p>
            <p>২. ইনসুলিন, ভ্যাকসিন, ড্রপ, ইনজেকশন ও কাটা স্ট্রিপের ঔষধ ফেরত/পরিবর্তন হয় না।</p>
            <p className="text-[10px] text-muted-foreground/80 font-medium">
              Note: No Cash Refund. Goods once sold can only be exchanged within 3 days with this invoice.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
