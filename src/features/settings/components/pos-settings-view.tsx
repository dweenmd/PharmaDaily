"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Banknote,
  Barcode,
  Boxes,
  Building2,
  Check,
  CheckCircle2,
  Command,
  CreditCard,
  FileText,
  HelpCircle,
  Info,
  Keyboard,
  Maximize2,
  Percent,
  Printer,
  Receipt,
  RotateCcw,
  Save,
  ScanLine,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  Users,
  Volume2,
  Wifi,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Kbd } from "@/components/ui/kbd";
import { saveSettingsBatchAction } from "@/features/settings/actions";

// ---------------------------------------------------------------------------
// KEYBOARD SHORTCUTS SPECIFICATION
// ---------------------------------------------------------------------------

const POS_SHORTCUTS = [
  {
    key: "F2",
    action: "Search",
    description: "Focus the medicine & barcode quick search input",
    category: "Navigation",
  },
  {
    key: "F4",
    action: "Customer",
    description: "Open the patient / customer selector & phone lookup modal",
    category: "Customer",
  },
  {
    key: "F9",
    action: "Payment",
    description: "Trigger checkout settlement modal & payment tender entry",
    category: "Billing",
  },
  {
    key: "F10",
    action: "Hold Sale",
    description: "Park / hold current cart in memory for customer who stepped away",
    category: "Cart",
  },
  {
    key: "Esc",
    action: "Clear",
    description: "Clear active cart selection or dismiss any open dialog modal",
    category: "General",
  },
  {
    key: "F8",
    action: "Discount",
    description: "Apply discretionary percentage or line-item discount",
    category: "Billing",
  },
  {
    key: "F12",
    action: "Quick Cash",
    description: "Instantly complete sale with exact cash tender & print receipt",
    category: "Billing",
  },
];

type Props = {
  initialValues?: Record<string, { value: string; scope: "branch" | "global" }>;
  branchId?: string | null;
  branchName?: string | null;
  isSuperAdmin?: boolean;
};

