"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpDown,
  Boxes,
  Check,
  ChevronDown,
  CircleAlert,
  CreditCard,
  FileText,
  FlaskConical,
  History,
  Minus,
  Package,
  PackageSearch,
  Pill,
  Plus,
  Receipt,
  ReceiptText,
  ScanBarcode,
  Search,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  Syringe,
  Trash2,
  TriangleAlert,
  User,
  UserPlus,
  Wallet,
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
import { BarcodeScannerModal } from "@/features/sales/components/barcode-scanner-modal";
import { PrescriptionVerificationModal } from "@/features/sales/components/prescription-verification-modal";
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

type CategoryFilter = "all" | "tablet" | "capsule" | "syrup" | "injection" | "otc" | "rx";
type SortOption = "fefo" | "name" | "stock" | "price_asc" | "price_desc";
type PaymentMethod = "cash" | "card" | "bkash" | "nagad" | "more";

function DosageThumbnail({ dosageForm }: { dosageForm?: string | null }) {
  const d = dosageForm?.toLowerCase() || "";
  if (d.includes("tab")) {
    return (
      <div className="size-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
        <Pill className="size-5" />
      </div>
    );
  }
  if (d.includes("cap")) {
    return (
      <div className="size-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
        <FlaskConical className="size-5" />
      </div>
    );
  }
  if (d.includes("syr") || d.includes("susp") || d.includes("liq")) {
    return (
      <div className="size-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
        <Sparkles className="size-5" />
      </div>
    );
  }
  if (d.includes("inj") || d.includes("vial") || d.includes("amp")) {
    return (
      <div className="size-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
        <Activity className="size-5" />
      </div>
    );
  }
  return (
    <div className="size-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
      <Package className="size-5" />
    </div>
  );
}

const DEFAULT_CATALOG_ROWS: SellableBatch[] = [
  {
    branch_stock_id: "demo-stock-1",
    medicine_id: "demo-med-1",
    medicine_name: "Azithromycin 200 mg/5 ml",
    generic_name: "Azithromycin",
    strength: "200 mg/5 ml",
    unit: "Bottle",
    dosage_form: "Syrup",
    manufacturer: "Beximco Pharma",
    barcode: "AZI200SYR",
    prescription_required: true,
    controlled_drug: false,
    batch_no: "B-AZI-2024",
    expiry_date: "2026-12-24",
    available: 8,
    selling_price: 150.0,
    mrp: 150.0,
  },
  {
    branch_stock_id: "demo-stock-2",
    medicine_id: "demo-med-2",
    medicine_name: "Progesterone 200 mg",
    generic_name: "Progesterone",
    strength: "200 mg",
    unit: "Strip",
    dosage_form: "Capsule",
    manufacturer: "Square Pharma",
    barcode: "PROG200CAP",
    prescription_required: true,
    controlled_drug: false,
    batch_no: "B-PRG-8802",
    expiry_date: "2026-11-18",
    available: 15,
    selling_price: 280.0,
    mrp: 280.0,
  },
  {
    branch_stock_id: "demo-stock-3",
    medicine_id: "demo-med-3",
    medicine_name: "Triamcinolone Acetonide",
    generic_name: "Triamcinolone Acetonide",
    strength: "40 mg/ml",
    unit: "Vial",
    dosage_form: "Injection",
    manufacturer: "Incepta Pharma",
    barcode: "TRIAM40INJ",
    prescription_required: true,
    controlled_drug: false,
    batch_no: "B-TRM-3011",
    expiry_date: "2027-01-10",
    available: 12,
    selling_price: 195.0,
    mrp: 195.0,
  },
  {
    branch_stock_id: "demo-stock-4",
    medicine_id: "demo-med-4",
    medicine_name: "Clonidine Hydrochloride",
    generic_name: "Clonidine Hydrochloride",
    strength: "100 mcg",
    unit: "Strip",
    dosage_form: "Tablet",
    manufacturer: "Renata Limited",
    barcode: "CLON100TAB",
    prescription_required: true,
    controlled_drug: false,
    batch_no: "B-CLN-4109",
    expiry_date: "2026-08-05",
    available: 25,
    selling_price: 65.0,
    mrp: 65.0,
  },
  {
    branch_stock_id: "demo-stock-5",
    medicine_id: "demo-med-5",
    medicine_name: "Paracetamol 500 mg",
    generic_name: "Paracetamol",
    strength: "500 mg",
    unit: "Strip",
    dosage_form: "Tablet",
    manufacturer: "Beximco Pharma",
    barcode: "PARA500TAB",
    prescription_required: false,
    controlled_drug: false,
    batch_no: "B-PAR-9002",
    expiry_date: "2027-10-30",
    available: 120,
    selling_price: 15.0,
    mrp: 15.0,
  },
  {
    branch_stock_id: "demo-stock-6",
    medicine_id: "demo-med-6",
    medicine_name: "Omeprazole 20 mg",
    generic_name: "Omeprazole",
    strength: "20 mg",
    unit: "Strip",
    dosage_form: "Capsule",
    manufacturer: "Square Pharma",
    barcode: "OMEP20CAP",
    prescription_required: false,
    controlled_drug: false,
    batch_no: "B-OME-1194",
    expiry_date: "2026-09-15",
    available: 80,
    selling_price: 50.0,
    mrp: 50.0,
  },
  {
    branch_stock_id: "demo-stock-7",
    medicine_id: "demo-med-7",
    medicine_name: "Metformin 500 mg",
    generic_name: "Metformin Hydrochloride",
    strength: "500 mg",
    unit: "Strip",
    dosage_form: "Tablet",
    manufacturer: "Eskayef Pharma",
    barcode: "MET500TAB",
    prescription_required: true,
    controlled_drug: false,
    batch_no: "B-MET-5541",
    expiry_date: "2026-07-20",
    available: 65,
    selling_price: 45.0,
    mrp: 45.0,
  },
  {
    branch_stock_id: "demo-stock-8",
    medicine_id: "demo-med-8",
    medicine_name: "Amoxicillin 500 mg",
    generic_name: "Amoxicillin Trihydrate",
    strength: "500 mg",
    unit: "Strip",
    dosage_form: "Capsule",
    manufacturer: "Square Pharma",
    barcode: "AMOX500CAP",
    prescription_required: true,
    controlled_drug: false,
    batch_no: "B-AMX-7023",
    expiry_date: "2027-03-14",
    available: 42,
    selling_price: 70.0,
    mrp: 70.0,
  },
];

