"use client";

import * as React from "react";
import { Banknote, CreditCard, Plus, Smartphone, Trash2, UserRound } from "lucide-react";

import {
  PAYMENT_METHOD_LABELS,
  TENDER_METHODS,
  type SalePaymentInput,
} from "@/features/sales/schemas";
import { type PosCustomer } from "@/features/sales/components/customer-dialog";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

type TenderMethod = (typeof TENDER_METHODS)[number];

type Tender = { method: TenderMethod; amount: number; reference: string };

const METHOD_ICONS: Record<TenderMethod, React.ComponentType<{ className?: string }>> = {
  cash: Banknote,
  bkash: Smartphone,
  nagad: Smartphone,
  card: CreditCard,
};

/** Notes a Bangladeshi till actually holds, for one-tap exact amounts. */
const QUICK_CASH = [100, 200, 500, 1000];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  customer: PosCustomer | null;
  isPending: boolean;
  onConfirm: (payments: SalePaymentInput[]) => void;
  onNeedCustomer: () => void;
};

export function PaymentDialog({
  open,
  onOpenChange,
  total,
  customer,
  isPending,
  onConfirm,
  onNeedCustomer,
}: Props) {
  const [tenders, setTenders] = React.useState<Tender[]>([]);
  const [cashReceived, setCashReceived] = React.useState<number>(0);

  // Reset when the dialog opens, so a previous sale's split cannot leak into
  // the next one.
  //
  // Adjusted during render rather than in an effect. React re-runs this
  // component immediately with the new state before touching the DOM, so the
  // dialog never paints the stale amount — an effect would let the old figure
  // flash on screen, which at a till is the kind of thing that ends in someone
  // being charged wrong.
  const [lastOpenedFor, setLastOpenedFor] = React.useState<number | null>(null);

  if (open && lastOpenedFor !== total) {
    setLastOpenedFor(total);
    setTenders([{ method: "cash", amount: total, reference: "" }]);
    setCashReceived(0);
  }

  if (!open && lastOpenedFor !== null) {
    setLastOpenedFor(null);
  }

  const tendered = tenders.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const due = Math.max(0, total - tendered);
  const cashTender = tenders.find((t) => t.method === "cash");

  // Change is against cash handed over, not against the total: on a split
  // payment only the cash portion can produce change.
  const change =
    cashTender && cashReceived > 0
      ? Math.max(0, cashReceived - (Number(cashTender.amount) || 0))
      : 0;

  const needsCustomer = due > 0 && !customer;

  function updateTender(index: number, patch: Partial<Tender>) {
    setTenders((current) => current.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function addTender() {
    const remaining = Math.max(0, total - tendered);
    const unused = TENDER_METHODS.find((m) => !tenders.some((t) => t.method === m)) ?? "cash";
    setTenders((current) => [...current, { method: unused, amount: remaining, reference: "" }]);
  }

  function confirm() {
    const payments: SalePaymentInput[] = tenders
      .filter((t) => Number(t.amount) > 0)
      .map((t) => ({
        method: t.method,
        amount: Number(t.amount),
        reference: t.reference.trim() === "" ? null : t.reference.trim(),
      }));

    onConfirm(payments);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Take payment</DialogTitle>
          <DialogDescription>
            {formatCurrency(total)} due. Split across methods by adding another line.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {tenders.map((tender, index) => (
            <div key={index} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-medium">
                  {index === 0 ? "Payment" : `Payment ${index + 1}`}
                </span>
                {tenders.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setTenders((c) => c.filter((_, i) => i !== index))}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove this payment"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {TENDER_METHODS.map((method) => {
                  const Icon = METHOD_ICONS[method];
                  const active = tender.method === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => updateTender(index, { method })}
                      aria-pressed={active}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border p-2 text-xs font-medium transition-colors",
                        active ? "border-primary bg-primary/10" : "hover:bg-muted",
                      )}
                    >
                      <Icon className="size-4" />
                      {PAYMENT_METHOD_LABELS[method]}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor={`amount-${index}`} className="sr-only">
                    Amount
                  </Label>
                  <Input
                    id={`amount-${index}`}
                    value={tender.amount || ""}
                    onChange={(e) =>
                      updateTender(index, { amount: Math.max(0, Number(e.target.value) || 0) })
                    }
                    inputMode="decimal"
                    placeholder="0.00"
                    className="text-right tabular-nums"
                    autoFocus={index === 0}
                  />
                </div>

                {tender.method !== "cash" && (
                  <Input
                    value={tender.reference}
                    onChange={(e) => updateTender(index, { reference: e.target.value })}
                    placeholder="Trx ID"
                    className="w-32"
                    aria-label="Transaction reference"
                  />
                )}
              </div>
            </div>
          ))}

          {tenders.length < TENDER_METHODS.length && (
            <Button type="button" variant="outline" size="sm" onClick={addTender}>
              <Plus className="size-4" />
              Split payment
            </Button>
          )}

          {cashTender && (
            <div className="space-y-2 rounded-lg border p-3">
              <Label htmlFor="cash-received" className="text-xs">
                Cash received (for change)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="cash-received"
                  value={cashReceived || ""}
                  onChange={(e) => setCashReceived(Math.max(0, Number(e.target.value) || 0))}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="text-right tabular-nums"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_CASH.map((note) => (
                  <Button
                    key={note}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCashReceived((c) => c + note)}
                  >
                    +{note}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCashReceived(Number(cashTender.amount) || 0)}
                >
                  Exact
                </Button>
                {cashReceived > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCashReceived(0)}
                  >
                    Clear
                  </Button>
                )}
              </div>

              {change > 0 && (
                <p className="text-base font-semibold text-emerald-700 dark:text-emerald-500">
                  Change: {formatCurrency(change)}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5 rounded-lg border p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tendered</span>
              <span className="tabular-nums">{formatCurrency(tendered)}</span>
            </div>
            <div className="flex justify-between border-t pt-1.5 font-medium">
              <span>{due > 0 ? "Remaining (on credit)" : "Settled"}</span>
              <span className={cn("tabular-nums", due > 0 && "text-amber-700 dark:text-amber-500")}>
                {formatCurrency(due)}
              </span>
            </div>
          </div>

          {needsCustomer && (
            <Alert>
              <UserRound />
              <AlertDescription>
                Part of this sale is on credit, so it needs a named customer — there would otherwise
                be nobody to collect it from.{" "}
                <button type="button" onClick={onNeedCustomer} className="font-medium underline">
                  Choose a customer
                </button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={isPending || needsCustomer || tendered <= 0}>
            {isPending && <Spinner />}
            {due > 0 ? `Complete · ${formatCurrency(due)} on credit` : "Complete sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
