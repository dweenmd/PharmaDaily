"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { createSalesReturnAction } from "@/features/sales/actions";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  RETURN_REASONS,
  type SalesReturnInput,
} from "@/features/sales/schemas";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

export type ReturnableItem = {
  id: string;
  batch_no: string;
  quantity: number;
  returned_quantity: number;
  unit_price: number;
  medicine_name: string;
  strength: string | null;
};

type Props = {
  saleId: string;
  invoiceNo: string;
  items: ReturnableItem[];
  /** Credit still outstanding on the original sale. */
  saleDue: number;
};

type Selection = { checked: boolean; quantity: number };

export function SalesReturnForm({ saleId, invoiceNo, items, saleDue }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);

  const [selection, setSelection] = React.useState<Record<string, Selection>>(() =>
    Object.fromEntries(items.map((i) => [i.id, { checked: false, quantity: 1 }])),
  );

  const [reason, setReason] = React.useState<(typeof RETURN_REASONS)[number]>(RETURN_REASONS[0]);
  const [reasonDetail, setReasonDetail] = React.useState("");
  const [refundMethod, setRefundMethod] = React.useState<(typeof PAYMENT_METHODS)[number]>("cash");

  const chosen = items
    .map((item) => ({ item, state: selection[item.id]! }))
    .filter(({ state }) => state.checked && state.quantity > 0);

  const refund = chosen.reduce((sum, { item, state }) => sum + item.unit_price * state.quantity, 0);

  // Where the original sale was partly on credit, the refund settles that debt
  // before any cash leaves the till — it would be wrong to hand money over
  // while the customer still owes for the item they just brought back.
  const clearsDebt = Math.min(refund, saleDue);
  const cashBack = Math.max(0, refund - clearsDebt);

  function toggle(itemId: string, checked: boolean) {
    setSelection((current) => ({
      ...current,
      [itemId]: { ...current[itemId]!, checked },
    }));
  }

  function setQuantity(itemId: string, quantity: number, max: number) {
    setSelection((current) => ({
      ...current,
      [itemId]: {
        ...current[itemId]!,
        quantity: Math.max(1, Math.min(quantity, max)),
      },
    }));
  }

  function submit() {
    setFormError(null);

    if (chosen.length === 0) {
      setFormError("Select at least one item to return.");
      return;
    }

    if (reason === "Other" && reasonDetail.trim() === "") {
      setFormError("Explain the reason for this return.");
      return;
    }

    const input: SalesReturnInput = {
      sale_id: saleId,
      reason,
      reason_detail: reasonDetail.trim() === "" ? null : reasonDetail.trim(),
      refund_method: refundMethod,
      items: chosen.map(({ item, state }) => ({
        sale_item_id: item.id,
        quantity: state.quantity,
      })),
    };

    startTransition(async () => {
      const result = await createSalesReturnAction(input);

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      toast.success("Return processed", { description: "Stock has been put back on the shelf." });
      router.push(`/sales/${saleId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {formError && (
        <Alert variant="destructive" role="alert">
          <AlertCircle />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items from {invoiceNo}</CardTitle>
          <CardDescription>
            Only what has not already been returned can be selected.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2">
          {items.map((item) => {
            const remaining = item.quantity - item.returned_quantity;
            const state = selection[item.id]!;
            const disabled = remaining <= 0;

            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3",
                  disabled && "opacity-50",
                  state.checked && !disabled && "border-primary/50 bg-primary/5",
                )}
              >
                <Checkbox
                  id={`item-${item.id}`}
                  checked={state.checked}
                  onCheckedChange={(v) => toggle(item.id, v === true)}
                  disabled={disabled || isPending}
                  className="mt-0.5"
                />

                <div className="min-w-0 flex-1">
                  <Label htmlFor={`item-${item.id}`} className="cursor-pointer font-medium">
                    {[item.medicine_name, item.strength].filter(Boolean).join(" ")}
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Batch {item.batch_no} · {formatCurrency(item.unit_price)} each · sold{" "}
                    {item.quantity}
                    {item.returned_quantity > 0 && `, ${item.returned_quantity} already returned`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {state.checked && !disabled && (
                    <>
                      <Input
                        value={state.quantity}
                        onChange={(e) =>
                          setQuantity(item.id, Number.parseInt(e.target.value, 10) || 1, remaining)
                        }
                        inputMode="numeric"
                        className="h-8 w-16 text-center tabular-nums"
                        aria-label={`Quantity to return of ${item.medicine_name}`}
                        disabled={isPending}
                      />
                      <span className="text-muted-foreground text-xs">of {remaining}</span>
                    </>
                  )}
                  {disabled && (
                    <span className="text-muted-foreground text-xs">Fully returned</span>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reason and refund</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="return-reason">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Select
                value={reason}
                onValueChange={(v) => setReason(v as (typeof RETURN_REASONS)[number])}
                disabled={isPending}
              >
                <SelectTrigger id="return-reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-method">
                Refund method <span className="text-destructive">*</span>
              </Label>
              <Select
                value={refundMethod}
                onValueChange={(v) => setRefundMethod(v as (typeof PAYMENT_METHODS)[number])}
                disabled={isPending}
              >
                <SelectTrigger id="refund-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                      {m === "due" && " (adjust balance)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason-detail">
              Details {reason === "Other" && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="reason-detail"
              value={reasonDetail}
              onChange={(e) => setReasonDetail(e.target.value)}
              placeholder={reason === "Other" ? "Required" : "Optional"}
              disabled={isPending}
            />
            <p className="text-muted-foreground text-xs">
              Recorded against your name. Every return is auditable.
            </p>
          </div>

          <div className="space-y-1.5 rounded-lg border p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Refund for {chosen.length} item{chosen.length === 1 ? "" : "s"}
              </span>
              <span className="font-medium tabular-nums">{formatCurrency(refund)}</span>
            </div>

            {clearsDebt > 0 && (
              <>
                <div className="flex justify-between text-amber-700 dark:text-amber-500">
                  <span>Clears outstanding credit</span>
                  <span className="tabular-nums">-{formatCurrency(clearsDebt)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5 font-medium">
                  <span>To hand back</span>
                  <span className="tabular-nums">{formatCurrency(cashBack)}</span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button onClick={submit} disabled={isPending || chosen.length === 0}>
          {isPending && <Spinner />}
          Process return · {formatCurrency(refund)}
        </Button>
        <Button variant="ghost" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
