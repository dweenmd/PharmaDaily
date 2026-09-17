"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard, HandCoins, Smartphone } from "lucide-react";
import { toast } from "sonner";

import {
  recordCustomerPaymentAction,
  recordSupplierPaymentAction,
  type PaymentInput,
} from "@/features/customers/actions";
import { PAYMENT_METHOD_LABELS } from "@/features/sales/schemas";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

const METHODS = ["cash", "bkash", "nagad", "card"] as const;
type Method = (typeof METHODS)[number];

const ICONS: Record<Method, React.ComponentType<{ className?: string }>> = {
  cash: Banknote,
  bkash: Smartphone,
  nagad: Smartphone,
  card: CreditCard,
};

type Props = {
  kind: "customer" | "supplier";
  targetId: string;
  targetName: string;
  branchId: string;
  outstanding: number;
  disabled?: boolean;
};

/**
 * Settles part or all of a balance.
 *
 * The amount is capped at what is owed, in the form and again in the database.
 * Taking more than is outstanding would turn a debt into a liability the
 * business does not have — overpayment at a counter is change, not credit.
 */
export function RecordPaymentDialog({
  kind,
  targetId,
  targetName,
  branchId,
  outstanding,
  disabled,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState<number>(0);
  const [method, setMethod] = React.useState<Method>("cash");
  const [reference, setReference] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  // Reset on open, during render rather than in an effect, so the previous
  // customer's amount never paints for a frame.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setAmount(outstanding);
      setMethod("cash");
      setReference("");
      setError(null);
    }
  }

  const remaining = Math.max(0, outstanding - (Number(amount) || 0));
  const tooMuch = (Number(amount) || 0) > outstanding;

  function submit() {
    setError(null);

    const input = {
      amount: Number(amount),
      method,
      reference: reference.trim() === "" ? null : reference.trim(),
      notes: null,
    } as PaymentInput;

    startTransition(async () => {
      const result =
        kind === "customer"
          ? await recordCustomerPaymentAction(targetId, branchId, input)
          : await recordSupplierPaymentAction(targetId, branchId, input);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      toast.success(kind === "customer" ? "Payment collected" : "Payment to supplier recorded", {
        description: `${formatCurrency(Number(amount))} from ${targetName}.`,
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled || outstanding <= 0}>
          <HandCoins className="size-4" />
          {kind === "customer" ? "Collect payment" : "Record payment"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{kind === "customer" ? "Collect payment" : "Pay supplier"}</DialogTitle>
          <DialogDescription>
            {targetName} · {formatCurrency(outstanding)} outstanding
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="payment-amount">
              Amount <span className="text-destructive">*</span>
            </Label>
            <Input
              id="payment-amount"
              value={amount || ""}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
              inputMode="decimal"
              className="text-right text-lg tabular-nums"
              aria-invalid={tooMuch}
              autoFocus
              disabled={isPending}
            />
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount(outstanding)}
                disabled={isPending}
              >
                Pay in full
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount(Math.round(outstanding / 2))}
                disabled={isPending}
              >
                Half
              </Button>
            </div>
            {tooMuch ? (
              <p className="text-destructive text-xs">
                Only {formatCurrency(outstanding)} is outstanding.
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                {formatCurrency(remaining)} will remain outstanding.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Method</Label>
            <div className="grid grid-cols-4 gap-2">
              {METHODS.map((m) => {
                const Icon = ICONS[m];
                const active = method === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    aria-pressed={active}
                    disabled={isPending}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-2 text-xs font-medium transition-colors",
                      active ? "border-primary bg-primary/10" : "hover:bg-muted",
                    )}
                  >
                    <Icon className="size-4" />
                    {PAYMENT_METHOD_LABELS[m]}
                  </button>
                );
              })}
            </div>
          </div>

          {method !== "cash" && (
            <div className="space-y-2">
              <Label htmlFor="payment-reference">Transaction ID</Label>
              <Input
                id="payment-reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Optional"
                disabled={isPending}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || tooMuch || (Number(amount) || 0) <= 0}>
            {isPending && <Spinner />}
            Record {formatCurrency(Number(amount) || 0)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
