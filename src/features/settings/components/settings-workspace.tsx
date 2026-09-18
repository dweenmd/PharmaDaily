"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeftRight,
  Banknote,
  Bell,
  Boxes,
  Building,
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  Cpu,
  Download,
  FileText,
  Globe,
  HelpCircle,
  Image as ImageIcon,
  Info,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Monitor,
  Package,
  Phone,
  Pill,
  Power,
  Printer,
  Receipt,
  RefreshCw,
  RotateCcw,
  Save,
  ScrollText,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Sliders,
  Store,
  Trash2,
  Truck,
  Upload,
  UserCheck,
  Users,
  Wifi,
  WifiOff,
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
import { saveSettingsBatchAction } from "@/features/settings/actions";
import { PosSettingsView } from "./pos-settings-view";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export type SettingsTabId =
  | "pharmacy"
  | "branches"
  | "pos"
  | "inventory"
  | "sales"
  | "payments"
  | "security"
  | "notifications"
  | "printing"
  | "offline"
  | "system";

type NavItem = {
  id: SettingsTabId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

const SETTINGS_NAV_ITEMS: NavItem[] = [
  { id: "pharmacy", label: "Pharmacy", description: "Identity, licensing & contact", icon: Store },
  { id: "branches", label: "Branches", description: "Outlet scope & operational hours", icon: Building2 },
  { id: "pos", label: "POS", description: "Till checkout & barcode scanner", icon: ShoppingCart },
  { id: "inventory", label: "Inventory", description: "Reorder levels & expiry alerts", icon: Boxes },
  { id: "sales", label: "Sales", description: "Discounts, invoicing & tax", icon: Receipt },
  { id: "payments", label: "Payments", description: "Cash, MFS gateways & card POS", icon: CreditCard },
  { id: "security", label: "Users & Security", description: "RBAC, sessions & audit logging", icon: ShieldCheck },
  { id: "notifications", label: "Notifications", description: "SMS alerts & daily digest", icon: Bell },
  { id: "printing", label: "Printing", description: "Receipt layout & paper sizes", icon: Printer },
  { id: "offline", label: "Offline & Sync", description: "Local cache & background sync", icon: WifiOff },
  { id: "system", label: "System", description: "Backup & maintenance policies", icon: Sliders },
];

type Props = {
  initialValues: Record<string, { value: string; scope: "branch" | "global" }>;
  branchId: string | null;
  branchName: string | null;
  isSuperAdmin: boolean;
  initialTab?: SettingsTabId;
};

export function SettingsWorkspace({
  initialValues,
  branchId,
  branchName,
  isSuperAdmin,
  initialTab = "pharmacy",
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<SettingsTabId>(initialTab);
  const [isPending, startTransition] = React.useTransition();

  // Form State initialized with defaults or database values
  const [formState, setFormState] = React.useState<Record<string, string>>(() => ({
    // Pharmacy Info
    pharmacy_name: initialValues["pharmacy_name"]?.value ?? "PharmaDaily Central Pharmacy Ltd.",
    pharmacy_logo: initialValues["pharmacy_logo"]?.value ?? "",
    pharmacy_phone: initialValues["pharmacy_phone"]?.value ?? "+880 1711-000111",
    pharmacy_email: initialValues["pharmacy_email"]?.value ?? "contact@pharmadaily.com.bd",
    pharmacy_address: initialValues["pharmacy_address"]?.value ?? "House 42, Road 11, Block D, Banani, Dhaka-1213, Bangladesh",
    pharmacy_license: initialValues["pharmacy_license"]?.value ?? "DGDA-DL-2024-98421",

    // Inventory & Clinical
    near_expiry_days: initialValues["near_expiry_days"]?.value ?? "90",
    low_stock_multiplier: initialValues["low_stock_multiplier"]?.value ?? "1.0",

    // Sales & POS
    max_discount_percent: initialValues["max_discount_percent"]?.value ?? "15",
    receipt_paper_size: initialValues["receipt_paper_size"]?.value ?? "80mm",
    vat_percent: initialValues["vat_percent"]?.value ?? "5.0",
    invoice_prefix: initialValues["invoice_prefix"]?.value ?? "INV-",

    // Printing
    receipt_footer_text: initialValues["receipt_footer_text"]?.value ?? "Thank you for trusting PharmaDaily. Get well soon!",
    auto_cut_paper: initialValues["auto_cut_paper"]?.value ?? "true",

    // Payments
    enable_bkash: initialValues["enable_bkash"]?.value ?? "true",
    enable_nagad: initialValues["enable_nagad"]?.value ?? "true",
    enable_card: initialValues["enable_card"]?.value ?? "true",

    // Offline & Sync
    sync_interval_seconds: initialValues["sync_interval_seconds"]?.value ?? "30",
    offline_mode_enabled: initialValues["offline_mode_enabled"]?.value ?? "true",
  }));

  const [hasChanges, setHasChanges] = React.useState(false);

  // Field change handler
  const handleFieldChange = (key: string, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Reset to initial
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
    toast.info("Settings reverted to saved values");
  };

  // Save changes
  const handleSave = () => {
    startTransition(async () => {
      const result = await saveSettingsBatchAction(formState, branchId);
      if (result.ok) {
        setHasChanges(false);
        toast.success("Settings saved successfully", {
          description: branchName
            ? `Settings saved for ${branchName}.`
            : "Settings applied across all branches without local overrides.",
        });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to save settings");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* 1. HEADER */}
      {/* =================================================================== */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Settings
            </h1>
            <Badge
              variant="outline"
              className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-[10px] tracking-wider uppercase font-semibold px-2 py-0.5 border-zinc-300 dark:border-zinc-700"
            >
              Enterprise Config
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "font-mono text-[10px] uppercase font-semibold px-2 py-0.5",
                isSuperAdmin
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                  : "bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800",
              )}
            >
              {isSuperAdmin ? "Chain-Wide Scope" : `Branch Scope: ${branchName ?? "Local"}`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {isSuperAdmin
              ? "Global organization profile, billing defaults, and multi-branch infrastructure configuration."
              : `Branch settings for ${branchName ?? "your branch"}. Unchanged values inherit chain-wide defaults.`}
          </p>
        </div>

        {/* Top Action Controls */}
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={isPending}
              className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              <span>Discard Changes</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending || !hasChanges}
            className={cn(
              "h-9 gap-1.5 text-xs font-semibold cursor-pointer shadow-xs transition-all",
              hasChanges
                ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 animate-pulse"
                : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 opacity-90",
            )}
          >
            {isPending ? <Spinner /> : <Save className="size-3.5" />}
            <span>Save Changes</span>
          </Button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. CLEAN SETTINGS WORKSPACE (Left: Nav | Right: Content) */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* ----------------------------------------------------------------- */}
        {/* LEFT VERTICAL SETTINGS NAVIGATION (3 cols on md) */}
        {/* ----------------------------------------------------------------- */}
        <nav className="md:col-span-4 lg:col-span-3 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-1.5 mb-1">
            System Workspace
          </div>

          <div className="space-y-0.5">
            {SETTINGS_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between group cursor-pointer",
                    isActive
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        isActive
                          ? "text-white dark:text-zinc-950"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {isActive && (
                    <span className="size-1.5 rounded-full bg-emerald-400 dark:bg-emerald-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-4 px-3">
            <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground text-[11px] block">
                Chainwide Defaults
              </span>
              <p className="text-[11px] leading-relaxed">
                Changes made here propagate to retail POS registers and stock ledgers across all operating outlets.
              </p>
            </div>
          </div>
        </nav>

        {/* ----------------------------------------------------------------- */}
        {/* RIGHT CONTENT: CLEAN WORKSPACE CANVAS (8-9 cols on md) */}
        {/* ----------------------------------------------------------------- */}
        <div className="md:col-span-8 lg:col-span-9 bg-card border border-border/70 rounded-xl shadow-xs overflow-hidden">
          {/* =============================================================== */}
          {/* TAB 1: PHARMACY INFORMATION (Primary Focus) */}
          {/* =============================================================== */}
          {activeTab === "pharmacy" && (
            <div className="p-6 space-y-6">
              {/* Section Header */}
              <div className="border-b border-border/40 pb-4 space-y-1">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  PHARMACY INFORMATION
                </h2>
                <p className="text-xs text-muted-foreground">
                  General organizational identity, legal registration credentials, and customer-facing receipt details.
                </p>
              </div>

              {/* Form Fields Workspace */}
              <div className="space-y-6 max-w-2xl">
                {/* 1. Pharmacy Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="pharmacy_name" className="text-xs font-semibold text-foreground">
                    Pharmacy Name
                  </Label>
                  <Input
                    id="pharmacy_name"
                    value={formState.pharmacy_name}
                    onChange={(e) => handleFieldChange("pharmacy_name", e.target.value)}
                    placeholder="e.g. PharmaDaily Central Pharmacy Ltd."
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Appears prominently on invoice headers, customer receipts, and tax certificates.
                  </p>
                </div>

                {/* 2. Logo */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">
                    Logo
                  </Label>
                  <div className="flex items-start gap-4 p-4 rounded-lg border border-border/60 bg-muted/20">
                    <div className="size-16 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold flex items-center justify-center text-xl shrink-0 shadow-xs">
                      P
                    </div>

                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            toast.info("Logo uploader triggered", {
                              description: "Select a PNG, SVG, or WEBP image file.",
                            });
                          }}
                          className="h-8 text-xs font-semibold cursor-pointer border-border/80"
                        >
                          <Upload className="size-3.5 mr-1.5" />
                          <span>Upload New Logo</span>
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            handleFieldChange("pharmacy_logo", "");
                            toast.success("Logo reset to default monogram");
                          }}
                          className="h-8 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <Trash2 className="size-3.5 mr-1" />
                          <span>Remove</span>
                        </Button>
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Recommended: Transparent PNG or SVG format, at least 256×256px. Max file size: 2MB. Printed on POS thermal receipts and A4 invoices.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Contact Channels (Phone & Email) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="pharmacy_phone" className="text-xs font-semibold text-foreground">
                      Phone
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                      <Input
                        id="pharmacy_phone"
                        type="tel"
                        value={formState.pharmacy_phone}
                        onChange={(e) => handleFieldChange("pharmacy_phone", e.target.value)}
                        placeholder="+880 1711-000111"
                        className="h-9 pl-8 text-xs font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Helpline number printed on customer receipts.
                    </p>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="pharmacy_email" className="text-xs font-semibold text-foreground">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                      <Input
                        id="pharmacy_email"
                        type="email"
                        value={formState.pharmacy_email}
                        onChange={(e) => handleFieldChange("pharmacy_email", e.target.value)}
                        placeholder="contact@pharmadaily.com.bd"
                        className="h-9 pl-8 text-xs font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Official administrative and billing correspondence.
                    </p>
                  </div>
                </div>

                {/* 4. Address */}
                <div className="space-y-1.5">
                  <Label htmlFor="pharmacy_address" className="text-xs font-semibold text-foreground">
                    Address
                  </Label>
                  <Textarea
                    id="pharmacy_address"
                    rows={3}
                    value={formState.pharmacy_address}
                    onChange={(e) => handleFieldChange("pharmacy_address", e.target.value)}
                    placeholder="Street Address, Area, City, Postal Code"
                    className="text-xs resize-none"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Official business premises location registered with the regulatory council.
                  </p>
                </div>

                {/* 5. License Number */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pharmacy_license" className="text-xs font-semibold text-foreground">
                      License Number
                    </Label>
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono border-emerald-300 font-semibold"
                    >
                      DGDA Registered
                    </Badge>
                  </div>
                  <div className="relative">
                    <FileText className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                    <Input
                      id="pharmacy_license"
                      value={formState.pharmacy_license}
                      onChange={(e) => handleFieldChange("pharmacy_license", e.target.value)}
                      placeholder="e.g. DGDA-DL-2024-98421"
                      className="h-9 pl-8 text-xs font-mono uppercase tracking-wider"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Directorate General of Drug Administration (DGDA) retail drug license registration number.
                  </p>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                  <div className="text-[11px] text-muted-foreground">
                    {hasChanges ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        ● Unsaved modifications in workspace
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ All pharmacy details synchronized
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
          )}

          {/* =============================================================== */}
          {/* TAB 2: BRANCHES */}
          {/* =============================================================== */}
          {activeTab === "branches" && (
            <div className="p-6 space-y-6">
              <div className="border-b border-border/40 pb-4 space-y-1">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  BRANCH & MULTI-OUTLET CONFIGURATION
                </h2>
                <p className="text-xs text-muted-foreground">
                  Default operating parameters, inter-branch stock visibility, and data partitioning policies.
                </p>
              </div>

              <div className="space-y-4 max-w-2xl">
                <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                  <span className="text-xs font-semibold text-foreground block">
                    Multi-Branch Row-Level Security (RLS)
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tenant isolation guarantees that cashiers and stock managers only view transactions, register floats, and inventory belonging strictly to their assigned physical outlet.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Default Transfer Approval Policy</Label>
                  <Select defaultValue="manager_approval">
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager_approval">Require Destination Manager Approval</SelectItem>
                      <SelectItem value="auto_accept">Auto-Accept Direct Transfers</SelectItem>
                      <SelectItem value="head_office">Require Central Head Office Authorization</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 3: POS */}
          {/* =============================================================== */}
          {activeTab === "pos" && (
            <div className="p-6">
              <PosSettingsView
                initialValues={initialValues}
                branchId={branchId}
                branchName={branchName}
                isSuperAdmin={isSuperAdmin}
              />
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 4: INVENTORY */}
          {/* =============================================================== */}
          {activeTab === "inventory" && (
            <div className="p-6 space-y-6">
              <div className="border-b border-border/40 pb-4 space-y-1">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  INVENTORY & REORDER THRESHOLDS
                </h2>
                <p className="text-xs text-muted-foreground">
                  Near-expiry warning parameters, low-stock multipliers, and shelf-life monitoring.
                </p>
              </div>

              <div className="space-y-4 max-w-2xl">
                <div className="space-y-1.5">
                  <Label htmlFor="near_expiry_days" className="text-xs font-semibold">
                    Near-Expiry Warning Window (Days)
                  </Label>
                  <Input
                    id="near_expiry_days"
                    type="number"
                    value={formState.near_expiry_days}
                    onChange={(e) => handleFieldChange("near_expiry_days", e.target.value)}
                    className="h-9 text-xs font-mono w-40"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Batches expiring within this number of days are highlighted in FEFO audit reports (Standard: 90 days).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="low_stock_multiplier" className="text-xs font-semibold">
                    Low-Stock Sensitivity Multiplier
                  </Label>
                  <Input
                    id="low_stock_multiplier"
                    type="number"
                    step="0.1"
                    value={formState.low_stock_multiplier}
                    onChange={(e) => handleFieldChange("low_stock_multiplier", e.target.value)}
                    className="h-9 text-xs font-mono w-40"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Multiplies each medicine reorder level. Above 1 flags stock earlier; below 1 waits longer.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 5: SALES */}
          {/* =============================================================== */}
          {activeTab === "sales" && (
            <div className="p-6 space-y-6">
              <div className="border-b border-border/40 pb-4 space-y-1">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  SALES, TAX & DISCOUNTS
                </h2>
                <p className="text-xs text-muted-foreground">
                  Discount authorization ceilings, value-added tax (VAT) rates, and invoice numbering.
                </p>
              </div>

              <div className="space-y-4 max-w-2xl">
                <div className="space-y-1.5">
                  <Label htmlFor="max_discount_percent" className="text-xs font-semibold">
                    Max Discretionary Discount Before Manager Approval (%)
                  </Label>
                  <Input
                    id="max_discount_percent"
                    type="number"
                    value={formState.max_discount_percent}
                    onChange={(e) => handleFieldChange("max_discount_percent", e.target.value)}
                    className="h-9 text-xs font-mono w-40"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Cashiers can apply discounts up to this ceiling. Discounts above require managerial PIN override.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invoice_prefix" className="text-xs font-semibold">
                    Invoice Series Prefix
                  </Label>
                  <Input
                    id="invoice_prefix"
                    value={formState.invoice_prefix}
                    onChange={(e) => handleFieldChange("invoice_prefix", e.target.value)}
                    className="h-9 text-xs font-mono uppercase w-40"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Prefix stamped ahead of sequential bill numbers (e.g. INV-2025-0001).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 6: PAYMENTS */}
          {/* =============================================================== */}
          {activeTab === "payments" && (
            <div className="p-6 space-y-6">
              <div className="border-b border-border/40 pb-4 space-y-1">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  PAYMENT METHODS & GATEWAYS
                </h2>
                <p className="text-xs text-muted-foreground">
                  Accepted tender types, Mobile Financial Services (bKash, Nagad), and POS card terminals.
                </p>
              </div>

              <div className="space-y-3 max-w-2xl">
                {[
                  { name: "Cash Settlement", desc: "Physical currency in cash drawer with auto till reconciliation", enabled: true, locked: true },
                  { name: "bKash Merchant Payment", desc: "QR scan and USSD transaction ID capture", enabled: true },
                  { name: "Nagad Merchant Payment", desc: "Digital wallet payment verification", enabled: true },
                  { name: "Bank Card / POS Terminal", desc: "Visa, Mastercard, and UnionPay card swipe / EMV chip", enabled: true },
                  { name: "Customer Due / Credit Ledger", desc: "Allows trusted account customers to settle balance monthly", enabled: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3.5 rounded-lg border border-border/60 bg-muted/10">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-foreground">{item.name}</span>
                      <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold border-emerald-300">
                      Active Tender
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 7: USERS & SECURITY */}
          {/* =============================================================== */}
          {activeTab === "security" && (
            <div className="p-6 space-y-6">
              <div className="border-b border-border/40 pb-4 space-y-1">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  USERS, AUTHENTICATION & SECURITY
                </h2>
                <p className="text-xs text-muted-foreground">
                  Session lifetimes, lockouts, password rules, and audit retention policies.
                </p>
              </div>

              <div className="space-y-4 max-w-2xl">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Idle Session Timeout</Label>
                  <Select defaultValue="30_min">
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15_min">15 Minutes</SelectItem>
                      <SelectItem value="30_min">30 Minutes (Recommended)</SelectItem>
                      <SelectItem value="60_min">1 Hour</SelectItem>
                      <SelectItem value="end_of_shift">End of Shift (Manual logout only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Failed Login Attempt Lockout</Label>
                  <Select defaultValue="5_attempts">
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3_attempts">3 Attempts (Strict)</SelectItem>
                      <SelectItem value="5_attempts">5 Attempts (Standard)</SelectItem>
                      <SelectItem value="10_attempts">10 Attempts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 8: NOTIFICATIONS */}
          {/* =============================================================== */}
          {activeTab === "notifications" && (
            <div className="p-6 space-y-6">
              <div className="border-b border-border/40 pb-4 space-y-1">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  ALERTS & NOTIFICATIONS
                </h2>
                <p className="text-xs text-muted-foreground">
                  Automated SMS triggers, manager alerts, and end-of-day sales reports.
                </p>
              </div>

              <div className="space-y-3 max-w-2xl">
                <div className="p-3.5 rounded-lg border border-border/60 bg-muted/10 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold">Critical Stockout SMS to Branch Manager</span>
                    <p className="text-[11px] text-muted-foreground">Dispatches SMS alert when fast-moving medicines reach zero stock.</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300">Enabled</Badge>
                </div>

                <div className="p-3.5 rounded-lg border border-border/60 bg-muted/10 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold">Daily Sales & Cash Summary Email</span>
                    <p className="text-[11px] text-muted-foreground">Dispatches daily Z-report audit trail to business owners at 11:59 PM.</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300">Enabled</Badge>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 9: PRINTING */}
          {/* =============================================================== */}
          {activeTab === "printing" && (
            <div className="p-6 space-y-6">
              <div className="border-b border-border/40 pb-4 space-y-1">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  RECEIPT PRINTER & LAYOUT
                </h2>
                <p className="text-xs text-muted-foreground">
                  Hardware ESC/POS printer formats, thermal paper sizes, and receipt branding notes.
                </p>
              </div>

              <div className="space-y-4 max-w-2xl">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Thermal Paper Width</Label>
                  <Select
                    value={formState.receipt_paper_size}
                    onValueChange={(val) => handleFieldChange("receipt_paper_size", val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58mm">58mm Thermal Receipt (Compact)</SelectItem>
                      <SelectItem value="80mm">80mm Thermal Receipt (Standard POS)</SelectItem>
                      <SelectItem value="a4">A4 Full Page Laser / Inkjet Invoice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="receipt_footer_text" className="text-xs font-semibold">
                    Receipt Footer Message
                  </Label>
                  <Input
                    id="receipt_footer_text"
                    value={formState.receipt_footer_text}
                    onChange={(e) => handleFieldChange("receipt_footer_text", e.target.value)}
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Printed at the bottom of every customer cash receipt.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 10: OFFLINE & SYNC */}
          {/* =============================================================== */}
          {activeTab === "offline" && (
            <div className="p-6 space-y-6">
              <div className="border-b border-border/40 pb-4 space-y-1">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  OFFLINE CAPABILITIES & QUEUE SYNC
                </h2>
                <p className="text-xs text-muted-foreground">
                  Local browser IndexedDB caching, background synchronization, and conflict resolution.
                </p>
              </div>

              <div className="space-y-4 max-w-2xl">
                <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Wifi className="size-4 text-emerald-500" />
                    <span>Progressive Web App (PWA) Offline Engine Active</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Even during complete internet outages, POS registers queue sales transactions locally in IndexedDB and synchronize them automatically once connectivity is restored.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Background Sync Frequency</Label>
                  <Select defaultValue="30">
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">Every 10 Seconds (Aggressive)</SelectItem>
                      <SelectItem value="30">Every 30 Seconds (Standard)</SelectItem>
                      <SelectItem value="60">Every 60 Seconds (Bandwidth saver)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 11: SYSTEM */}
          {/* =============================================================== */}
          {activeTab === "system" && (
            <div className="p-6 space-y-6">
              <div className="border-b border-border/40 pb-4 space-y-1">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  SYSTEM, MAINTENANCE & BACKUPS
                </h2>
                <p className="text-xs text-muted-foreground">
                  Audit log retention windows, database maintenance schedules, and server telemetry.
                </p>
              </div>

              <div className="space-y-4 max-w-2xl">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Audit Log Retention Policy</Label>
                  <Select defaultValue="365">
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="180">6 Months (180 Days)</SelectItem>
                      <SelectItem value="365">1 Year (365 Days · Regulatory Standard)</SelectItem>
                      <SelectItem value="730">2 Years (730 Days)</SelectItem>
                      <SelectItem value="forever">Permanent (Never Delete)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Release Channel & Updates</Label>
                  <div className="p-3 rounded-lg border border-border/60 bg-muted/10 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold">PharmaDaily Core v2.4.0 (Enterprise)</div>
                      <div className="text-[11px] text-muted-foreground font-mono">Build 2026.09.19 · Production Stable</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">Up to Date</Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
