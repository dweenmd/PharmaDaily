"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, PackageCheck, X } from "lucide-react";
import { toast } from "sonner";

import {
  approveTransferAction,
  receiveTransferAction,
  rejectTransferAction,
  type ReceiptLine,
} from "@/features/transfers/actions";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export type TransferActionItem = {
  id: string;
  batch_no: string;
  quantity: number;
  medicine_name: string;
  strength: string | null;
};

type Props = {
  transferId: string;
  items: TransferActionItem[];
  canApprove: boolean;
  canReceive: boolean;
};

export function TransferActions({ transferId, items, canApprove, canReceive }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");

  const [receiveOpen, setReceiveOpen] = React.useState(false);
  const [receipts, setReceipts] = React.useState<
    Record<string, { short: boolean; received: number; reason: string }>
  >({});

  // Reset the receive dialog on open, during render so the previous transfer's
  // counts never paint.
  const [wasReceiveOpen, setWasReceiveOpen] = React.useState(receiveOpen);
  if (wasReceiveOpen !== receiveOpen) {
    setWasReceiveOpen(receiveOpen);
    if (receiveOpen) {
      setReceipts(
        Object.fromEntries(
          items.map((i) => [i.id, { short: false, received: i.quantity, reason: "" }]),
        ),
      );
      setError(null);
    }
  }

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

  const shortLines = items.filter((i) => receipts[i.id]?.short);
  const missingReason = shortLines.filter((i) => (receipts[i.id]?.reason ?? "").trim().length < 3);

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        {canApprove && (
          <>
            <Button
              disabled={isPending}
              onClick={() =>
                run(
                  () => approveTransferAction(transferId),
                  "Transfer dispatched — stock has left the sending branch.",
                )
              }
            >
              {isPending && <Spinner />}
              <Check className="size-4" />
              Approve &amp; dispatch
            </Button>

            <Button variant="outline" disabled={isPending} onClick={() => setRejectOpen(true)}>
              <X className="size-4" />
              Reject
            </Button>
          </>
        )}

        {canReceive && (
          <Button disabled={isPending} onClick={() => setReceiveOpen(true)}>
            <PackageCheck className="size-4" />
            Confirm receipt
          </Button>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject this transfer</DialogTitle>
            <DialogDescription>
              Nothing moves. The reason is recorded so the request can be reviewed later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reject-reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Input
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Needed at this branch"
              autoFocus
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isPending || rejectReason.trim().length < 3}
              onClick={() =>
                run(
                  () => rejectTransferAction(transferId, rejectReason),
                  "Transfer rejected",
                  () => setRejectOpen(false),
                )
              }
            >
              {isPending && <Spinner />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------------------- */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm what arrived</DialogTitle>
            <DialogDescription>
              Count it in. Anything less than was sent is stock that left one branch and reached
              neither, so it needs an explanation.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 space-y-3 overflow-y-auto">
            {items.map((item) => {
              const state = receipts[item.id] ?? {
                short: false,
                received: item.quantity,
                reason: "",
              };

              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-lg border p-3",
                    state.short && "border-amber-300 dark:border-amber-800",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {[item.medicine_name, item.strength].filter(Boolean).join(" ")}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Batch {item.batch_no} · {item.quantity} sent
                      </p>
                    </div>
                  </div>

                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={state.short}
                      disabled={isPending}
                      onCheckedChange={(v) =>
                        setReceipts((r) => ({
                          ...r,
                          [item.id]: {
                            ...state,
                            short: v === true,
                            received: v === true ? state.received : item.quantity,
                          },
                        }))
                      }
                    />
                    Short received
                  </label>

                  {state.short && (
                    <div className="mt-2 grid gap-2 sm:grid-cols-[110px_1fr]">
                      <div className="space-y-1">
                        <Label htmlFor={`received-${item.id}`} className="text-xs">
                          Received
                        </Label>
                        <Input
                          id={`received-${item.id}`}
                          value={state.received}
                          onChange={(e) =>
                            setReceipts((r) => ({
                              ...r,
                              [item.id]: {
                                ...state,
                                received: Math.max(
                                  0,
                                  Math.min(item.quantity, Number(e.target.value) || 0),
                                ),
                              },
                            }))
                          }
                          inputMode="numeric"
                          className="text-center tabular-nums"
                          disabled={isPending}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`reason-${item.id}`} className="text-xs">
                          What happened to the other {item.quantity - state.received}?
                        </Label>
                        <Input
                          id={`reason-${item.id}`}
                          value={state.reason}
                          onChange={(e) =>
                            setReceipts((r) => ({
                              ...r,
                              [item.id]: { ...state, reason: e.target.value },
                            }))
                          }
                          placeholder="Damaged in transit"
                          disabled={isPending}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {missingReason.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                Explain the shortfall on {missingReason.length} line
                {missingReason.length === 1 ? "" : "s"} before confirming.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setReceiveOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              disabled={isPending || missingReason.length > 0}
              onClick={() => {
                // Only short lines are sent; the function treats anything
                // absent as received in full.
                const payload: ReceiptLine[] = shortLines.map((item) => ({
                  item_id: item.id,
                  received_quantity: receipts[item.id]!.received,
                  shortfall_reason: receipts[item.id]!.reason.trim(),
                }));

                run(
                  () => receiveTransferAction(transferId, payload),
                  "Transfer received — stock is now on the shelf.",
                  () => setReceiveOpen(false),
                );
              }}
            >
              {isPending && <Spinner />}
              Confirm receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