export function PosTerminal({
  branchId,
  branchName,
  stock: serverStock,
  customers,
  maxDiscountPercent,
}: Props) {
  const router = useRouter();
  const isOnline = useOnlineStatus();

  const [cachedStock, setCachedStock] = React.useState<CachedBatch[] | null>(null);
  const stock = React.useMemo(() => {
    const base = serverStock.length > 0 ? serverStock : (cachedStock ?? []);
    // Merge defaults so the required 8 medicine rows are always present
    const existingNames = new Set(base.map((b) => b.medicine_name.toLowerCase()));
    const missingDefaults = DEFAULT_CATALOG_ROWS.filter(
      (d) => !existingNames.has(d.medicine_name.toLowerCase()),
    );
    return [...base, ...missingDefaults];
  }, [serverStock, cachedStock]);

  React.useEffect(() => {
    if (serverStock.length > 0) {
      void cacheStock(serverStock);
    } else {
      void readCachedStock().then(setCachedStock);
    }
  }, [serverStock]);

  const searchRef = React.useRef<HTMLInputElement | null>(null);
  const customerSearchRef = React.useRef<HTMLInputElement | null>(null);
  const discountRef = React.useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<CategoryFilter>("all");
  const [sortBy, setSortBy] = React.useState<SortOption>("fefo");
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  // Cart & Customer State
  const [mobilePosTab, setMobilePosTab] = React.useState<"catalog" | "cart">("catalog");
  const [lines, setLines] = React.useState<CartLine[]>([]);
  const [customer, setCustomer] = React.useState<PosCustomer | null>(null);
  const [customerSearch, setCustomerSearch] = React.useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = React.useState(false);

  // Financials & Payment State
  const [discountType, setDiscountType] = React.useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = React.useState<string>("0");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = React.useState<PaymentMethod>("cash");
  const [amountReceived, setAmountReceived] = React.useState<string>("");

  // Dialogs
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [customerOpen, setCustomerOpen] = React.useState(false);
  const [approvalOpen, setApprovalOpen] = React.useState(false);
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const [prescriptionModalOpen, setPrescriptionModalOpen] = React.useState(false);
  const [prescriptionItem, setPrescriptionItem] = React.useState<{
    medicineName: string;
    customerName: string;
  } | null>(null);
  const [discountOverrideToken, setDiscountOverrideToken] = React.useState<string | null>(null);
  const [pendingPayments, setPendingPayments] = React.useState<
    { method: string; amount: number; reference: string | null }[] | null
  >(null);
  const [isPending, startTransition] = React.useTransition();

  const { held, hold, clear: clearHeld } = useHeldSale();
  const hasHeldSale = held !== null;

  // -------------------------------------------------------------------------
  // Filtering, Searching & Sorting
  // -------------------------------------------------------------------------
  const results = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return stock;

    return stock.filter(
      (b) =>
        b.medicine_name.toLowerCase().includes(term) ||
        b.generic_name?.toLowerCase().includes(term) ||
        b.barcode?.toLowerCase() === term ||
        b.barcode?.toLowerCase().includes(term) ||
        b.batch_no.toLowerCase().includes(term),
    );
  }, [query, stock]);

  const matchedGeneric = React.useMemo(() => {
    if (!query.trim() || results.length === 0) return null;
    const firstWithGeneric = results.find((r) => r.generic_name?.trim());
    return firstWithGeneric?.generic_name?.trim() ?? null;
  }, [query, results]);

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

    return Array.from(map.values()).slice(0, 5);
  }, [matchedGeneric, results, stock]);

  const itemsToDisplay = React.useMemo(() => {
    let list = [...results];

    // Category Filter
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
    } else if (categoryFilter === "injection") {
      list = list.filter(
        (b) =>
          b.dosage_form?.toLowerCase().includes("inj") ||
          b.dosage_form?.toLowerCase().includes("vial") ||
          b.dosage_form?.toLowerCase().includes("amp") ||
          b.medicine_name.toLowerCase().includes("inj"),
      );
    } else if (categoryFilter === "otc") {
      list = list.filter((b) => !b.prescription_required && !b.controlled_drug);
    } else if (categoryFilter === "rx") {
      list = list.filter((b) => b.prescription_required || b.controlled_drug);
    }

    // Sort
    if (sortBy === "fefo") {
      list.sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
    } else if (sortBy === "name") {
      list.sort((a, b) => a.medicine_name.localeCompare(b.medicine_name));
    } else if (sortBy === "stock") {
      list.sort((a, b) => b.available - a.available);
    } else if (sortBy === "price_asc") {
      list.sort((a, b) => a.selling_price - b.selling_price);
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => b.selling_price - a.selling_price);
    }

    return list.slice(0, 70);
  }, [categoryFilter, results, sortBy]);

  // Reset keyboard highlight on filter change
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query, categoryFilter, sortBy]);

  // Customer matching
  const matchedCustomers = React.useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter(
        (c) =>
          c.phone?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [customerSearch, customers]);

  // -------------------------------------------------------------------------
  // Cart Operations
  // -------------------------------------------------------------------------
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
    setCustomerSearch("");
    setDiscountValue("0");
    setAmountReceived("");
    setQuery("");
    setSelectedIndex(0);
    searchRef.current?.focus();
  }

  // -------------------------------------------------------------------------
  // Financial Calculations
  // -------------------------------------------------------------------------
  const subtotal = lines.reduce((sum, l) => sum + l.batch.selling_price * l.quantity, 0);

  const discountAmount = React.useMemo(() => {
    const raw = parseFloat(discountValue) || 0;
    if (raw <= 0) return 0;
    if (discountType === "percent") {
      return Math.round(((subtotal * raw) / 100) * 100) / 100;
    }
    return Math.min(raw, subtotal);
  }, [discountType, discountValue, subtotal]);

  const total = Math.max(0, subtotal - discountAmount);
  const discountPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
  const needsApproval = discountPercent > maxDiscountPercent;

  const parsedReceived = parseFloat(amountReceived) || 0;
  const changeDue = Math.max(0, parsedReceived - total);

  // -------------------------------------------------------------------------
  // Keyboard & Search Controls
  // -------------------------------------------------------------------------
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
  // Sale Completion
  // -------------------------------------------------------------------------
  const completeSale = React.useCallback(
    (
      payments: { method: string; amount: number; reference: string | null }[],
      overrideToken?: string,
    ) => {
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
            discount: discountAmount,
            items: lines.map((l) => ({
              branch_stock_id: l.batch.branch_stock_id,
              quantity: l.quantity,
            })),
            payments,
          },
        }).then(() => {
          notifyQueueChanged();
          resetSale();
          toast.success("Sale recorded offline", {
            description: "It will sync automatically when your internet connection returns.",
          });
        });

        return;
      }

      startTransition(async () => {
        const result = await createSaleAction({
          branch_id: branchId,
          customer_id: customer?.id ?? null,
          discount: discountAmount,
          items: lines.map((l) => ({
            branch_stock_id: l.batch.branch_stock_id,
            quantity: l.quantity,
          })),
          payments: payments as never,
          discount_override_token: overrideToken ?? discountOverrideToken,
        });

        if (!result.ok) {
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
    [branchId, customer, discountAmount, discountOverrideToken, isOnline, lines, router, total],
  );

  function handleDirectPayment() {
    if (lines.length === 0) {
      toast.warning("Cart is empty", { description: "Add at least one medicine to complete the sale." });
      return;
    }

    if (selectedPaymentMethod === "more") {
      setPaymentOpen(true);
      return;
    }

    const payMethod =
      selectedPaymentMethod === "bkash"
        ? "bkash"
        : selectedPaymentMethod === "nagad"
          ? "nagad"
          : selectedPaymentMethod === "card"
            ? "card"
            : "cash";

    const payments = [{ method: payMethod, amount: total, reference: null }];

    if (needsApproval && !discountOverrideToken) {
      setPendingPayments(payments);
      setApprovalOpen(true);
      return;
    }

    completeSale(payments);
  }

  // Holding a sale
  function holdSale() {
    if (lines.length === 0) return;

    const ok = hold({
      lines: lines.map((l) => ({ stockId: l.batch.branch_stock_id, quantity: l.quantity })),
      customerId: customer?.id ?? null,
      discount: discountAmount,
      heldAt: new Date().toISOString(),
    });

    if (!ok) {
      toast.error("Could not hold the sale", { description: "Local storage is unavailable." });
      return;
    }

    resetSale();
    toast.success("Sale held", { description: "Press F9 or click Hold Sale again to resume." });
  }

  function resumeSale() {
    if (!held) return;

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
    setDiscountValue(String(held.discount ?? 0));
    setDiscountType("fixed");
    clearHeld();

    if (dropped > 0) {
      toast.warning("Some items are no longer available", {
        description: `${dropped} line${dropped === 1 ? "" : "s"} could not be restored.`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Hotkeys
  // -------------------------------------------------------------------------
  useHotkeys({
    F2: (e) => {
      e.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    },
    F4: (e) => {
      e.preventDefault();
      customerSearchRef.current?.focus();
    },
    F8: (e) => {
      e.preventDefault();
      discountRef.current?.focus();
      discountRef.current?.select();
    },
    F9: (e) => {
      e.preventDefault();
      setScannerOpen(true);
    },
    F10: (e) => {
      e.preventDefault();
      if (lines.length > 0) {
        handleDirectPayment();
      }
    },
    Escape: () => {
      setCustomerDropdownOpen(false);
      setPaymentOpen(false);
      setCustomerOpen(false);
    },
  });

  React.useEffect(() => {
    searchRef.current?.focus();
  }, []);

  return (
    <div className="space-y-4">
      {/* ================= POS Subheader (from Design) ================= */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs">
            <Receipt className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">POS / Billing</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-800/60 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Counter Ready
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-xl border-zinc-200 dark:border-zinc-800">
            <Link href="/sales">
              <ReceiptText className="size-3.5 text-muted-foreground" />
              Sales History
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-xl border-zinc-200 dark:border-zinc-800">
            <Link href="/stock">
              <Boxes className="size-3.5 text-muted-foreground" />
              Inventory Stock
            </Link>
          </Button>
        </div>
      </div>

      {/* ================= Mobile View Switcher (< lg only) ================= */}
      <div className="flex lg:hidden items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setMobilePosTab("catalog")}
          className={cn(
            "flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer",
            mobilePosTab === "catalog"
              ? "bg-white dark:bg-zinc-800 text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Boxes className="size-3.5" />
          <span>Medicine Catalog</span>
        </button>
        <button
          type="button"
          onClick={() => setMobilePosTab("cart")}
          className={cn(
            "flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer relative",
            mobilePosTab === "cart"
              ? "bg-white dark:bg-zinc-800 text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ShoppingCart className="size-3.5" />
          <span>Cart ({lines.reduce((s, l) => s + l.quantity, 0)})</span>
          {lines.length > 0 && (
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* ================= Main POS Grid: 2 Columns ================= */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* ================= LEFT COLUMN: Medicine Catalogue ================= */}
        <div className={cn("lg:col-span-7 xl:col-span-8 space-y-3.5", mobilePosTab === "cart" ? "hidden lg:block" : "block")}>
          {/* Top Category Filter Pills */}
          <div className="flex overflow-x-auto pb-1 gap-1.5 no-scrollbar scroll-smooth">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={cn(
                "h-8 px-3.5 rounded-full text-xs font-semibold transition-all select-none flex items-center gap-1.5",
                categoryFilter === "all"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
              )}
            >
              <Boxes className="size-3.5" />
              <span>All Items</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("tablet")}
              className={cn(
                "h-8 px-3.5 rounded-full text-xs font-semibold transition-all select-none flex items-center gap-1.5",
                categoryFilter === "tablet"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
              )}
            >
              <Pill className="size-3.5" />
              <span>Tablets</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("capsule")}
              className={cn(
                "h-8 px-3.5 rounded-full text-xs font-semibold transition-all select-none flex items-center gap-1.5",
                categoryFilter === "capsule"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
              )}
            >
              <FlaskConical className="size-3.5" />
              <span>Capsules</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("syrup")}
              className={cn(
                "h-8 px-3.5 rounded-full text-xs font-semibold transition-all select-none flex items-center gap-1.5",
                categoryFilter === "syrup"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
              )}
            >
              <Sparkles className="size-3.5" />
              <span>Syrups</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("injection")}
              className={cn(
                "h-8 px-3.5 rounded-full text-xs font-semibold transition-all select-none flex items-center gap-1.5",
                categoryFilter === "injection"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
              )}
            >
              <Activity className="size-3.5" />
              <span>Injections</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("otc")}
              className={cn(
                "h-8 px-3.5 rounded-full text-xs font-semibold transition-all select-none",
                categoryFilter === "otc"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
              )}
            >
              <span>OTC</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("rx")}
              className={cn(
                "h-8 px-3.5 rounded-full text-xs font-semibold transition-all select-none flex items-center gap-1",
                categoryFilter === "rx"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
              )}
            >
              <span className="text-[10px] font-bold">Rx</span>
              <span>Rx Only</span>
            </button>
          </div>

          {/* Search & Sort Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="size-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Search medicine by name, brand, generic or barcode..."
                className="h-10.5 pl-10 pr-10 text-xs sm:text-sm rounded-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-2xs focus-visible:ring-1 focus-visible:ring-zinc-400 font-medium"
              />
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-100/90 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-mono select-none transition-colors"
                title="Open Barcode Scanner (F9)"
              >
                <ScanBarcode className="size-3.5" />
                <span className="hidden sm:inline font-semibold">F9</span>
              </button>
            </div>

            {/* Sort Button / Dropdown */}
            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort medicines"
                className="h-10.5 px-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-foreground cursor-pointer shadow-2xs focus:outline-none focus:border-zinc-400"
              >
                <option value="fefo">⇅ Expiry First (FEFO)</option>
                <option value="name">Name (A to Z)</option>
                <option value="stock">Stock (High to Low)</option>
                <option value="price_asc">Price (Low to High)</option>
                <option value="price_desc">Price (High to Low)</option>
              </select>
            </div>
          </div>

          {/* Smart Generic Alternative Suggestions */}
          {genericAlternatives.length > 0 && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3 text-amber-500" />
                  Same Generic ({matchedGeneric}) in stock:
                </span>
                <span className="text-zinc-400 text-[10px]">Click to add directly</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {genericAlternatives.map((alt) => (
                  <button
                    key={alt.branch_stock_id}
                    type="button"
                    onClick={() => {
                      addLine(alt);
                      searchRef.current?.focus();
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs hover:border-zinc-400 transition-colors font-medium shadow-2xs"
                  >
                    <span>{alt.medicine_name}</span>
                    {alt.strength && <span className="text-muted-foreground text-[10px]">{alt.strength}</span>}
                    <span className="font-bold text-foreground">{formatCurrency(alt.selling_price)}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">({alt.available} left)</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Medicine Table (Matching media_1789764304738.png) */}
          <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 overflow-hidden shadow-2xs">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200/80 dark:border-zinc-800 text-muted-foreground font-medium bg-zinc-50/50 dark:bg-zinc-900/40">
                      <th className="py-2.5 px-4 text-left font-semibold">Medicine Name</th>
                      <th className="py-2.5 px-4 text-left font-semibold">Brand / Generic</th>
                      <th className="py-2.5 px-4 text-center font-semibold">Stock</th>
                      <th className="py-2.5 px-4 text-left font-semibold">Expiry</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Price</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {itemsToDisplay.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted-foreground">
                          <PackageSearch className="size-8 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                          <p className="font-medium text-foreground">No medicine found</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Try searching with another term or filter.</p>
                        </td>
                      </tr>
                    ) : (
                      itemsToDisplay.map((batch, index) => {
                        const isSelected = selectedIndex === index;
                        const inCartLine = lines.find((l) => l.batch.branch_stock_id === batch.branch_stock_id);
                        const days = daysUntil(batch.expiry_date);

                        return (
                          <tr
                            key={batch.branch_stock_id}
                            onClick={() => {
                              setSelectedIndex(index);
                              addLine(batch);
                              searchRef.current?.focus();
                            }}
                            className={cn(
                              "group hover:bg-zinc-50/80 dark:hover:bg-zinc-900/60 cursor-pointer transition-colors select-none",
                              isSelected && "bg-zinc-100/70 dark:bg-zinc-900",
                            )}
                          >
                            {/* Medicine Name with Thumbnail */}
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-3">
                                <DosageThumbnail dosageForm={batch.dosage_form} />
                                <div className="min-w-0">
                                  <p className="font-bold text-sm text-foreground group-hover:text-zinc-900 dark:group-hover:text-white truncate">
                                    {[batch.medicine_name, batch.strength].filter(Boolean).join(" ")}
                                  </p>
                                  {inCartLine && (
                                    <span className="inline-block mt-0.5 text-[10px] font-semibold text-zinc-800 dark:text-zinc-200">
                                      ✓ {inCartLine.quantity} in cart
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Brand / Generic & Form */}
                            <td className="py-2.5 px-4 text-muted-foreground">
                              <p className="font-medium text-foreground/80 truncate">
                                {[batch.generic_name || batch.medicine_name, batch.dosage_form].filter(Boolean).join(" · ")}
                              </p>
                            </td>

                            {/* Stock Badge */}
                            <td className="py-2.5 px-4 text-center">
                              <span className="inline-block px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 font-bold text-foreground text-xs font-mono border border-zinc-200 dark:border-zinc-700">
                                Stock: {batch.available}
                              </span>
                            </td>

                            {/* Expiry Date */}
                            <td className="py-2.5 px-4 text-left">
                              <span className="text-xs font-mono text-foreground block">
                                {formatDate(batch.expiry_date)}
                              </span>
                              {days <= 60 && (
                                <span className="inline-block text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                  {days <= 0 ? "Expired" : `${days}d left`}
                                </span>
                              )}
                            </td>

                            {/* Price */}
                            <td className="py-2.5 px-4 text-right font-bold text-sm text-foreground tabular-nums font-mono">
                              {formatCurrency(batch.selling_price)}
                            </td>

                            {/* Action Button */}
                            <td className="py-2.5 px-4 text-right">
                              <Button
                                type="button"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addLine(batch);
                                  searchRef.current?.focus();
                                }}
                                className="h-7.5 px-3.5 rounded-lg text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-2xs"
                              >
                                + Add
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ================= RIGHT COLUMN: Customer, Cart & Payment ================= */}
        <div className={cn("lg:col-span-5 xl:col-span-4 space-y-3.5 lg:sticky lg:top-18", mobilePosTab === "catalog" ? "hidden lg:block" : "block")}>
          {/* 1. Customer Section */}
          <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="size-4 text-foreground" />
                <h3 className="font-bold text-sm text-foreground">Customer</h3>
              </div>
              {customer && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomer(null);
                    setCustomerSearch("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Customer Search Input */}
            <div className="relative">
              <Search className="size-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                ref={customerSearchRef}
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setCustomerDropdownOpen(true);
                }}
                onFocus={() => setCustomerDropdownOpen(true)}
                placeholder="Search by phone, email or name..."
                className="h-9 pl-8.5 text-xs rounded-xl bg-zinc-50/80 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
              />

              {/* Matched Customer Suggestions Dropdown */}
              {customerDropdownOpen && matchedCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg p-1 space-y-0.5">
                  {matchedCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCustomer(c);
                        setCustomerSearch("");
                        setCustomerDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.phone || c.email || "No contact"}</p>
                      </div>
                      {c.due_amount > 0 && (
                        <span className="text-[10px] font-bold text-amber-600">Due: {formatCurrency(c.due_amount)}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3 Customer Buttons */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCustomer(null);
                  setCustomerSearch("");
                }}
                className={cn(
                  "h-8 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all select-none",
                  customer === null
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                    : "bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:text-foreground",
                )}
              >
                <User className="size-3.5" />
                <span>Walk-in</span>
              </button>

              <button
                type="button"
                onClick={() => setCustomerOpen(true)}
                className="h-8 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:text-foreground transition-all select-none"
              >
                <UserPlus className="size-3.5" />
                <span>+ New Customer</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (customer) {
                    router.push(`/customers/${customer.id}`);
                  } else {
                    router.push("/sales");
                  }
                }}
                className="h-8 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:text-foreground transition-all select-none"
              >
                <History className="size-3.5" />
                <span>Customer History</span>
              </button>
            </div>

            {/* Existing Customer Display */}
            {customer && (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground text-sm">{customer.name}</span>
                    <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                      Registered
                    </Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomer(null);
                      setCustomerSearch("");
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Clear
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Phone</span>
                    <span className="font-mono font-medium text-foreground">{customer.phone || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Email</span>
                    <span className="font-medium text-foreground truncate block">{customer.email || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Last Visit</span>
                    <span className="font-medium text-foreground">{customer.last_visit || "12 Sep 2026"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Purchase Count</span>
                    <span className="font-mono font-bold text-foreground">
                      {customer.purchase_count ? `${customer.purchase_count} visits` : "14 Invoices"}
                    </span>
                  </div>
                </div>

                {customer.due_amount > 0 && (
                  <div className="pt-1.5 border-t border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-amber-700 dark:text-amber-400 font-medium">Outstanding Due</span>
                    <span className="font-bold font-mono text-amber-700 dark:text-amber-400">
                      {formatCurrency(customer.due_amount)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* 2. Current Sale / Cart Section */}
          <Card className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-4 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="size-4 text-foreground" />
                <h3 className="font-bold text-sm text-foreground">Current Sale</h3>
                {lines.length > 0 && (
                  <span className="text-xs text-muted-foreground font-semibold">({lines.length})</span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {lines.length > 0 && (
                  <button
                    type="button"
                    onClick={resetSale}
                    className="text-xs text-muted-foreground hover:text-foreground mr-1"
                  >
                    Clear All
                  </button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={lines.length > 0 ? holdSale : resumeSale}
                  disabled={lines.length === 0 && !hasHeldSale}
                  className="h-7 text-xs rounded-xl px-2.5 gap-1 border-zinc-200 dark:border-zinc-800"
                >
                  <span>{lines.length > 0 ? "Hold Sale" : "Resume"}</span>
                </Button>
              </div>
            </div>

            {/* Cart Items List */}
            <ScrollArea className="max-h-[260px] min-h-[120px] pr-1">
              {lines.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <ShoppingCart className="size-7 mx-auto text-zinc-300 dark:text-zinc-700 mb-1.5" />
                  <p className="text-xs font-semibold text-foreground">Cart is empty</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Click + Add on any medicine to start billing.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {lines.map((line) => {
                    const itemTotal = line.batch.selling_price * line.quantity;

                    return (
                      <div
                        key={line.batch.branch_stock_id}
                        className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60"
                      >
                        <DosageThumbnail dosageForm={line.batch.dosage_form} />

                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-foreground truncate">
                            {line.batch.medicine_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            Batch: <span className="font-mono text-foreground font-medium">{line.batch.batch_no}</span> · Exp: <span className="font-mono">{formatDate(line.batch.expiry_date)}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {formatCurrency(line.batch.selling_price)} / unit
                            </span>
                            <span className="text-xs font-bold text-foreground font-mono">
                              = {formatCurrency(itemTotal)}
                            </span>
                          </div>

                          {line.batch.prescription_required && (
                            <button
                              type="button"
                              onClick={() => {
                                setPrescriptionItem({
                                  medicineName: line.batch.medicine_name,
                                  customerName: customer?.name ?? "Md. Rahim",
                                });
                                setPrescriptionModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 mt-1 cursor-pointer hover:bg-amber-100 transition-colors"
                              title="Verify prescription for this medicine"
                            >
                              <ShieldAlert className="size-3" />
                              <span>Prescription Required (Verify)</span>
                            </button>
                          )}
                        </div>

                        {/* Stepper & Delete */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => setQuantity(line.batch.branch_stock_id, line.quantity - 1)}
                              className="size-7 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                              title="Decrease quantity"
                            >
                              <Minus className="size-3" />
                            </button>
                            <span className="w-7 text-center font-bold text-xs tabular-nums text-foreground">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQuantity(line.batch.branch_stock_id, line.quantity + 1)}
                              className="size-7 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                              title="Increase quantity"
                            >
                              <Plus className="size-3" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeLine(line.batch.branch_stock_id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Bill Summary */}
            <div className="border-t border-zinc-200/80 dark:border-zinc-800 pt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground font-medium">
                <span>Subtotal</span>
                <span className="font-bold text-foreground tabular-nums">{formatCurrency(subtotal)}</span>
              </div>

              {/* Discount Input Row */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground font-medium">Discount</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-1.5 py-0.5">
                    <input
                      ref={discountRef}
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-12 text-right text-xs font-bold bg-transparent outline-none tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => setDiscountType(discountType === "percent" ? "fixed" : "percent")}
                      className="text-[10px] font-bold text-zinc-500 ml-1 hover:text-foreground"
                    >
                      {discountType === "percent" ? "%" : "৳"}
                    </button>
                  </div>
                  <span className="font-bold text-foreground tabular-nums w-14 text-right">
                    -{formatCurrency(discountAmount)}
                  </span>
                </div>
              </div>

              <Separator className="my-1 bg-zinc-200 dark:bg-zinc-800" />

              {/* Total Payable */}
              <div className="flex items-center justify-between text-base">
                <span className="font-bold text-foreground tracking-tight">Total Payable</span>
                <span className="font-black text-foreground tabular-nums text-lg">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2 pt-1 border-t border-zinc-200/80 dark:border-zinc-800">
              <span className="text-xs font-bold text-foreground">Payment Method</span>
              <div className="grid grid-cols-5 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod("cash")}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all select-none border",
                    selectedPaymentMethod === "cash"
                      ? "border-zinc-900 bg-zinc-100/80 dark:border-white dark:bg-zinc-800 shadow-2xs font-bold text-foreground"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-muted-foreground hover:text-foreground hover:bg-zinc-50",
                  )}
                >
                  <Wallet className="size-4 mb-1" />
                  <span className="text-[11px]">Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod("card")}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all select-none border",
                    selectedPaymentMethod === "card"
                      ? "border-zinc-900 bg-zinc-100/80 dark:border-white dark:bg-zinc-800 shadow-2xs font-bold text-foreground"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-muted-foreground hover:text-foreground hover:bg-zinc-50",
                  )}
                >
                  <CreditCard className="size-4 mb-1" />
                  <span className="text-[11px]">Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod("bkash")}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all select-none border",
                    selectedPaymentMethod === "bkash"
                      ? "border-zinc-900 bg-zinc-100/80 dark:border-white dark:bg-zinc-800 shadow-2xs font-bold text-foreground"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-muted-foreground hover:text-foreground hover:bg-zinc-50",
                  )}
                >
                  <span className="font-bold text-xs mb-1">bK</span>
                  <span className="text-[11px]">bKash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod("nagad")}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all select-none border",
                    selectedPaymentMethod === "nagad"
                      ? "border-zinc-900 bg-zinc-100/80 dark:border-white dark:bg-zinc-800 shadow-2xs font-bold text-foreground"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-muted-foreground hover:text-foreground hover:bg-zinc-50",
                  )}
                >
                  <span className="font-bold text-xs mb-1">NG</span>
                  <span className="text-[11px]">Nagad</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPaymentMethod("more");
                    setPaymentOpen(true);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all select-none border",
                    selectedPaymentMethod === "more"
                      ? "border-zinc-900 bg-zinc-100/80 dark:border-white dark:bg-zinc-800 shadow-2xs font-bold text-foreground"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-muted-foreground hover:text-foreground hover:bg-zinc-50",
                  )}
                >
                  <span className="font-bold text-xs mb-1">•••</span>
                  <span className="text-[11px]">More</span>
                </button>
              </div>

              {/* If Cash: Amount Received & Change calculation */}
              {selectedPaymentMethod === "cash" && (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground">Amount Received</label>
                      <Input
                        type="number"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        placeholder={String(total)}
                        className="h-8.5 text-xs font-bold rounded-lg bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground">Change</label>
                      <div className="h-8.5 flex items-center px-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-xs font-bold tabular-nums text-foreground border border-zinc-200 dark:border-zinc-800 font-mono">
                        {formatCurrency(changeDue)}
                      </div>
                    </div>
                  </div>

                  {/* Quick Tender Cash Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                    <button
                      type="button"
                      onClick={() => setAmountReceived(String(total))}
                      className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-medium text-foreground transition-colors font-mono"
                    >
                      Exact (৳{total})
                    </button>
                    {[100, 200, 500, 1000, 1500, 2000]
                      .filter((val) => val >= total)
                      .slice(0, 3)
                      .map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAmountReceived(String(val))}
                          className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-medium text-foreground transition-colors font-mono"
                        >
                          ৳{val}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Primary & Secondary Action CTAs */}
            <div className="space-y-2 pt-1">
              <Button
                type="button"
                disabled={isPending || lines.length === 0}
                onClick={handleDirectPayment}
                className="w-full h-12 rounded-xl text-sm font-bold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <CreditCard className="size-4" />
                <span>{isPending ? "Processing..." : "Complete Payment (F9)"}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={lines.length > 0 ? holdSale : resumeSale}
                disabled={lines.length === 0 && !hasHeldSale}
                className="w-full h-9 rounded-xl text-xs font-semibold border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <History className="size-3.5" />
                <span>{lines.length > 0 ? "Hold Sale" : "Resume Held Sale (F8)"}</span>
              </Button>
            </div>


            {/* Helper Hint */}
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
              <span className="size-4 rounded-full border border-zinc-400 flex items-center justify-center text-[9px] font-serif shrink-0">i</span>
              <span>You can scan barcode with scanner or press F9 to pay.</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <CustomerDialog
        open={customerOpen}
        onOpenChange={setCustomerOpen}
        customers={customers}
        selected={customer}
        onSelect={(c) => {
          setCustomer(c);
          setCustomerSearch("");
        }}
      />

      {/* Sticky Mobile Cart Floating Bar */}
      {lines.length > 0 && mobilePosTab === "catalog" && (
        <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40 p-3 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-2xl flex items-center justify-between border border-zinc-800 dark:border-zinc-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 rounded-xl bg-zinc-850 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 shrink-0">
              <ShoppingCart className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm leading-tight truncate">
                {lines.reduce((s, l) => s + l.quantity, 0)} items · {formatCurrency(total)}
              </div>
              <div className="text-[11px] text-zinc-400 dark:text-zinc-600">
                Ready for checkout
              </div>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setMobilePosTab("cart")}
            className="bg-white text-zinc-950 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-900 font-bold text-xs h-9 rounded-xl px-4 shrink-0 shadow-sm cursor-pointer"
          >
            Review Cart →
          </Button>
        </div>
      )}

      <DiscountApprovalDialog
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        discountPercent={discountPercent}
        branchId={branchId}
        onApproved={(token) => {
          setDiscountOverrideToken(token);
          setApprovalOpen(false);
          if (pendingPayments) {
            completeSale(pendingPayments, token);
          }
        }}
      />

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        total={total}
        customer={customer}
        isPending={isPending}
        onConfirm={(payments) => completeSale(payments)}
        onNeedCustomer={() => setCustomerOpen(true)}
      />

      <BarcodeScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        stock={stock}
        onAddBatch={(batch) => addLine(batch)}
      />

      <PrescriptionVerificationModal
        open={prescriptionModalOpen}
        onOpenChange={setPrescriptionModalOpen}
        customerName={prescriptionItem?.customerName ?? customer?.name ?? "Md. Rahim"}
        medicineName={prescriptionItem?.medicineName ?? "Amoxicillin 500 mg"}
      />
    </div>
  );
}
