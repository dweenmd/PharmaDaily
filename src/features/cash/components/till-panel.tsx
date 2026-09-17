"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Banknote, Landmark, LockKeyhole } from "lucide-react";
import { toast } from "sonner";

import {
  closeSessionAction,
  openSessionAction,
  recordCashMovementAction,
} from "@/features/cash/actions";
import { type CashMovement, type CashSession } from "@/features/cash/queries";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { type CashMovementType } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  branchId: string;
  branchName: string;
  session: CashSession | null;
  expected: number;
  movements: CashMovement[];
  breakdown: { salesCash: number; collections: number; refunds: number };
  canOperate: boolean;
};

const MOVEMENT_LABELS: Record<CashMovementType, string> = {
  pay_out: "Paid out",
  pay_in: "Paid in",
  bank_deposit: "Banked",
};

/** Tolerance below which a variance is rounding, not a discrepancy. */
const ROUNDING_TOLERANCE = 1;

export function TillPanel({
  branchId,
  branchName,
  session,
  expected,
  movements,
  breakdown,
  canOperate,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const [openDialog, setOpenDialog] = React.useState(false);
  const [openingFloat, setOpeningFloat] = React.useState<number>(0);

  const [closeDialog, setCloseDialog] = React.useState(false);
  const [counted, setCounted] = React.useState<number>(0);
  const [varianceReason, setVarianceReason] = React.useState("");

  const [movementDialog, setMovementDialog] = React.useState(false);
  const [movementType, setMovementType] = React.useState<CashMovementType>("pay_out");
  const [movementAmount, setMovementAmount] = React.useState<number>(0);
  const [movementReason, setMovementReason] = React.useState("");

  // Dialog state reset during render, so a previous entry never paints.
  const [wasCloseOpen, setWasCloseOpen] = React.useState(closeDialog);
  if (wasCloseOpen !== closeDialog) {
    setWasCloseOpen(closeDialog);
    if (closeDialog) {
      setCounted(0);
      setVarianceReason("");
      setError(null);
    }
  }

  const variance = counted - expected;
  const needsReason = Math.abs(variance) > ROUNDING_TOLERANCE;

  function run(
    fn: () => Promise<{ ok: boolean; error?: string }>,
    success: string,
    after?: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      toast.success(success);
      after?.();
      router.refresh();
    });
  }

  // ---------------------------------------------------------------- closed
  if (!session) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Till is closed</CardTitle>
            <CardDescription>
              Open it with the float in the drawer before taking cash at {branchName}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canOperate ? (
              <Button onClick={() => setOpenDialog(true)}>
                <Banknote className="size-4" />
                Open till
              </Button>
            ) : (
              <p className="text-muted-foreground text-sm">Your role does not operate the till.</p>
            )}
          </CardContent>
        </Card>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Open the till</DialogTitle>
              <DialogDescription>
                Count the float now. Everything the shift is reconciled against starts from this
                number.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="opening-float">Opening float</Label>
              <Input
                id="opening-float"
                value={openingFloat || ""}
                onChange={(e) => setOpeningFloat(Math.max(0, Number(e.target.value) || 0))}
                inputMode="decimal"
                className="text-right text-lg tabular-nums"
                autoFocus
                disabled={isPending}
              />
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpenDialog(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button
                disabled={isPending}
                onClick={() =>
                  run(
                    () => openSessionAction(branchId, openingFloat, null),
                    "Till open",
                    () => setOpenDialog(false),
                  )
                }
              >
                {isPending && <Spinner />}
                Open with {formatCurrency(openingFloat)}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ------------------------------------------------------------------ open
  const movementsIn = movements
    .filter((m) => m.type === "pay_in")
    .reduce((sum, m) => sum + Number(m.amount), 0);
  const movementsOut = movements
    .filter((m) => m.type !== "pay_in")
    .reduce((sum, m) => sum + Number(m.amount), 0);

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Till open</CardTitle>
            <CardDescription>
              Since {formatDateTime(session.opened_at)} · opened by{" "}
              {session.opened_by_profile?.name ?? "—"}
            </CardDescription>
          </div>
          <Badge>Open</Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* The working shown, not just the answer. "The system says 12,400"
              is not something a cashier can check; the arithmetic is. */}
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Opening float</dt>
              <dd className="tabular-nums">{formatCurrency(session.opening_float)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Cash sales</dt>
              <dd className="tabular-nums">+{formatCurrency(breakdown.salesCash)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Credit collected</dt>
              <dd className="tabular-nums">+{formatCurrency(breakdown.collections)}</dd>
            </div>
            {breakdown.refunds > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Cash refunds</dt>
                <dd className="tabular-nums">-{formatCurrency(breakdown.refunds)}</dd>
              </div>
            )}
            {movementsIn > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Paid in</dt>
                <dd className="tabular-nums">+{formatCurrency(movementsIn)}</dd>
              </div>
            )}
            {movementsOut > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Paid out / banked</dt>
                <dd className="tabular-nums">-{formatCurrency(movementsOut)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <dt>Should be in the drawer</dt>
              <dd className="tabular-nums">{formatCurrency(expected)}</dd>
            </div>
          </dl>

          {canOperate && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setMovementDialog(true)}>
                <ArrowUpRight className="size-4" />
                Cash in / out
              </Button>
              <Button size="sm" onClick={() => setCloseDialog(true)}>
                <LockKeyhole className="size-4" />
                Close &amp; count
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {movements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cash movements this shift</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {movements.map((movement) => (
                <li key={movement.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm">
                      {movement.type === "pay_in" ? (
                        <ArrowDownLeft className="size-3.5 text-emerald-600" />
                      ) : movement.type === "bank_deposit" ? (
                        <Landmark className="size-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpRight className="size-3.5 text-amber-600" />
                      )}
                      <span className="font-medium">{MOVEMENT_LABELS[movement.type]}</span>
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {movement.reason} · {movement.created_by_profile?.name ?? "—"} ·{" "}
                      {formatDateTime(movement.created_at)}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "shrink-0 text-sm font-medium tabular-nums",
                      movement.type === "pay_in" ? "text-emerald-700" : "text-amber-700",
                    )}
                  >
                    {movement.type === "pay_in" ? "+" : "−"}
                    {formatCurrency(movement.amount)}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* --------------------------------------------------------------- */}
      <Dialog open={movementDialog} onOpenChange={setMovementDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cash in or out</DialogTitle>
            <DialogDescription>
              Money leaving or entering the drawer for anything other than a sale.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="movement-type">Type</Label>
              <Select
                value={movementType}
                onValueChange={(v) => setMovementType(v as CashMovementType)}
                disabled={isPending}
              >
                <SelectTrigger id="movement-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pay_out">Paid out (petty expense, supplier)</SelectItem>
                  <SelectItem value="pay_in">Paid in (float top-up)</SelectItem>
                  <SelectItem value="bank_deposit">Banked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="movement-amount">Amount</Label>
              <Input
                id="movement-amount"
                value={movementAmount || ""}
                onChange={(e) => setMovementAmount(Math.max(0, Number(e.target.value) || 0))}
                inputMode="decimal"
                className="text-right tabular-nums"
                disabled={isPending}
              />
              {movementType !== "pay_in" && movementAmount > expected && (
                <p className="text-destructive text-xs">
                  Only {formatCurrency(expected)} should be in the drawer.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="movement-reason">
                What for <span className="text-destructive">*</span>
              </Label>
              <Input
                id="movement-reason"
                value={movementReason}
                onChange={(e) => setMovementReason(e.target.value)}
                placeholder="Delivery van fuel"
                disabled={isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setMovementDialog(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              disabled={isPending || movementAmount <= 0 || movementReason.trim().length < 3}
              onClick={() =>
                run(
                  () =>
                    recordCashMovementAction(
                      session.id,
                      movementType,
                      movementAmount,
                      movementReason,
                    ),
                  "Recorded",
                  () => {
                    setMovementDialog(false);
                    setMovementAmount(0);
                    setMovementReason("");
                  },
                )
              }
            >
              {isPending && <Spinner />}
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --------------------------------------------------------------- */}
      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Close the till</DialogTitle>
            <DialogDescription>
              Count the drawer and enter what is actually there — not what it should be.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="counted-cash">Counted in the drawer</Label>
              <Input
                id="counted-cash"
                value={counted || ""}
                onChange={(e) => setCounted(Math.max(0, Number(e.target.value) || 0))}
                inputMode="decimal"
                className="text-right text-lg tabular-nums"
                autoFocus
                disabled={isPending}
              />
            </div>

            {counted > 0 && (
              <div className="space-y-1.5 rounded-lg border p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected</span>
                  <span className="tabular-nums">{formatCurrency(expected)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Counted</span>
                  <span className="tabular-nums">{formatCurrency(counted)}</span>
                </div>
                <div
                  className={cn(
                    "flex justify-between border-t pt-1.5 font-medium",
                    needsReason && (variance < 0 ? "text-red-700" : "text-amber-700"),
                  )}
                >
                  <span>{variance === 0 ? "Balanced" : variance > 0 ? "Over" : "Short"}</span>
                  <span className="tabular-nums">{formatCurrency(Math.abs(variance))}</span>
                </div>
              </div>
            )}

            {needsReason && (
              <div className="space-y-2">
                <Label htmlFor="variance-reason">
                  Explain the difference <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="variance-reason"
                  value={varianceReason}
                  onChange={(e) => setVarianceReason(e.target.value)}
                  placeholder="Gave change from own pocket, not recorded"
                  disabled={isPending}
                />
                <p className="text-muted-foreground text-xs">
                  A discrepancy nobody explains is how a shortfall becomes routine.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCloseDialog(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              disabled={
                isPending || counted <= 0 || (needsReason && varianceReason.trim().length < 3)
              }
              onClick={() =>
                run(
                  () =>
                    closeSessionAction(
                      session.id,
                      counted,
                      varianceReason.trim() === "" ? null : varianceReason.trim(),
                    ),
                  "Till closed",
                  () => setCloseDialog(false),
                )
              }
            >
              {isPending && <Spinner />}
              Close till
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
