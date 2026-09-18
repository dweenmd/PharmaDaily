"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  CircleAlert,
  Clock,
  FlaskConical,
  Minus,
  PackageSearch,
  Pill,
  Plus,
  Receipt,
  ScanBarcode,
  Search,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  Tag,
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

type CategoryFilter = "all" | "tablet" | "capsule" | "syrup" | "rx" | "expiring";
export type SearchScope = "smart" | "name" | "generic" | "barcode";

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
  const [searchScope, setSearchScope] = React.useState<SearchScope>("smart");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [categoryFilter, setCategoryFilter] = React.useState<CategoryFilter>("all");
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
  // Search and Category Filtering.
  // -------------------------------------------------------------------------
  const results = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];

    const matches = stock.filter((b) => {
      const nameMatch = b.medicine_name.toLowerCase().includes(term);
      const genericMatch = b.generic_name?.toLowerCase().includes(term) ?? false;
      const barcodeMatch =
        b.barcode?.toLowerCase() === term ||
        b.barcode?.toLowerCase().includes(term) ||
        b.batch_no.toLowerCase().includes(term);

      if (searchScope === "name") return nameMatch;
      if (searchScope === "generic") return genericMatch;
      if (searchScope === "barcode") return barcodeMatch;
      // "smart": brand name, generic name, barcode, or batch
      return nameMatch || genericMatch || barcodeMatch;
    });

    return matches.slice(0, 60);
  }, [query, searchScope, stock]);

  // Primary generic of current top match
  const matchedGeneric = React.useMemo(() => {
    if (!query.trim() || results.length === 0) return null;
    const firstWithGeneric = results.find((r) => r.generic_name?.trim());
    return firstWithGeneric?.generic_name?.trim() ?? null;
  }, [query, results]);

  // Other brands in stock sharing the same generic molecule
  const genericAlternatives = React.useMemo(() => {
    if (!matchedGeneric) return [];
    const targetGen = matchedGeneric.toLowerCase();
    const map = new Map<string, SellableBatch>();

    for (const b of stock) {
      if (b.generic_name?.toLowerCase() === targetGen) {
        const isCurrentMatch = results.some(
          (r) => r.medicine_name.toLowerCase() === b.medicine_name.toLowerCase(),
        );
        if (!isCurrentMatch && !map.has(b.medicine_name)) {
          map.set(b.medicine_name, b);
        }
      }
    }

    return Array.from(map.values()).slice(0, 6);
  }, [matchedGeneric, results, stock]);

  // Reset keyboard highlight whenever search conditions change
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query, searchScope, categoryFilter]);

  const categoryCounts = React.useMemo(() => {
    const base = query.trim() ? results : stock;
    return {
      all: base.length,
      tablet: base.filter(
        (b) =>
          b.dosage_form?.toLowerCase().includes("tab") ||
          b.medicine_name.toLowerCase().includes("tab"),
      ).length,
      capsule: base.filter(
        (b) =>
          b.dosage_form?.toLowerCase().includes("cap") ||
          b.medicine_name.toLowerCase().includes("cap"),
      ).length,
      syrup: base.filter(
        (b) =>
          b.dosage_form?.toLowerCase().includes("syr") ||
          b.dosage_form?.toLowerCase().includes("susp") ||
          b.dosage_form?.toLowerCase().includes("liq") ||
          b.medicine_name.toLowerCase().includes("syr"),
      ).length,
      rx: base.filter((b) => b.prescription_required || b.controlled_drug).length,
      expiring: base.filter((b) => daysUntil(b.expiry_date) <= 90).length,
    };
  }, [query, results, stock]);

  const itemsToDisplay = React.useMemo(() => {
    let list = query.trim() ? results : stock;

    if (categoryFilter === "tablet") {
      list = list.filter(
        (b) =>
          b.dosage_form?.toLowerCase().includes("tab") ||
          b.medicine_name.toLowerCase().includes("tab"),
      );
    } else if (categoryFilter === "capsule") {
      list = list.filter(
        (b) =>
          b.dosage_form?.toLowerCase().includes("cap") ||
          b.medicine_name.toLowerCase().includes("cap"),
      );
    } else if (categoryFilter === "syrup") {
      list = list.filter(
        (b) =>
          b.dosage_form?.toLowerCase().includes("syr") ||
          b.dosage_form?.toLowerCase().includes("susp") ||
          b.dosage_form?.toLowerCase().includes("liq") ||
          b.medicine_name.toLowerCase().includes("syr"),
      );
    } else if (categoryFilter === "rx") {
      list = list.filter((b) => b.prescription_required || b.controlled_drug);
    } else if (categoryFilter === "expiring") {
      list = list.filter((b) => daysUntil(b.expiry_date) <= 90);
    }

    return list.slice(0, 60);
  }, [categoryFilter, query, results, stock]);

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
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, itemsToDisplay.length - 1)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (event.key === "Escape") {
      if (query) {
        event.preventDefault();
        setQuery("");
        return;
      }
    }
    if (event.key !== "Enter") return;
    event.preventDefault();

    const term = query.trim().toLowerCase();
    if (!term) return;

    const exactBarcode = stock.find((b) => b.barcode?.toLowerCase() === term);
    const target = exactBarcode ?? itemsToDisplay[selectedIndex] ?? results[0];

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
    setSearchScope("smart");
    setSelectedIndex(0);
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

  function applyPresetDiscount(percent: number) {
    if (subtotal <= 0) return;
    const discAmount = Math.round(((subtotal * percent) / 100) * 100) / 100;
    setDiscount(discAmount);
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
      {/* ================= Left: Medicine Catalogue & Search (8 cols on XL, 7 on LG) ================= */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-4">
        {/* Scanner & Smart Search Header */}
        <Card className="shadow-sm border-border/80 overflow-hidden">
          <CardContent className="p-4 sm:p-5 space-y-3.5">
            {/* Smart Search Mode Switcher & Scanner Status */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1 p-1 bg-muted/70 dark:bg-muted/40 rounded-xl border border-border/70">
                <button
                  type="button"
                  onClick={() => {
                    setSearchScope("smart");
                    searchRef.current?.focus();
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all select-none",
                    searchScope === "smart"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/80",
                  )}
                >
                  <Sparkles className="size-3.5 text-amber-300 dark:text-amber-400" />
                  <span>Smart (All)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchScope("name");
                    searchRef.current?.focus();
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all select-none",
                    searchScope === "name"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/80",
                  )}
                >
                  <Pill className="size-3.5" />
                  <span>Brand / Trade</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchScope("generic");
                    searchRef.current?.focus();
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all select-none",
                    searchScope === "generic"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/80",
                  )}
                >
                  <FlaskConical className="size-3.5" />
                  <span>Generic Molecule</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchScope("barcode");
                    searchRef.current?.focus();
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all select-none",
                    searchScope === "barcode"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/80",
                  )}
                >
                  <ScanBarcode className="size-3.5" />
                  <span>Barcode / Batch</span>
                </button>
              </div>

              {/* Barcode Scanner Indicator & Hotkey */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-500/25">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <ScanBarcode className="size-3.5" />
                  <span className="hidden sm:inline">Scanner Ready</span>
                </span>
                <Kbd className="text-[11px] px-2 py-0.5 font-bold text-muted-foreground bg-muted border border-border/80">
                  F2 Focus
                </Kbd>
              </div>
            </div>

            {/* High-Contrast Search Command Bar */}
            <div className="relative group flex items-center rounded-xl border-2 border-emerald-500/50 focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-500/15 bg-background dark:bg-card shadow-xs transition-all p-1">
              <div className="flex items-center justify-center p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 ml-0.5">
                {searchScope === "generic" ? (
                  <FlaskConical className="size-5" />
                ) : searchScope === "barcode" ? (
                  <ScanBarcode className="size-5" />
                ) : searchScope === "name" ? (
                  <Pill className="size-5" />
                ) : (
                  <Search className="size-5" />
                )}
              </div>

              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder={
                  searchScope === "generic"
                    ? "Type generic formula (e.g., Paracetamol, Esomeprazole, Cetirizine)…"
                    : searchScope === "name"
                      ? "Type brand medicine name (e.g., Napa, Ace, Seclo, Maxpro)…"
                      : searchScope === "barcode"
                        ? "Scan barcode or enter batch number…"
                        : "Smart Search: Type medicine brand, generic, or scan barcode…"
                }
                className="h-11 flex-1 border-0 bg-transparent text-base font-medium shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/65 px-3"
                aria-label="Search stock"
                autoComplete="off"
              />

              {query ? (
                <div className="flex items-center gap-1 mr-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      searchRef.current?.focus();
                    }}
                    className="text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-muted transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="size-4" />
                  </button>
                  <Kbd className="text-[10px] px-1.5 py-0.5 text-muted-foreground">Esc</Kbd>
                </div>
              ) : null}
            </div>

            {/* Smart Generic Alternative Recommendations Banner */}
            {genericAlternatives.length > 0 && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-3 space-y-2 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    <Sparkles className="size-3.5 text-amber-500 animate-pulse shrink-0" />
                    <span>Same Generic in Stock:</span>
                    <Badge variant="outline" className="text-[11px] font-mono font-bold bg-background text-foreground border-emerald-500/30">
                      {matchedGeneric}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    Click alternative brand to add
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {genericAlternatives.map((alt) => (
                    <Button
                      key={alt.branch_stock_id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        addLine(alt);
                        searchRef.current?.focus();
                      }}
                      className="h-8 text-xs rounded-lg border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/10 gap-2 font-medium bg-background shadow-2xs"
                    >
                      <Pill className="size-3 text-emerald-600 shrink-0" />
                      <span className="font-semibold">{alt.medicine_name}</span>
                      {alt.strength && <span className="text-muted-foreground text-[11px]">{alt.strength}</span>}
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(alt.selling_price)}
                      </span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-bold">
                        {alt.available} left
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <Button
                type="button"
                variant={categoryFilter === "all" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs rounded-full px-3 font-medium transition-all"
                onClick={() => setCategoryFilter("all")}
              >
                All Items ({categoryCounts.all})
              </Button>
              <Button
                type="button"
                variant={categoryFilter === "tablet" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs rounded-full px-3 font-medium transition-all"
                onClick={() => setCategoryFilter("tablet")}
              >
                💊 Tablets ({categoryCounts.tablet})
              </Button>
              <Button
                type="button"
                variant={categoryFilter === "capsule" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs rounded-full px-3 font-medium transition-all"
                onClick={() => setCategoryFilter("capsule")}
              >
                🧪 Capsules ({categoryCounts.capsule})
              </Button>
              <Button
                type="button"
                variant={categoryFilter === "syrup" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs rounded-full px-3 font-medium transition-all"
                onClick={() => setCategoryFilter("syrup")}
              >
                🧴 Syrups ({categoryCounts.syrup})
              </Button>
              <Button
                type="button"
                variant={categoryFilter === "rx" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs rounded-full px-3 font-medium transition-all"
                onClick={() => setCategoryFilter("rx")}
              >
                🛡️ Rx Only ({categoryCounts.rx})
              </Button>
              {categoryCounts.expiring > 0 && (
                <Button
                  type="button"
                  variant={categoryFilter === "expiring" ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-7 text-xs rounded-full px-3 font-medium transition-all",
                    categoryFilter !== "expiring" && "text-amber-600 dark:text-amber-400 border-amber-500/30",
                  )}
                  onClick={() => setCategoryFilter("expiring")}
                >
                  ⚠️ Expiring Soon ({categoryCounts.expiring})
                </Button>
              )}
            </div>

            {/* Keyboard Shortcuts Strip */}
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs pt-1 border-t">
              <span className="flex items-center gap-1">
                <Kbd className="text-[10px] px-1 py-0.5">F2</Kbd> <span>Search</span>
              </span>
              <span className="flex items-center gap-1">
                <Kbd className="text-[10px] px-1 py-0.5">F4</Kbd> <span>Customer</span>
              </span>
              <span className="flex items-center gap-1">
                <Kbd className="text-[10px] px-1 py-0.5">F8</Kbd> <span>Discount</span>
              </span>
              <span className="flex items-center gap-1">
                <Kbd className="text-[10px] px-1 py-0.5">F9</Kbd> <span>{lines.length > 0 ? "Hold" : "Resume"}</span>
              </span>
              <span className="flex items-center gap-1">
                <Kbd className="text-[10px] px-1 py-0.5">F10</Kbd> <span>Pay</span>
              </span>
              <span className="flex items-center gap-1">
                <Kbd className="text-[10px] px-1 py-0.5">Esc</Kbd> <span>Close</span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Sellable Stock Catalogue */}
        <Card className="overflow-hidden shadow-xs border-border/80">
          <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3 bg-muted/20">
            <div className="flex items-center gap-2">
              <Boxes className="size-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                {query
                  ? `${results.length} Found for "${query}"`
                  : categoryFilter !== "all"
                    ? `Filtered Medicines (${itemsToDisplay.length})`
                    : "Available Medicines in Stock"}
              </CardTitle>
              <Badge variant="secondary" className="text-[11px] font-medium h-5 px-2">
                {itemsToDisplay.length} Available
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              FEFO: Earliest Expiry First
            </span>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-23rem)] min-h-[420px]">
              {itemsToDisplay.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <PackageSearch className="size-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-foreground">
                    {query ? "No matching medicine found" : "No stock in this category"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm px-4">
                    {query
                      ? `No batch matches "${query}". Check spelling or try searching by generic name.`
                      : "No active batches match the selected filter. Try selecting 'All Items'."}
                  </p>
                  {categoryFilter !== "all" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 text-xs"
                      onClick={() => setCategoryFilter("all")}
                    >
                      Reset Filter to All Items
                    </Button>
                  )}
                </div>
              ) : (
                <div className="p-3 grid grid-cols-1 gap-2.5">
                  {itemsToDisplay.map((batch, index) => {
                    const isSelected = selectedIndex === index;
                    const days = daysUntil(batch.expiry_date);
                    const level = highestLevel(warningsFor(batch, 1));
                    const inCartLine = lines.find(
                      (l) => l.batch.branch_stock_id === batch.branch_stock_id,
                    );

                    const dosage = batch.dosage_form || "";
                    const isTab = dosage.toLowerCase().includes("tab");
                    const isCap = dosage.toLowerCase().includes("cap");
                    const isSyr = dosage.toLowerCase().includes("syr") || dosage.toLowerCase().includes("susp");

                    return (
                      <div
                        key={batch.branch_stock_id}
                        onClick={() => {
                          setSelectedIndex(index);
                          addLine(batch);
                          searchRef.current?.focus();
                        }}
                        className={cn(
                          "group flex items-center justify-between gap-3.5 rounded-xl border p-3 cursor-pointer transition-all duration-150 select-none",
                          isSelected
                            ? "ring-2 ring-emerald-500 ring-offset-1 border-emerald-500/80 bg-emerald-500/5 dark:bg-emerald-950/25 shadow-xs"
                            : inCartLine
                              ? "border-primary/40 bg-primary/5 hover:border-primary/60 shadow-2xs"
                              : "border-border/70 bg-card hover:border-border hover:shadow-2xs hover:bg-muted/30",
                        )}
                      >
                        {/* Medicine Details */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                              {[batch.medicine_name, batch.strength, batch.unit ? `(${batch.unit})` : null]
                                .filter(Boolean)
                                .join(" ")}
                            </span>

                            {/* Dosage Form Badge */}
                            {batch.dosage_form && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] h-5 px-1.5 font-medium rounded-md",
                                  isTab && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
                                  isCap && "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
                                  isSyr && "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
                                  !isTab && !isCap && !isSyr && "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
                                )}
                              >
                                {batch.dosage_form}
                              </Badge>
                            )}

                            {/* In-Cart Indicator */}
                            {inCartLine && (
                              <Badge
                                variant="default"
                                className="text-[10px] h-5 px-2 font-semibold bg-primary text-primary-foreground"
                              >
                                ✓ {inCartLine.quantity} in Cart
                              </Badge>
                            )}

                            {/* Generic match indicator badge */}
                            {query.trim() && batch.generic_name?.toLowerCase().includes(query.trim().toLowerCase()) && searchScope !== "name" && (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5 px-1.5 font-medium rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/25 gap-1"
                              >
                                <FlaskConical className="size-2.5" />
                                <span>Generic</span>
                              </Badge>
                            )}

                            {/* Barcode/Batch match badge */}
                            {query.trim() && (batch.barcode?.toLowerCase().includes(query.trim().toLowerCase()) || batch.batch_no.toLowerCase().includes(query.trim().toLowerCase())) && searchScope !== "generic" && (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5 px-1.5 font-medium rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 gap-1"
                              >
                                <ScanBarcode className="size-2.5" />
                                <span>Batch/Barcode</span>
                              </Badge>
                            )}

                            {/* Rx & Controlled Tags */}
                            {batch.controlled_drug && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="destructive" className="text-[10px] h-5 px-1.5 gap-1">
                                    <CircleAlert className="size-3" />
                                    Controlled
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>Controlled drug: Requires authorized dispenser</TooltipContent>
                              </Tooltip>
                            )}
                            {batch.prescription_required && !batch.controlled_drug && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 text-amber-600 dark:text-amber-500 border-amber-500/30">
                                    <TriangleAlert className="size-3" />
                                    Rx
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>Prescription required</TooltipContent>
                              </Tooltip>
                            )}
                          </div>

                          {/* Sub-details: Generic, Batch, Expiry */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            {batch.generic_name && (
                              <span className="italic text-foreground/75 font-sans font-medium">
                                {batch.generic_name}
                              </span>
                            )}
                            <span>Batch: {batch.batch_no}</span>
                            <span>
                              Exp: {formatDate(batch.expiry_date)}
                              {days <= 90 && (
                                <span
                                  className={cn(
                                    "ml-1 font-semibold",
                                    days <= 30
                                      ? "text-red-600 dark:text-red-500"
                                      : "text-amber-600 dark:text-amber-500",
                                  )}
                                >
                                  ({days <= 30 ? `⚠️ in ${days}d` : `in ${Math.round(days / 30)}m`})
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Price & Add Action */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="font-bold text-base tabular-nums text-foreground">
                              {formatCurrency(batch.selling_price)}
                            </p>
                            <p
                              className={cn(
                                "text-xs font-medium tabular-nums",
                                batch.available <= 10
                                  ? "text-amber-600 dark:text-amber-500 font-semibold"
                                  : "text-muted-foreground",
                              )}
                            >
                              {batch.available} in stock
                            </p>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            variant={inCartLine ? "default" : isSelected ? "default" : "outline"}
                            className={cn(
                              "h-8 px-3 text-xs font-semibold rounded-lg shadow-2xs transition-all",
                              isSelected && !inCartLine && "bg-emerald-600 hover:bg-emerald-500 text-white",
                              !inCartLine && !isSelected && "group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary",
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              addLine(batch);
                              searchRef.current?.focus();
                            }}
                          >
                            <Plus className="size-3.5 mr-1" />
                            Add
                            {isSelected && (
                              <span className="ml-1 text-[9px] opacity-80 font-mono">↵</span>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* ================= Right: Digital Billing Register / Cart (4 cols on XL, 5 on LG) ================= */}
      <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-4 space-y-4">
        <Card className="flex flex-col shadow-sm border-border/80 rounded-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3.5 bg-muted/25">
            <div className="flex items-center gap-2">
              <Receipt className="size-4 text-primary" />
              <CardTitle className="text-base font-bold tracking-tight">Billing Register</CardTitle>
              {lines.length > 0 && (
                <Badge variant="default" className="rounded-full px-2 text-xs font-semibold">
                  {lines.length} Items ({itemCount})
                </Badge>
              )}
            </div>

            {lines.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetSale}
                className="h-7 text-xs text-muted-foreground hover:text-destructive px-2"
              >
                Clear
              </Button>
            )}
          </CardHeader>

          <CardContent className="space-y-4 p-4">
            {/* Customer Selector Card */}
            <button
              type="button"
              onClick={() => setCustomerOpen(true)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all hover:bg-muted/40",
                customer ? "bg-primary/5 border-primary/30" : "bg-muted/15 border-border/70",
              )}
            >
              <div className="rounded-full bg-background border p-2 shrink-0">
                <UserRound className="size-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                {customer ? (
                  <>
                    <p className="truncate text-sm font-semibold text-foreground">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">{customer.phone || "No phone number"}</p>
                    {customer.due_amount > 0 && (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                        ⚠️ Previous Due: {formatCurrency(customer.due_amount)}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">Walk-in Customer</p>
                    <p className="text-xs text-muted-foreground">Click to select registered customer</p>
                  </>
                )}
              </div>
              <Kbd className="shrink-0 text-xs px-1.5 py-0.5">F4</Kbd>
            </button>

            {/* Cart Items List */}
            <div className="rounded-xl border bg-muted/10 p-1">
              {lines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <div className="rounded-full bg-muted p-3 mb-2.5">
                    <ShoppingCart className="size-6 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">No Items in Current Bill</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                    Click [+ Add] on any medicine or scan barcode to begin billing.
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[36vh] min-h-[160px] px-1 py-1">
                  <ul className="space-y-2">
                    {lines.map((line) => {
                      const warnings = warningsFor(line.batch, line.quantity);
                      const level = highestLevel(warnings);

                      return (
                        <li
                          key={line.batch.branch_stock_id}
                          className={cn(
                            "rounded-lg border bg-card p-2.5 shadow-2xs transition-all",
                            level === "danger" && "border-red-300 dark:border-red-900 bg-red-50/20",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {[line.batch.medicine_name, line.batch.strength]
                                  .filter(Boolean)
                                  .join(" ")}
                              </p>
                              <p className="text-muted-foreground text-xs mt-0.5">
                                {formatCurrency(line.batch.selling_price)}/unit · Batch: {line.batch.batch_no}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeLine(line.batch.branch_stock_id)}
                              className="text-muted-foreground hover:text-destructive shrink-0 p-1 rounded hover:bg-muted transition-colors"
                              aria-label={`Remove ${line.batch.medicine_name}`}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>

                          <div className="mt-2.5 flex items-center justify-between gap-2">
                            {/* Quantity Stepper */}
                            <div className="flex items-center gap-0.5 rounded-lg border bg-background p-0.5 shadow-2xs">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-6 rounded"
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
                                className="h-6 w-12 border-0 bg-transparent text-center font-bold tabular-nums focus-visible:ring-0 text-sm"
                                aria-label={`Quantity of ${line.batch.medicine_name}`}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-6 rounded"
                                onClick={() =>
                                  setQuantity(line.batch.branch_stock_id, line.quantity + 1)
                                }
                                aria-label="Increase quantity"
                              >
                                <Plus className="size-3" />
                              </Button>
                            </div>

                            <span className="text-sm font-bold tabular-nums text-foreground">
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
                                      ? "text-red-600 dark:text-red-500 font-medium"
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
            </div>

            {/* Calculations & Totals */}
            <div className="space-y-2.5 border-t pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums font-semibold text-foreground">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              {/* Discount Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="pos-discount" className="text-muted-foreground">
                      Discount
                    </label>
                    {discount > 0 && subtotal > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-semibold">
                        {Math.round(discountPercent)}%
                      </Badge>
                    )}
                  </div>
                  <Input
                    id="pos-discount"
                    ref={discountRef}
                    value={discount || ""}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="৳ 0.00"
                    inputMode="decimal"
                    className="h-8 w-24 text-right tabular-nums font-semibold"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex items-center justify-end gap-1">
                  {[0, 5, 7.5, 10].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => applyPresetDiscount(pct)}
                      className={cn(
                        "text-[11px] px-2 py-0.5 rounded border font-medium transition-colors",
                        Math.abs(discountPercent - pct) < 0.5 && discount > 0
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground",
                      )}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {needsApproval && (
                <p className="flex items-start justify-end gap-1.5 text-right text-xs text-amber-600 dark:text-amber-500 font-medium">
                  <ShieldAlert className="mt-px size-3.5 shrink-0" />
                  {Math.round(discountPercent)}% exceeds {Math.round(maxDiscountPercent)}% limit (manager PIN required)
                </p>
              )}

              {/* High Contrast Total Banner */}
              <div className="rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 text-white dark:from-emerald-950 dark:via-emerald-900 dark:to-teal-950 dark:border dark:border-emerald-800/60 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 dark:text-emerald-300">
                      Total Payable
                    </span>
                    <p className="text-[11px] text-slate-400 dark:text-emerald-400/80">
                      Net Bill
                    </p>
                  </div>
                  <span className="text-2xl xl:text-3xl font-black tabular-nums tracking-tight text-white dark:text-emerald-100">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>

            {blockingIssues.length > 0 && (
              <p className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-500 font-medium">
                <TriangleAlert className="mt-px size-3.5 shrink-0" />
                Reduce highlighted quantities before proceeding.
              </p>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <Button
                className="h-12 w-full text-base font-bold tracking-wide shadow-md bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0 transition-all hover:shadow-lg hover:brightness-105"
                disabled={lines.length === 0 || blockingIssues.length > 0 || isPending}
                onClick={() => setPaymentOpen(true)}
              >
                Complete Payment · {formatCurrency(total)} (F10)
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs font-medium"
                  disabled={lines.length === 0 && !hasHeldSale}
                  onClick={() => (lines.length > 0 ? holdSale() : resumeSale())}
                >
                  {lines.length > 0 ? "Hold Sale (F9)" : hasHeldSale ? "Resume Held (F9)" : "Hold (F9)"}
                </Button>
                {lines.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-destructive font-medium"
                    onClick={resetSale}
                  >
                    Clear Bill
                  </Button>
                )}
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
