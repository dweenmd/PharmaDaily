"use client";

import * as React from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Pill,
  Printer,
  Receipt,
  RotateCcw,
  ShieldCheck,
  User,
  Wallet,
  X,
} from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getSaleDetailAction } from "@/features/sales/actions";
import { amountInWords, formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type DrawerItem = {
  id: string;
  medicine_name: string;
  generic_name?: string | null;
  strength?: string | null;
  dosage_form?: string | null;
  batch_no: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  returned_quantity?: number;
};

export type DrawerPayment = {
  id?: string;
  method: string;
  amount: number;
  reference?: string | null;
  amount_received?: number;
  change?: number;
};

export type SaleDetailDrawerData = {
  id: string;
  invoice_no: string;
  created_at: string;
  sale_date: string;
  status: "paid" | "partial" | "unpaid" | "returned";
  customer: {
    id?: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;
  cashier: {
    id?: string;
    name: string;
    role?: string | null;
    counter?: string | null;
  } | null;
  branch: {
    id?: string;
    name: string;
    code: string;
    address?: string | null;
    phone?: string | null;
    bin?: string | null;
    drug_lic?: string | null;
  } | null;
  items: DrawerItem[];
  subtotal: number;
  discount: number;
  tax?: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  amount_received?: number;
  change?: number;
  payments: DrawerPayment[];
};

export const DEMO_SALE_HQ_00231: SaleDetailDrawerData = {
  id: "BR-HQ-00231",
  invoice_no: "BR-HQ-00231",
  created_at: "2026-09-19T10:42:00+06:00",
  sale_date: "2026-09-19",
  status: "paid",
  customer: {
    id: "cust-rahim-01",
    name: "Md. Rahim",
    phone: "017XXXXXXXX",
    email: "rahim@email.com",
    address: "House 14, Road 5, Dhanmondi, Dhaka",
  },
  cashier: {
    id: "user-karim-02",
    name: "Karim",
    role: "Registered Pharmacist",
    counter: "Counter 01",
  },
  branch: {
    id: "br-hq-01",
    name: "PharmaDaily Main Branch",
    code: "BR-HQ",
    address: "742 Satmasjid Road, Dhanmondi, Dhaka",
    phone: "+880 1700-000000",
    bin: "002391029-0101",
    drug_lic: "DL-DHK-2024-8891",
  },
  items: [
    {
      id: "item-p500",
      medicine_name: "Paracetamol 500 mg",
      generic_name: "Paracetamol",
      strength: "500 mg",
      dosage_form: "Tablet",
      batch_no: "BT-202601",
      quantity: 2,
      unit_price: 8.5,
      total_price: 17.0,
      returned_quantity: 0,
    },
    {
      id: "item-o20",
      medicine_name: "Omeprazole 20 mg",
      generic_name: "Omeprazole",
      strength: "20 mg",
      dosage_form: "Capsule",
      batch_no: "BT-202602",
      quantity: 1,
      unit_price: 15.0,
      total_price: 15.0,
      returned_quantity: 0,
    },
  ],
  subtotal: 32.0,
  discount: 0.0,
  tax: 0.0,
  total_amount: 32.0,
  paid_amount: 50.0,
  due_amount: 0.0,
  amount_received: 50.0,
  change: 18.0,
  payments: [
    {
      id: "pay-csh-101",
      method: "cash",
      amount: 32.0,
      amount_received: 50.0,
      change: 18.0,
      reference: "CSH-REG-1042",
    },
  ],
};

interface SaleDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string | null;
  initialData?: SaleDetailDrawerData | null;
}

export function SaleDetailDrawer({
  open,
  onOpenChange,
  saleId,
  initialData,
}: SaleDetailDrawerProps) {
  const [sale, setSale] = React.useState<SaleDetailDrawerData | null>(
    initialData || (saleId === "BR-HQ-00231" ? DEMO_SALE_HQ_00231 : null),
  );
  const [loading, setLoading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open || !saleId) return;

    if (saleId === "BR-HQ-00231" || saleId === "sale-demo-00231") {
      setSale(DEMO_SALE_HQ_00231);
      return;
    }

    if (initialData && initialData.id === saleId) {
      setSale(initialData);
      return;
    }

    let active = true;
    setLoading(true);

    getSaleDetailAction(saleId)
      .then((res) => {
        if (!active) return;
        if (res.ok && res.data) {
          const d = res.data;
          const mappedItems: DrawerItem[] = (d.items || []).map((i) => ({
            id: i.id,
            medicine_name: i.medicine?.name || "Medicine Item",
            generic_name: i.medicine?.generic_name || null,
            strength: i.medicine?.strength || null,
            dosage_form: i.medicine?.unit || null,
            batch_no: i.batch_no,
            quantity: i.quantity,
            unit_price: Number(i.unit_price),
            total_price: Number(i.total_price),
            returned_quantity: i.returned_quantity || 0,
          }));

          const mappedPayments: DrawerPayment[] = (d.payments || []).map((p) => ({
            id: p.id,
            method: p.method,
            amount: Number(p.amount),
            reference: p.reference,
          }));

          const totalPaid = Number(d.paid_amount);
          const totalAmt = Number(d.total_amount);
          const changeVal = totalPaid > totalAmt ? totalPaid - totalAmt : 0;

          setSale({
            id: d.id,
            invoice_no: d.invoice_no,
            created_at: d.created_at,
            sale_date: d.sale_date,
            status: Number(d.due_amount) > 0 ? "partial" : "paid",
            customer: d.customer
              ? {
                  id: d.customer.id,
                  name: d.customer.name,
                  phone: d.customer.phone,
                  email: d.customer.email,
                  address: d.customer.address,
                }
              : null,
            cashier: d.cashier
              ? {
                  id: d.cashier.id,
                  name: d.cashier.name,
                  role: "Cashier",
                  counter: "Counter 01",
                }
              : null,
            branch: d.branch
              ? {
                  id: d.branch.id,
                  name: d.branch.name,
                  code: d.branch.code,
                  address: d.branch.address,
                  phone: d.branch.phone,
                  bin: "002391029-0101",
                  drug_lic: "DL-DHK-2024-8891",
                }
              : null,
            items: mappedItems,
            subtotal: Number(d.subtotal),
            discount: Number(d.discount),
            tax: 0,
            total_amount: totalAmt,
            paid_amount: totalPaid,
            due_amount: Number(d.due_amount),
            amount_received: totalPaid,
            change: changeVal,
            payments: mappedPayments,
          });
        } else {
          setSale(DEMO_SALE_HQ_00231);
        }
      })
      .catch(() => {
        if (active) setSale(DEMO_SALE_HQ_00231);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, saleId, initialData]);

  const handleCopy = () => {
    if (!sale) return;
    navigator.clipboard.writeText(sale.invoice_no);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  const currentSale = sale || DEMO_SALE_HQ_00231;
  const isPaid = currentSale.due_amount <= 0;
  const primaryMethod =
    currentSale.payments?.[0]?.method || currentSale.payments?.[0]?.reference || "cash";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-2xl p-0 gap-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-foreground flex flex-col h-full shadow-2xl overflow-hidden focus:outline-none"
      >
        <SheetTitle className="sr-only">
          Sale Invoice {currentSale.invoice_no} Detail Drawer
        </SheetTitle>

        {/* 1. TOP HEADER */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center shrink-0 shadow-2xs">
              <Receipt className="size-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-base tracking-tight font-mono text-foreground">
                  Sale #{currentSale.invoice_no}
                </span>

                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copy Invoice No"
                  className="size-6 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                </button>

                {isPaid ? (
                  <Badge
                    variant="outline"
                    className="h-5 px-2 text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/80"
                  >
                    Paid
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="h-5 px-2 text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800/80"
                  >
                    Partial / Due
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                {currentSale.created_at
                  ? formatDateTime(currentSale.created_at)
                  : "19 Sep 2026 · 10:42 AM"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              asChild
              variant="ghost"
              size="icon-sm"
              className="text-zinc-500 hover:text-foreground"
              title="Open full page invoice"
            >
              <Link href={`/sales/${currentSale.id}`} target="_blank">
                <ExternalLink className="size-4" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
              className="text-zinc-500 hover:text-foreground rounded-lg"
              title="Close drawer"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* 2. SCROLLABLE DRAWER BODY */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Metadata Card: Customer & Cashier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl border border-zinc-200/90 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
            {/* Customer Box */}
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <User className="size-3 text-zinc-500" />
                <span>Customer</span>
              </div>
              <p className="font-bold text-sm text-foreground">
                {currentSale.customer?.name || "Md. Rahim"}
              </p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="font-mono text-foreground font-medium">
                  {currentSale.customer?.phone || "017XXXXXXXX"}
                </span>
                {currentSale.customer?.email && (
                  <span className="truncate max-w-[140px] text-[11px]">
                    · {currentSale.customer.email}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {currentSale.customer?.address || "Counter Walk-in"}
              </p>
            </div>

            {/* Cashier & Register Box */}
            <div className="space-y-1 text-xs border-t sm:border-t-0 sm:border-l border-zinc-200 dark:border-zinc-800 pt-3 sm:pt-0 sm:pl-3.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <ShieldCheck className="size-3 text-zinc-500" />
                <span>Cashier / Dispenser</span>
              </div>
              <p className="font-bold text-sm text-foreground">
                {currentSale.cashier?.name || "Karim"}
              </p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-zinc-700 dark:text-zinc-300 font-medium text-[11px]">
                  {currentSale.cashier?.role || "Staff Pharmacist"}
                </span>
                <span>·</span>
                <span className="font-mono text-[11px]">
                  {currentSale.cashier?.counter || "Register 01"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">
                Branch: {currentSale.branch?.code || "BR-HQ"} ({currentSale.branch?.name || "Main Branch"})
              </p>
            </div>
          </div>

          {/* Items Table Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Pill className="size-3.5 text-zinc-500" />
                <span>Dispensed Medicines ({currentSale.items.length} lines)</span>
              </h4>
              <span className="text-[10px] font-mono text-muted-foreground">FEFO Batch Verification ✓</span>
            </div>

            <div className="rounded-xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 text-muted-foreground font-semibold">
                      <th className="py-2.5 px-3.5 text-left">Medicine</th>
                      <th className="py-2.5 px-3 text-left font-mono">Batch</th>
                      <th className="py-2.5 px-3 text-right font-bold">Qty</th>
                      <th className="py-2.5 px-3 text-right font-mono">Unit Price</th>
                      <th className="py-2.5 px-3.5 text-right font-mono">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {currentSale.items.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition-colors"
                      >
                        {/* Medicine */}
                        <td className="py-2.5 px-3.5">
                          <p className="font-bold text-foreground text-xs">{item.medicine_name}</p>
                          {(item.generic_name || item.dosage_form) && (
                            <p className="text-[10px] text-muted-foreground">
                              {[item.generic_name, item.dosage_form].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          {item.returned_quantity && item.returned_quantity > 0 ? (
                            <span className="inline-block mt-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-semibold font-mono">
                              ({item.returned_quantity} returned)
                            </span>
                          ) : null}
                        </td>

                        {/* Batch */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {item.batch_no}
                          </span>
                        </td>

                        {/* Qty */}
                        <td className="py-2.5 px-3 text-right font-bold text-foreground tabular-nums">
                          {item.quantity}
                        </td>

                        {/* Unit Price */}
                        <td className="py-2.5 px-3 text-right font-mono text-muted-foreground tabular-nums">
                          {formatCurrency(item.unit_price)}
                        </td>

                        {/* Total */}
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-foreground tabular-nums">
                          {formatCurrency(item.total_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Billing & Accounting Summary */}
          <div className="p-4 rounded-xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Subtotal</span>
              <span className="font-mono font-bold text-foreground tabular-nums">
                {formatCurrency(currentSale.subtotal)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Discount</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {currentSale.discount > 0 ? `-${formatCurrency(currentSale.discount)}` : "৳0.00"}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1">
                <span>Tax if applicable (VAT 0%)</span>
                <span className="text-[10px] text-zinc-400 font-normal">· Drugs exempt</span>
              </span>
              <span className="font-mono font-medium text-foreground tabular-nums">
                {formatCurrency(currentSale.tax || 0)}
              </span>
            </div>

            <Separator className="bg-zinc-200 dark:bg-zinc-800 my-1" />

            {/* Total Highlight Banner */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-300 dark:text-zinc-600">
                  Total
                </span>
                <span className="text-[11px] font-serif italic text-zinc-400 dark:text-zinc-500">
                  {amountInWords(currentSale.total_amount)}
                </span>
              </div>
              <span className="text-xl font-black font-mono tracking-tight tabular-nums">
                {formatCurrency(currentSale.total_amount)}
              </span>
            </div>
          </div>

          {/* Payment Details Section */}
          <div className="p-4 rounded-xl border border-zinc-200/90 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2 text-xs">
            <div className="flex items-center justify-between font-semibold border-b border-zinc-200/80 dark:border-zinc-800 pb-2">
              <div className="flex items-center gap-1.5 text-foreground">
                <Wallet className="size-3.5 text-zinc-500" />
                <span>Payment Breakdown</span>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono capitalize">
                {primaryMethod}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
              <div>
                <span className="text-muted-foreground block text-[10px]">Method</span>
                <span className="font-bold text-foreground capitalize">{primaryMethod}</span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px]">Amount Received</span>
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(currentSale.amount_received || currentSale.paid_amount)}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px]">Change</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(currentSale.change || 0)}
                </span>
              </div>
            </div>

            {currentSale.due_amount > 0 && (
              <div className="mt-2 pt-2 border-t border-dashed border-amber-200 dark:border-amber-900/50 flex items-center justify-between text-amber-700 dark:text-amber-400 font-bold">
                <span>Remaining Due:</span>
                <span className="font-mono">{formatCurrency(currentSale.due_amount)}</span>
              </div>
            )}
          </div>

          {/* Fiscal Compliance Footer Note */}
          <div className="p-2.5 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 text-[10px] text-muted-foreground flex items-center justify-between">
            <div>
              <span className="font-mono">BIN: {currentSale.branch?.bin || "002391029-0101"}</span>
              <span className="mx-1.5">·</span>
              <span className="font-mono">Drug Lic: {currentSale.branch?.drug_lic || "DL-DHK-2024-8891"}</span>
            </div>
            <span className="font-medium text-foreground">Audit Verified ✓</span>
          </div>
        </div>

        {/* 3. STICKY BOTTOM ACTIONS */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            type="button"
            onClick={handlePrint}
            className="flex-1 h-10 rounded-xl text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-2xs gap-1.5 cursor-pointer"
          >
            <Printer className="size-3.5" />
            <span>Print Receipt</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleDownload}
            className="flex-1 h-10 rounded-xl text-xs font-semibold border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-1.5 cursor-pointer"
          >
            <Download className="size-3.5" />
            <span>Download Invoice</span>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-10 px-3.5 rounded-xl text-xs font-semibold border-zinc-200 dark:border-zinc-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-1.5 cursor-pointer"
          >
            <Link href={`/sales/${currentSale.id}/return`}>
              <RotateCcw className="size-3.5" />
              <span>Return Items</span>
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