export function PosSettingsView({
  initialValues = {},
  branchId = null,
  branchName = null,
  isSuperAdmin = true,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  // Form State initialized with defaults or database values
  const [formState, setFormState] = React.useState<Record<string, string>>(() => ({
    // SECTION 1: GENERAL
    pos_default_branch: initialValues["pos_default_branch"]?.value ?? "b-main",
    pos_default_customer: initialValues["pos_default_customer"]?.value ?? "walk_in",
    pos_default_payment_method: initialValues["pos_default_payment_method"]?.value ?? "cash",
    pos_auto_create_customer: initialValues["pos_auto_create_customer"]?.value ?? "true",

    // SECTION 2: BILLING
    invoice_prefix: initialValues["invoice_prefix"]?.value ?? "INV-",
    invoice_sequence_format: initialValues["invoice_sequence_format"]?.value ?? "yearly",
    max_discount_percent: initialValues["max_discount_percent"]?.value ?? "15",
    allow_item_discounts: initialValues["allow_item_discounts"]?.value ?? "true",
    vat_percent: initialValues["vat_percent"]?.value ?? "5.0",
    tax_mode: initialValues["tax_mode"]?.value ?? "inclusive",
    tax_id_number: initialValues["tax_id_number"]?.value ?? "BIN-001298456-0101",
    rounding_rule: initialValues["rounding_rule"]?.value ?? "nearest_integer",

    // SECTION 3: BARCODE
    scanner_mode: initialValues["scanner_mode"]?.value ?? "hid",
    barcode_auto_add: initialValues["barcode_auto_add"]?.value ?? "true",
    barcode_qty_behavior: initialValues["barcode_qty_behavior"]?.value ?? "increment",
    barcode_beep: initialValues["barcode_beep"]?.value ?? "true",
    search_min_chars: initialValues["search_min_chars"]?.value ?? "2",
    search_show_zero_stock: initialValues["search_show_zero_stock"]?.value ?? "true",
    search_fefo_priority: initialValues["search_fefo_priority"]?.value ?? "true",

    // SECTION 4: RECEIPT
    receipt_paper_size: initialValues["receipt_paper_size"]?.value ?? "80mm",
    printer_connection: initialValues["printer_connection"]?.value ?? "browser",
    auto_cut_paper: initialValues["auto_cut_paper"]?.value ?? "true",
    cash_drawer_kick: initialValues["cash_drawer_kick"]?.value ?? "true",
    receipt_footer_text:
      initialValues["receipt_footer_text"]?.value ??
      "Thank you for trusting PharmaDaily. Store medicines in a cool, dry place. Returns accepted within 7 days with receipt.",
    receipt_qr_code: initialValues["receipt_qr_code"]?.value ?? "true",
  }));

  const [hasChanges, setHasChanges] = React.useState(false);

  const handleFieldChange = (key: string, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleReset = () => {
    setFormState((prev) => {
      const reset = { ...prev };
      Object.keys(prev).forEach((k) => {
        if (initialValues[k]?.value) {
          reset[k] = initialValues[k]!.value;
        }
      });
      return reset;
    });
    setHasChanges(false);
    toast.info("POS settings reverted to saved values");
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveSettingsBatchAction(formState, branchId);
      if (result.ok) {
        setHasChanges(false);
        toast.success("POS settings saved successfully", {
          description: branchName
            ? `Settings saved for ${branchName}.`
            : "Settings applied across all retail registers.",
        });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to save POS settings");
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              POINT OF SALE (POS) SETTINGS
            </h2>
            <Badge
              variant="outline"
              className="bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono font-semibold"
            >
              Till Workstation Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure retail cashier terminals, hardware peripherals, billing math, and keyboard shortcuts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={isPending}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              <span>Discard</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending || !hasChanges}
            className={cn(
              "h-8 px-3 text-xs font-semibold cursor-pointer shadow-xs transition-all",
              hasChanges
                ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 animate-pulse"
                : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 opacity-90",
            )}
          >
            {isPending ? <Spinner /> : <Save className="size-3.5 mr-1" />}
            <span>Save POS Settings</span>
          </Button>
        </div>
      </div>

      <div className="space-y-8 max-w-3xl">
        {/* =============================================================== */}
        {/* SECTION 1: GENERAL */}
        {/* =============================================================== */}
        <section className="space-y-4">
          <div className="border-b border-border/30 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Store className="size-3.5 text-muted-foreground" />
              <span>General</span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Default branch assignment, walk-in patient defaults, and primary checkout payment tender.
            </p>
          </div>

          <div className="space-y-4 pt-1">
            {/* Default Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-center">
              <div>
                <Label htmlFor="pos_default_branch" className="text-xs font-semibold text-foreground">
                  Default Branch
                </Label>
                <p className="text-[11px] text-muted-foreground">Operating retail location</p>
              </div>
              <div className="sm:col-span-2">
                <Select
                  value={formState.pos_default_branch}
                  onValueChange={(v) => handleFieldChange("pos_default_branch", v)}
                >
                  <SelectTrigger id="pos_default_branch" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="b-main">Main Central Pharmacy (MAIN)</SelectItem>
                    <SelectItem value="b-dhan">Dhanmondi Branch (DHAN)</SelectItem>
                    <SelectItem value="b-guls">Gulshan Clinic Branch (GULS)</SelectItem>
                    <SelectItem value="b-mirp">Mirpur 10 Branch (MIRP)</SelectItem>
                    <SelectItem value="b-utta">Uttara Sector 7 Branch (UTTA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Default Customer */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-center">
              <div>
                <Label htmlFor="pos_default_customer" className="text-xs font-semibold text-foreground">
                  Default Customer
                </Label>
                <p className="text-[11px] text-muted-foreground">Assigned to counter walk-ins</p>
              </div>
              <div className="sm:col-span-2">
                <Select
                  value={formState.pos_default_customer}
                  onValueChange={(v) => handleFieldChange("pos_default_customer", v)}
                >
                  <SelectTrigger id="pos_default_customer" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk_in">Walk-in Customer (General Counter Sale)</SelectItem>
                    <SelectItem value="cash_retail">Cash Retail Patient (Auto-prompt phone)</SelectItem>
                    <SelectItem value="require_selection">Require Explicit Patient Selection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Default Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-center">
              <div>
                <Label htmlFor="pos_default_payment_method" className="text-xs font-semibold text-foreground">
                  Default Payment Method
                </Label>
                <p className="text-[11px] text-muted-foreground">Highlighted payment tender</p>
              </div>
              <div className="sm:col-span-2">
                <Select
                  value={formState.pos_default_payment_method}
                  onValueChange={(v) => handleFieldChange("pos_default_payment_method", v)}
                >
                  <SelectTrigger id="pos_default_payment_method" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash (Physical till with auto change calculation)</SelectItem>
                    <SelectItem value="bkash">bKash (Merchant digital QR)</SelectItem>
                    <SelectItem value="card">Card / POS Terminal (Visa, Mastercard)</SelectItem>
                    <SelectItem value="nagad">Nagad (MFS Wallet)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* =============================================================== */}
        {/* SECTION 2: BILLING */}
        {/* =============================================================== */}
        <section className="space-y-4">
          <div className="border-b border-border/30 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Receipt className="size-3.5 text-muted-foreground" />
              <span>Billing</span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Invoice numbering series, cashier discount authorization ceilings, tax calculation, and rounding rules.
            </p>
          </div>

          <div className="space-y-4 pt-1">
            {/* Invoice Numbering */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-start">
              <div>
                <Label htmlFor="invoice_prefix" className="text-xs font-semibold text-foreground">
                  Invoice Numbering
                </Label>
                <p className="text-[11px] text-muted-foreground">Series prefix & sequence format</p>
              </div>
              <div className="sm:col-span-2 grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="invoice_prefix" className="text-[11px] text-muted-foreground mb-1 block">
                    Series Prefix
                  </Label>
                  <Input
                    id="invoice_prefix"
                    value={formState.invoice_prefix}
                    onChange={(e) => handleFieldChange("invoice_prefix", e.target.value)}
                    className="h-9 text-xs font-mono uppercase"
                    placeholder="INV-"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground mb-1 block">
                    Sequence Format
                  </Label>
                  <Select
                    value={formState.invoice_sequence_format}
                    onValueChange={(v) => handleFieldChange("invoice_sequence_format", v)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yearly">INV-YYYY-000001 (Yearly)</SelectItem>
                      <SelectItem value="continuous">INV-000001 (Continuous)</SelectItem>
                      <SelectItem value="branch_code">BRANCH-YYYY-000001</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Discount Rules */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-start">
              <div>
                <Label htmlFor="max_discount_percent" className="text-xs font-semibold text-foreground">
                  Discount Rules
                </Label>
                <p className="text-[11px] text-muted-foreground">Discretionary authorization limits</p>
              </div>
              <div className="sm:col-span-2 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="relative w-36">
                    <Input
                      id="max_discount_percent"
                      type="number"
                      min="0"
                      max="100"
                      value={formState.max_discount_percent}
                      onChange={(e) => handleFieldChange("max_discount_percent", e.target.value)}
                      className="h-9 text-xs font-mono pr-7"
                    />
                    <Percent className="absolute right-2.5 top-2.5 size-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Maximum cashier discount without manager approval
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Discounts above {formState.max_discount_percent}% require a manager or super admin PIN authorization.
                </p>
              </div>
            </div>

            {/* Tax Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-start">
              <div>
                <Label htmlFor="vat_percent" className="text-xs font-semibold text-foreground">
                  Tax Settings
                </Label>
                <p className="text-[11px] text-muted-foreground">Value Added Tax (VAT) rate & mode</p>
              </div>
              <div className="sm:col-span-2 grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="vat_percent" className="text-[11px] text-muted-foreground mb-1 block">
                    Default VAT Rate (%)
                  </Label>
                  <div className="relative">
                    <Input
                      id="vat_percent"
                      type="number"
                      step="0.5"
                      value={formState.vat_percent}
                      onChange={(e) => handleFieldChange("vat_percent", e.target.value)}
                      className="h-9 text-xs font-mono pr-7"
                    />
                    <Percent className="absolute right-2.5 top-2.5 size-3.5 text-muted-foreground" />
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] text-muted-foreground mb-1 block">
                    Tax Calculation Mode
                  </Label>
                  <Select
                    value={formState.tax_mode}
                    onValueChange={(v) => handleFieldChange("tax_mode", v)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inclusive">Tax Inclusive (MRP includes VAT)</SelectItem>
                      <SelectItem value="exclusive">Tax Exclusive (Added at checkout)</SelectItem>
                      <SelectItem value="exempt">Exempt (0% VAT for Lifesaving Rx)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Rounding */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-center">
              <div>
                <Label htmlFor="rounding_rule" className="text-xs font-semibold text-foreground">
                  Rounding
                </Label>
                <p className="text-[11px] text-muted-foreground">Bill total decimal rounding rule</p>
              </div>
              <div className="sm:col-span-2">
                <Select
                  value={formState.rounding_rule}
                  onValueChange={(v) => handleFieldChange("rounding_rule", v)}
                >
                  <SelectTrigger id="rounding_rule" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nearest_integer">Round to nearest integer (৳1.00 - Standard Cash)</SelectItem>
                    <SelectItem value="round_down">Round down / truncate paisa (৳0.00)</SelectItem>
                    <SelectItem value="none">No rounding (Exact 2 decimals: ৳124.75)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* =============================================================== */}
        {/* SECTION 3: BARCODE */}
        {/* =============================================================== */}
        <section className="space-y-4">
          <div className="border-b border-border/30 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Barcode className="size-3.5 text-muted-foreground" />
              <span>Barcode</span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Hardware scanner input handling, scan behavior, item auto-add, and search debounce parameters.
            </p>
          </div>

          <div className="space-y-4 pt-1">
            {/* Scanner Input Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-center">
              <div>
                <Label htmlFor="scanner_mode" className="text-xs font-semibold text-foreground">
                  Scanner
                </Label>
                <p className="text-[11px] text-muted-foreground">Input wedge & peripheral mode</p>
              </div>
              <div className="sm:col-span-2">
                <Select
                  value={formState.scanner_mode}
                  onValueChange={(v) => handleFieldChange("scanner_mode", v)}
                >
                  <SelectTrigger id="scanner_mode" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hid">USB / Bluetooth HID Keyboard Wedge (Standard)</SelectItem>
                    <SelectItem value="serial">Virtual COM Port / Serial Scanner</SelectItem>
                    <SelectItem value="camera">Integrated Tablet / Device Camera</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Barcode Behavior */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-center">
              <div>
                <Label htmlFor="barcode_qty_behavior" className="text-xs font-semibold text-foreground">
                  Barcode Behavior
                </Label>
                <p className="text-[11px] text-muted-foreground">Scan trigger reaction</p>
              </div>
              <div className="sm:col-span-2">
                <Select
                  value={formState.barcode_qty_behavior}
                  onValueChange={(v) => handleFieldChange("barcode_qty_behavior", v)}
                >
                  <SelectTrigger id="barcode_qty_behavior" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increment">Instant auto-add and increment quantity by 1</SelectItem>
                    <SelectItem value="prompt">Prompt for custom dispensing quantity / strip count</SelectItem>
                    <SelectItem value="focus_qty">Add item and focus cursor on quantity field</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search Behavior */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-center">
              <div>
                <Label htmlFor="search_min_chars" className="text-xs font-semibold text-foreground">
                  Search Behavior
                </Label>
                <p className="text-[11px] text-muted-foreground">Fast search & batch selection</p>
              </div>
              <div className="sm:col-span-2">
                <Select
                  value={formState.search_min_chars}
                  onValueChange={(v) => handleFieldChange("search_min_chars", v)}
                >
                  <SelectTrigger id="search_min_chars" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">Match on 2 characters (Fastest · FEFO Priority)</SelectItem>
                    <SelectItem value="3">Match on 3 characters (High inventory catalogs)</SelectItem>
                    <SelectItem value="barcode_only">Strict Barcode Matching Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* =============================================================== */}
        {/* SECTION 4: RECEIPT */}
        {/* =============================================================== */}
        <section className="space-y-4">
          <div className="border-b border-border/30 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Printer className="size-3.5 text-muted-foreground" />
              <span>Receipt</span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Thermal receipt roll dimensions, ESC/POS hardware printer connection, and customer receipt footer text.
            </p>
          </div>

          <div className="space-y-4 pt-1">
            {/* Receipt Size */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-center">
              <div>
                <Label htmlFor="receipt_paper_size" className="text-xs font-semibold text-foreground">
                  Receipt Size
                </Label>
                <p className="text-[11px] text-muted-foreground">Print width specification</p>
              </div>
              <div className="sm:col-span-2">
                <Select
                  value={formState.receipt_paper_size}
                  onValueChange={(v) => handleFieldChange("receipt_paper_size", v)}
                >
                  <SelectTrigger id="receipt_paper_size" className="h-9 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80mm">80mm Thermal Paper (Standard POS · Recommended)</SelectItem>
                    <SelectItem value="58mm">58mm Thermal Paper (Compact Mini Till)</SelectItem>
                    <SelectItem value="a4">A4 Full Page Laser / Inkjet Invoice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Printer Connection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-center">
              <div>
                <Label htmlFor="printer_connection" className="text-xs font-semibold text-foreground">
                  Printer
                </Label>
                <p className="text-[11px] text-muted-foreground">Hardware connection protocol</p>
              </div>
              <div className="sm:col-span-2">
                <Select
                  value={formState.printer_connection}
                  onValueChange={(v) => handleFieldChange("printer_connection", v)}
                >
                  <SelectTrigger id="printer_connection" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="browser">Browser Native Print Dialog (Standard)</SelectItem>
                    <SelectItem value="esc_pos">Direct ESC/POS Silent Print (USB / LAN Socket)</SelectItem>
                    <SelectItem value="rawbt">RawBT Bluetooth Print Bridge (Android)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Footer Text */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-start">
              <div>
                <Label htmlFor="receipt_footer_text" className="text-xs font-semibold text-foreground">
                  Footer Text
                </Label>
                <p className="text-[11px] text-muted-foreground">Customer notice at bottom</p>
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Textarea
                  id="receipt_footer_text"
                  rows={2}
                  value={formState.receipt_footer_text}
                  onChange={(e) => handleFieldChange("receipt_footer_text", e.target.value)}
                  className="text-xs resize-none"
                  placeholder="Thank you for choosing PharmaDaily..."
                />
                <p className="text-[11px] text-muted-foreground">
                  Printed at the base of every thermal till receipt.
                </p>
              </div>
            </div>

            {/* Direct Link to Super Admin Receipt Customization */}
            <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  Full Header & Footer Customization
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Customize pharmacy name, DGDA drug lic, VAT BIN, return policy terms, and live thermal preview.
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="text-xs h-8 shrink-0">
                <Link href="/settings">Open Printing Workspace</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* =============================================================== */}
        {/* SECTION 5: KEYBOARD SHORTCUTS */}
        {/* =============================================================== */}
        <section className="space-y-4">
          <div className="border-b border-border/30 pb-2 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Keyboard className="size-3.5 text-muted-foreground" />
                <span>Keyboard Shortcuts</span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                High-speed cashier shortcut hotkeys configured for standard USB and programmable POS keyboards.
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              Live in POS Terminal
            </Badge>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 divide-y divide-border/40 overflow-hidden">
            {POS_SHORTCUTS.map((shortcut) => (
              <div
                key={shortcut.key}
                className="p-3 flex items-center justify-between hover:bg-muted/40 transition-colors text-xs"
              >
                <div className="flex items-center gap-3">
                  <Kbd className="h-6 min-w-8 font-mono font-bold text-xs bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-0 shadow-xs">
                    {shortcut.key}
                  </Kbd>
                  <div>
                    <span className="font-semibold text-foreground">{shortcut.action}</span>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {shortcut.description}
                    </p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className="font-mono text-[9px] text-muted-foreground uppercase px-1.5 py-0"
                >
                  {shortcut.category}
                </Badge>
              </div>
            ))}
          </div>

          <div className="p-3 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg border border-border/60 text-xs text-muted-foreground flex items-start gap-2.5">
            <Info className="size-4 text-zinc-500 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              These keybinds are globally active inside the PharmaDaily POS Terminal (<span className="font-mono">/pos</span>) when not editing numeric inputs. Pressing <Kbd className="h-4 text-[10px]">Esc</Kbd> always cancels modal overlays and restores cursor focus to the item barcode scanner.
            </p>
          </div>
        </section>

        {/* Bottom Save Bar */}
        <div className="pt-4 border-t border-border/40 flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground">
            {hasChanges ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                Unsaved modifications in POS configuration
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" />
                All POS parameters synchronized
              </span>
            )}
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isPending || !hasChanges}
            className="h-9 px-4 text-xs font-semibold bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 cursor-pointer shadow-xs"
          >
            {isPending ? <Spinner /> : <Save className="size-3.5 mr-1.5" />}
            <span>Save Changes</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
