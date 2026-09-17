"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CircleAlert,
  Minus,
  Plus,
  Search,
  ShieldAlert,
  ShoppingCart,
  Trash2,
  TriangleAlert,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { createSaleAction } from "@/features/sales/actions";
import { type SellableBatch } from "@/features/sales/queries";
import { highestLevel, warningsFor } from "@/features/sales/components/pos-warnings";
import { CustomerDialog, type PosCustomer } from "@/features/sales/components/customer-dialog";
import { DiscountApprovalDialog } from "@/features/sales/components/discount-approval-dialog";
import { useHeldSale } from "@/features/sales/components/use-held-sale";
import { PaymentDialog } from "@/features/sales/components/payment-dialog";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { notifyQueueChanged } from "@/hooks/use-offline-queue";
import { cacheStock, enqueueSale, readCachedStock, type CachedBatch } from "@/lib/offline/db";
import { daysUntil, formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type CartLine = {
  batch: SellableBatch;
  quantity: number;
};

type Props = {
  branchId: string;
  branchName: string;
  stock: SellableBatch[];
  customers: PosCustomer[];
  /** Above this, completing the sale needs a manager's approval. */
  maxDiscountPercent: number;
};

export function PosTerminal({
  branchId,
  branchName,
  stock: serverStock,
  customers,
  maxDiscountPercent,
}: Props) {
  const router = useRouter();
  const isOnline = useOnlineStatus();

  // The server list is authoritative when it is available. When it is not —
  // the page was restored from the service worker, or the connection dropped
  // after load — the cached snapshot is what the till sells from.
  const [cachedStock, setCachedStock] = React.useState<CachedBatch[] | null>(null);
  const stock = React.useMemo(
    () => (serverStock.length > 0 ? serverStock : (cachedStock ?? [])),
    [serverStock, cachedStock],
  );

  // Refreshed whenever the POS loads with real data, so the snapshot a cashier
  // falls back to is never older than their last online visit.
  React.useEffect(() => {
    if (serverStock.length > 0) {
      void cacheStock(serverStock);
    } else {
      void readCachedStock().then(setCachedStock);
    }
  }, [serverStock]);

  const searchRef = React.useRef<HTMLInputElement | null>(null);
  const discountRef = React.useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = React.useState("");
  const [lines, setLines] = React.useState<CartLine[]>([]);
  const [customer, setCustomer] = React.useState<PosCustomer | null>(null);
  const [discount, setDiscount] = React.useState(0);
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [customerOpen, setCustomerOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  // Set once a manager has approved a discount over the branch's limit.
  // create_sale() re-verifies it server-side regardless — this only lets the
  // UI skip straight to completing the sale instead of asking again.
  const [discountOverrideToken, setDiscountOverrideToken] = React.useState<string | null>(null);
  const [approvalOpen, setApprovalOpen] = React.useState(false);
  const [pendingPayments, setPendingPayments] = React.useState<
    { method: string; amount: number; reference: string | null }[] | null
  >(null);

  const { held, hold, clear: clearHeld } = useHeldSale();
  const hasHeldSale = held !== null;

  // -------------------------------------------------------------------------
  // Search.
  //
  // An exact barcode match adds the item immediately and clears the box: that
  // is what makes a handheld scanner work, since it types the code and presses
  // Enter faster than anyone could click a result.
  // -------------------------------------------------------------------------
  const results = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];

    const matches = stock.filter(
      (b) =>
        b.medicine_name.toLowerCase().includes(term) ||
        b.generic_name?.toLowerCase().includes(term) ||
        b.barcode?.toLowerCase() === term ||
        b.batch_no.toLowerCase().includes(term),
    );

    // stock already arrives in FEFO order, so the first batch listed for a
    // medicine is the soonest-expiring one with stock.
    return matches.slice(0, 40);
  }, [query, stock]);

  const addLine = React.useCallback((batch: SellableBatch, quantity = 1) => {
    setLines((current) => {
      const existing = current.find((l) => l.batch.branch_stock_id === batch.branch_stock_id);

      if (existing) {
        const next = existing.quantity + quantity;
        if (next > batch.available) {
          toast.warning("Not enough stock", {
            description: `Only ${batch.available} left in batch ${batch.batch_no}.`,
          });
          return current.map((l) =>
            l.batch.branch_stock_id === batch.branch_stock_id
              ? { ...l, quantity: batch.available }
              : l,
          );
        }
        return current.map((l) =>
          l.batch.branch_stock_id === batch.branch_stock_id ? { ...l, quantity: next } : l,
        );
      }

      return [...current, { batch, quantity: Math.min(quantity, batch.available) }];
    });

    const warnings = warningsFor(batch, quantity);
    for (const warning of warnings.filter((w) => w.level === "danger")) {
      toast.warning(warning.label, { description: warning.detail });
    }
  }, []);

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();

    const term = query.trim().toLowerCase();
    if (!term) return;

    const exactBarcode = stock.find((b) => b.barcode?.toLowerCase() === term);
    const target = exactBarcode ?? results[0];

    if (target) {
      addLine(target);
      setQuery("");
    } else {
      toast.error("Nothing found", { description: `No sellable stock matches "${query.trim()}".` });
    }
  }

  // -------------------------------------------------------------------------
  // Cart maths.
  // -------------------------------------------------------------------------
  const subtotal = lines.reduce((sum, l) => sum + l.batch.selling_price * l.quantity, 0);
  const cappedDiscount = Math.min(discount, subtotal);
  const total = Math.max(0, subtotal - cappedDiscount);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  const discountPercent = subtotal > 0 ? (cappedDiscount / subtotal) * 100 : 0;
  const needsApproval = discountPercent > maxDiscountPercent;

  const blockingIssues = lines.filter((l) => l.quantity > l.batch.available);

  function setQuantity(stockId: string, quantity: number) {
    setLines((current) =>
      current
        .map((l) =>
          l.batch.branch_stock_id === stockId
            ? { ...l, quantity: Math.max(0, Math.min(quantity, l.batch.available)) }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }

  function removeLine(stockId: string) {
    setLines((current) => current.filter((l) => l.batch.branch_stock_id !== stockId));
  }

  function resetSale() {
    setLines([]);
    setCustomer(null);
    setDiscount(0);
    setQuery("");
    searchRef.current?.focus();
  }

  // -------------------------------------------------------------------------
  // Holding a sale — a customer goes back for one more item and the queue
  // behind them should not wait. Kept in localStorage, so it survives a
  // refresh or a dropped connection but never leaves the till.
  // -------------------------------------------------------------------------
  function holdSale() {
    if (lines.length === 0) return;

    const ok = hold({
      lines: lines.map((l) => ({ stockId: l.batch.branch_stock_id, quantity: l.quantity })),
      customerId: customer?.id ?? null,
      discount,
      heldAt: new Date().toISOString(),
    });

    if (!ok) {
      toast.error("Could not hold the sale", { description: "Local storage is unavailable." });
      return;
    }

    resetSale();
    toast.success("Sale held", { description: "Press F9 again to bring it back." });
  }

  function resumeSale() {
    if (!held) return;

    // Stock may have moved while the sale was on hold, so every line is
    // re-resolved against current availability rather than trusted.
    const restored: CartLine[] = [];
    let dropped = 0;

    for (const line of held.lines) {
      const batch = stock.find((b) => b.branch_stock_id === line.stockId);
      if (!batch) {
        dropped += 1;
        continue;
      }
      restored.push({ batch, quantity: Math.min(line.quantity, batch.available) });
    }

    setLines(restored);
    setCustomer(customers.find((c) => c.id === held.customerId) ?? null);
    setDiscount(held.discount ?? 0);
    clearHeld();

    if (dropped > 0) {
      toast.warning("Some items are no longer available", {
        description: `${dropped} line${dropped === 1 ? "" : "s"} could not be restored.`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Completing.
  // -------------------------------------------------------------------------
  const completeSale = React.useCallback(
    (
      payments: { method: string; amount: number; reference: string | null }[],
      overrideToken?: string,
    ) => {
      // Offline: the sale is real, the customer is standing there, and the
      // server cannot be told yet. It goes to the local queue with an id
      // minted NOW — that id is what makes replaying it safe if the eventual
      // sync response is lost.
      if (!isOnline) {
        const queuedId = crypto.randomUUID();

        void enqueueSale({
          id: queuedId,
          branch_id: branchId,
          occurred_at: new Date().toISOString(),
          status: "pending",
          attempts: 0,
          summary: { itemCount: lines.length, total },
          payload: {
            customer_id: customer?.id ?? null,
            discount: cappedDiscount,
            items: lines.map((l) => ({
              branch_stock_id: l.batch.branch_stock_id,
              quantity: l.quantity,
            })),
            payments,
          },
        }).then(() => {
          notifyQueueChanged();
          setPaymentOpen(false);
          resetSale();
          toast.success("Sale recorded offline", {
            description: "It will sync automatically when the connection returns.",
          });
        });

        return;
      }

      startTransition(async () => {
        const result = await createSaleAction({
          branch_id: branchId,
          customer_id: customer?.id ?? null,
          discount: cappedDiscount,
          items: lines.map((l) => ({
            branch_stock_id: l.batch.branch_stock_id,
            quantity: l.quantity,
          })),
          payments: payments as never,
          discount_override_token: overrideToken ?? discountOverrideToken,
        });

        if (!result.ok) {
          // create_sale() refuses with this specific field when the discount
          // is over the branch's limit and no valid approval was attached —
          // that is a "get a manager" moment, not a dead end.
          if (result.field === "discount") {
            setPendingPayments(payments);
            setDiscountOverrideToken(null);
            setApprovalOpen(true);
            return;
          }
          toast.error("Sale not completed", { description: result.error });
          return;
        }

        setDiscountOverrideToken(null);
        setPendingPayments(null);
        setPaymentOpen(false);
        router.push(`/sales/${result.data}?new=1`);
        router.refresh();
      });
    },
    [branchId, cappedDiscount, customer, discountOverrideToken, isOnline, lines, router, total],
  );

  // -------------------------------------------------------------------------
  // Shortcuts.
  // -------------------------------------------------------------------------
  useHotkeys({
    F2: (e) => {
      e.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    },
    F4: (e) => {
      e.preventDefault();
      setCustomerOpen(true);
    },
    F8: (e) => {
      e.preventDefault();
      discountRef.current?.focus();
      discountRef.current?.select();
    },
    F9: (e) => {
      e.preventDefault();
      if (lines.length > 0) holdSale();
      else if (hasHeldSale) resumeSale();
    },
    F10: (e) => {
      e.preventDefault();
      if (lines.length > 0 && blockingIssues.length === 0) setPaymentOpen(true);
    },
    F12: (e) => {
      e.preventDefault();
      if (lines.length > 0 && blockingIssues.length === 0) setPaymentOpen(true);
    },
    Escape: () => {
      setPaymentOpen(false);
      setCustomerOpen(false);
    },
  });

  React.useEffect(() => {
    searchRef.current?.focus();
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
      {/* ================= Left: find what to sell ================= */}
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Scan a barcode, or search by name or generic…"
                className="h-12 pl-9 text-base"
                aria-label="Search stock"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="flex items-center gap-1">
                <Kbd>F2</Kbd> search
              </span>
              <span className="flex items-center gap-1">
                <Kbd>F4</Kbd> customer
              </span>
              <span className="flex items-center gap-1">
                <Kbd>F8</Kbd> discount
              </span>
              <span className="flex items-center gap-1">
                <Kbd>F9</Kbd> {lines.length > 0 ? "hold" : "resume"}
              </span>
              <span className="flex items-center gap-1">
                <Kbd>F10</Kbd> pay
              </span>
              <span className="flex items-center gap-1">
                <Kbd>Esc</Kbd> close
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {query ? `${results.length} match${results.length === 1 ? "" : "es"}` : "Stock"}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100svh-24rem)] min-h-64">
              {!query ? (
                <p className="text-muted-foreground p-6 text-center text-sm">
                  Scan an item or start typing to find it. The soonest-expiring batch is offered
                  first.
                </p>
              ) : results.length === 0 ? (
                <p className="text-muted-foreground p-6 text-center text-sm">
                  Nothing sellable matches that. Expired batches are not shown.
                </p>
              ) : (
                <ul className="divide-y">
                  {results.map((batch) => {
                    const days = daysUntil(batch.expiry_date);
                    const level = highestLevel(warningsFor(batch, 1));

                    return (
                      <li key={batch.branch_stock_id}>
                        <button
                          type="button"
                          onClick={() => {
                            addLine(batch);
                            setQuery("");
                            searchRef.current?.focus();
                          }}
                          className="hover:bg-muted/60 focus-visible:bg-muted flex w-full items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-medium">
                                {[batch.medicine_name, batch.strength].filter(Boolean).join(" ")}
                              </span>
                              {batch.controlled_drug && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <CircleAlert className="size-3.5 shrink-0 text-red-600 dark:text-red-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>Controlled drug</TooltipContent>
                                </Tooltip>
                              )}
                              {batch.prescription_required && !batch.controlled_drug && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <TriangleAlert className="size-3.5 shrink-0 text-amber-600 dark:text-amber-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>Prescription required</TooltipContent>
                                </Tooltip>
                              )}
                            </div>

                            <p className="text-muted-foreground truncate text-xs">
                              Batch {batch.batch_no} · exp {formatDate(batch.expiry_date)}
                              {days <= 90 && (
                                <span
                                  className={cn(
                                    "ml-1 font-medium",
                                    days <= 30
                                      ? "text-red-600 dark:text-red-500"
                                      : "text-amber-600 dark:text-amber-500",
                                  )}
                                >
                                  ({days}d)
                                </span>
                              )}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="font-medium tabular-nums">
                              {formatCurrency(batch.selling_price)}
                            </p>
                            <p
                              className={cn(
                                "text-xs tabular-nums",
                                batch.available <= 5 ? "text-amber-600" : "text-muted-foreground",
                              )}
                            >
                              {batch.available} left
                            </p>
                          </div>

                          {level === "danger" && (
                            <Badge variant="destructive" className="shrink-0">
                              !
                            </Badge>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* ================= Right: the cart ================= */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <Card className="flex h-full flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <ShoppingCart className="size-4" />
                Cart
              </span>
              {itemCount > 0 && <Badge variant="secondary">{itemCount}</Badge>}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 space-y-4 pb-4">
            <button
              type="button"
              onClick={() => setCustomerOpen(true)}
              className="hover:bg-muted/60 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors"
            >
              <UserRound className="text-muted-foreground size-4 shrink-0" />
              {customer ? (
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{customer.name}</span>
                  {customer.due_amount > 0 && (
                    <span className="block text-xs text-amber-600 dark:text-amber-500">
                      Owes {formatCurrency(customer.due_amount)}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-muted-foreground flex-1">Walk-in customer</span>
              )}
              <Kbd className="shrink-0">F4</Kbd>
            </button>

            <Separator />

            {lines.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Nothing in the cart yet.
              </p>
            ) : (
              <ScrollArea className="max-h-[38svh]">
                <ul className="space-y-2 pr-3">
                  {lines.map((line) => {
                    const warnings = warningsFor(line.batch, line.quantity);
                    const level = highestLevel(warnings);

                    return (
                      <li
                        key={line.batch.branch_stock_id}
                        className={cn(
                          "rounded-lg border p-2.5",
                          level === "danger" && "border-red-300 dark:border-red-900",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {[line.batch.medicine_name, line.batch.strength]
                                .filter(Boolean)
                                .join(" ")}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {formatCurrency(line.batch.selling_price)} · batch{" "}
                              {line.batch.batch_no}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLine(line.batch.branch_stock_id)}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                            aria-label={`Remove ${line.batch.medicine_name}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-7"
                              onClick={() =>
                                setQuantity(line.batch.branch_stock_id, line.quantity - 1)
                              }
                              aria-label="Decrease quantity"
                            >
                              <Minus className="size-3" />
                            </Button>
                            <Input
                              value={line.quantity}
                              onChange={(e) =>
                                setQuantity(
                                  line.batch.branch_stock_id,
                                  Number.parseInt(e.target.value, 10) || 0,
                                )
                              }
                              inputMode="numeric"
                              className="h-7 w-14 text-center tabular-nums"
                              aria-label={`Quantity of ${line.batch.medicine_name}`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-7"
                              onClick={() =>
                                setQuantity(line.batch.branch_stock_id, line.quantity + 1)
                              }
                              aria-label="Increase quantity"
                            >
                              <Plus className="size-3" />
                            </Button>
                          </div>

                          <span className="text-sm font-medium tabular-nums">
                            {formatCurrency(line.batch.selling_price * line.quantity)}
                          </span>
                        </div>

                        {warnings.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {warnings.map((w) => (
                              <li
                                key={w.label}
                                className={cn(
                                  "flex items-start gap-1.5 text-xs",
                                  w.level === "danger"
                                    ? "text-red-600 dark:text-red-500"
                                    : "text-amber-600 dark:text-amber-500",
                                )}
                              >
                                <TriangleAlert className="mt-px size-3 shrink-0" />
                                <span>{w.detail}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            )}

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <label htmlFor="pos-discount" className="text-muted-foreground">
                  Discount
                </label>
                <Input
                  id="pos-discount"
                  ref={discountRef}
                  value={discount || ""}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  inputMode="decimal"
                  className="h-8 w-28 text-right tabular-nums"
                />
              </div>

              {needsApproval && (
                <p className="flex items-start justify-end gap-1.5 text-right text-xs text-amber-600 dark:text-amber-500">
                  <ShieldAlert className="mt-px size-3 shrink-0" />
                  {Math.round(discountPercent)}% is over the {Math.round(maxDiscountPercent)}% limit
                  — a manager will need to approve this at checkout.
                </p>
              )}

              <div className="flex justify-between border-t pt-2 text-base font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(total)}</span>
              </div>
            </div>

            {blockingIssues.length > 0 && (
              <p className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-500">
                <TriangleAlert className="mt-px size-3 shrink-0" />
                Reduce the highlighted quantities before taking payment.
              </p>
            )}

            <div className="space-y-2">
              <Button
                className="h-12 w-full text-base"
                disabled={lines.length === 0 || blockingIssues.length > 0 || isPending}
                onClick={() => setPaymentOpen(true)}
              >
                Pay Now · {formatCurrency(total)}
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={lines.length === 0 && !hasHeldSale}
                  onClick={() => (lines.length > 0 ? holdSale() : resumeSale())}
                >
                  {lines.length > 0 ? "Hold" : "Resume held"}
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  disabled={lines.length === 0}
                  onClick={resetSale}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/*
        Below lg the cart panel sits underneath a nearly full-height results
        list, so the total and the pay button are a scroll away — on a till,
        the two things that must never be. This bar keeps them one tap away
        and disappears at lg, where the side panel already shows both.
      */}
      {lines.length > 0 && (
        <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-xs">
              {itemCount} item{itemCount === 1 ? "" : "s"}
              {cappedDiscount > 0 && ` · −${formatCurrency(cappedDiscount)}`}
            </p>
            <p className="truncate text-lg leading-tight font-semibold tabular-nums">
              {formatCurrency(total)}
            </p>
          </div>

          <Button
            size="lg"
            className="shrink-0"
            disabled={blockingIssues.length > 0 || isPending}
            onClick={() => setPaymentOpen(true)}
          >
            Pay Now
          </Button>
        </div>
      )}

      {/* Clears the fixed bar so the last cart row is never hidden behind it. */}
      {lines.length > 0 && <div className="h-20 lg:hidden" aria-hidden />}

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        total={total}
        customer={customer}
        isPending={isPending}
        onConfirm={completeSale}
        onNeedCustomer={() => {
          setPaymentOpen(false);
          setCustomerOpen(true);
        }}
      />

      <CustomerDialog
        open={customerOpen}
        onOpenChange={setCustomerOpen}
        customers={customers}
        selected={customer}
        onSelect={(c) => {
          setCustomer(c);
          setCustomerOpen(false);
        }}
      />

      <DiscountApprovalDialog
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        branchId={branchId}
        discountPercent={discountPercent}
        onApproved={(token) => {
          setDiscountOverrideToken(token);
          setApprovalOpen(false);
          if (pendingPayments) completeSale(pendingPayments, token);
        }}
      />

      <span className="sr-only" aria-live="polite">
        {itemCount} items in cart at {branchName}, total {formatCurrency(total)}
      </span>
    </div>
  );
}
