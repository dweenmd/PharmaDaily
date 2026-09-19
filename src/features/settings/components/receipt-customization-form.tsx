"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Barcode,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  FileText,
  HelpCircle,
  Info,
  Phone,
  Printer,
  Receipt,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  PosThermalReceipt,
  type PosReceiptData,
} from "@/features/sales/components/pos-thermal-receipt";
import { printThermalReceipt } from "@/features/sales/lib/print-thermal-receipt";

type Props = {
  initialValues?: Record<string, { value: string; scope: "branch" | "global" }>;
  branchId?: string | null;
  branchName?: string | null;
  isSuperAdmin?: boolean;
};

export function ReceiptCustomizationForm({
  initialValues = {},
  branchId = null,
  branchName = null,
  isSuperAdmin = true,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const [formState, setFormState] = React.useState<Record<string, string>>(() => ({
    // Paper & Hardware
    receipt_paper_size: initialValues["receipt_paper_size"]?.value ?? "80mm",

    // Header Customization
    receipt_header_name:
      initialValues["receipt_header_name"]?.value ??
      initialValues["pharmacy_name"]?.value ??
      "PharmaDaily Pharmacy",
    receipt_header_tagline:
      initialValues["receipt_header_tagline"]?.value ?? "Govt. Approved Model Pharmacy",
    receipt_header_address:
      initialValues["receipt_header_address"]?.value ??
      initialValues["pharmacy_address"]?.value ??
      "742 Satmasjid Road, Dhanmondi, Dhaka",
    receipt_header_phone:
      initialValues["receipt_header_phone"]?.value ??
      initialValues["pharmacy_phone"]?.value ??
      "+880 1700-000000",
    receipt_header_drug_lic:
      initialValues["receipt_header_drug_lic"]?.value ??
      initialValues["pharmacy_license"]?.value ??
      "DL-DHK-2024-8891",
    receipt_header_bin:
      initialValues["receipt_header_bin"]?.value ??
      initialValues["tax_id_number"]?.value ??
      "002391029-0101",
    receipt_header_email:
      initialValues["receipt_header_email"]?.value ??
      initialValues["pharmacy_email"]?.value ??
      "support@pharmadaily.com",

    // Footer Customization
    receipt_footer_thank_you:
      initialValues["receipt_footer_thank_you"]?.value ?? "*** THANK YOU · GET WELL SOON ***",
    receipt_footer_return_policy:
      initialValues["receipt_footer_return_policy"]?.value ??
      initialValues["receipt_footer_text"]?.value ??
      "Returns accepted within 7 days with original receipt. Cold-chain items & cut strips are non-returnable.",
    receipt_footer_helpline:
      initialValues["receipt_footer_helpline"]?.value ?? "+880 1700-000000",
    receipt_footer_tagline:
      initialValues["receipt_footer_tagline"]?.value ?? "PharmaDaily Cloud POS",

    // Display Toggles
    receipt_show_barcode: initialValues["receipt_show_barcode"]?.value ?? "true",
    receipt_show_batch_expiry: initialValues["receipt_show_batch_expiry"]?.value ?? "true",
    receipt_show_customer_info: initialValues["receipt_show_customer_info"]?.value ?? "true",
    receipt_show_cashier_info: initialValues["receipt_show_cashier_info"]?.value ?? "true",
    receipt_show_amount_in_words: initialValues["receipt_show_amount_in_words"]?.value ?? "true",
  }));

  const [hasChanges, setHasChanges] = React.useState(false);
  const [previewPaper, setPreviewPaper] = React.useState<"80mm" | "58mm">(
    formState.receipt_paper_size === "58mm" ? "58mm" : "80mm"
  );

  const handleFieldChange = (key: string, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);

    if (key === "receipt_paper_size" && (value === "80mm" || value === "58mm")) {
      setPreviewPaper(value);
    }
  };

  const handleToggle = (key: string) => {
    const current = formState[key] !== "false";
    handleFieldChange(key, current ? "false" : "true");
  };

  const handleResetDefaults = () => {
    setFormState({
      receipt_paper_size: "80mm",
      receipt_header_name: "PharmaDaily Pharmacy",
      receipt_header_tagline: "Govt. Approved Model Pharmacy",
      receipt_header_address: "742 Satmasjid Road, Dhanmondi, Dhaka",
      receipt_header_phone: "+880 1700-000000",
      receipt_header_drug_lic: "DL-DHK-2024-8891",
      receipt_header_bin: "002391029-0101",
      receipt_header_email: "support@pharmadaily.com",
      receipt_footer_thank_you: "*** THANK YOU · GET WELL SOON ***",
      receipt_footer_return_policy:
        "Returns accepted within 7 days with original receipt. Cold-chain items & cut strips are non-returnable.",
      receipt_footer_helpline: "+880 1700-000000",
      receipt_footer_tagline: "PharmaDaily Cloud POS",
      receipt_show_barcode: "true",
      receipt_show_batch_expiry: "true",
      receipt_show_customer_info: "true",
      receipt_show_cashier_info: "true",
      receipt_show_amount_in_words: "true",
    });
    setPreviewPaper("80mm");
    setHasChanges(true);
    toast.info("Form populated with standard pharmacy defaults");
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveSettingsBatchAction(formState, branchId);
      if (result.ok) {
        setHasChanges(false);
        toast.success("Receipt header & footer saved successfully", {
          description: branchName
            ? `Print settings updated for ${branchName}.`
            : "Thermal receipt customization applied across all POS registers.",
        });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to save print settings");
      }
    });
  };

  // Construct dynamic sample receipt based on live formState
  const sampleReceipt: PosReceiptData = React.useMemo(() => {
    return {
      invoice_no: "BR-HQ-00231",
      date_time: "19/09/2026 11:30 AM",
      branch_name: formState.receipt_header_name || "PharmaDaily Pharmacy",
      branch_tagline: formState.receipt_header_tagline || null,
      branch_address: formState.receipt_header_address || null,
      branch_phone: formState.receipt_header_phone || null,
      branch_email: formState.receipt_header_email || null,
      bin_no: formState.receipt_header_bin || null,
      drug_lic: formState.receipt_header_drug_lic || null,
      cashier_name: "Karim",
      counter: "Counter 01",
      customer_name: "Md. Rahim",
      customer_phone: "01711-234567",
      items: [
        {
          name: "Napa Extra 500mg/65mg",
          dosage_form: "Tablet",
          batch_no: "B-202603",
          expiry_date: "12/2027",
          quantity: 20,
          unit_price: 2.5,
          total: 50,
        },
        {
          name: "Amoxicillin 500mg Cap",
          dosage_form: "Capsule",
          batch_no: "AMX-9921",
          expiry_date: "08/2027",
          quantity: 10,
          unit_price: 12.0,
          total: 120,
        },
        {
          name: "Sergel 20mg Capsule",
          dosage_form: "Capsule",
          batch_no: "SRG-4410",
          expiry_date: "05/2028",
          quantity: 15,
          unit_price: 8.0,
          total: 120,
        },
      ],
      subtotal: 290,
      discount: 29,
      tax: 0,
      grand_total: 261,
      amount_in_words: "Two Hundred Sixty-One Taka Only",
      payment_method: "Cash",
      amount_received: 300,
      change: 39,
      footer_thank_you: formState.receipt_footer_thank_you,
      footer_return_policy: formState.receipt_footer_return_policy,
      footer_helpline: formState.receipt_footer_helpline,
      footer_tagline: formState.receipt_footer_tagline,
      show_barcode: formState.receipt_show_barcode !== "false",
      show_batch_expiry: formState.receipt_show_batch_expiry !== "false",
      show_customer_info: formState.receipt_show_customer_info !== "false",
      show_cashier_info: formState.receipt_show_cashier_info !== "false",
      show_amount_in_words: formState.receipt_show_amount_in_words !== "false",
    };
  }, [formState]);

  const handleTestPrint = () => {
    printThermalReceipt(sampleReceipt, previewPaper);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">
              Thermal Receipt Customization
            </h2>
            <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
              Super Admin Control
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure header legal credentials, branch address, return policy footer, and item display switches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            className="text-xs h-8"
          >
            <RotateCcw className="size-3.5 mr-1" />
            Reset Defaults
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isPending || !hasChanges}
            className="text-xs h-8 font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            {isPending ? <Spinner className="mr-1" /> : <Save className="size-3.5 mr-1" />}
            Save Print Settings
          </Button>
        </div>
      </div>

      {/* 2-Column Grid: Form Controls (Left) & Live Receipt Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: 7 columns on LG */}
        <div className="lg:col-span-7 space-y-6">
          {/* SECTION 1: HEADER CUSTOMIZATION */}
          <div className="rounded-xl border border-border/70 p-4 space-y-4 bg-card shadow-2xs">
            <div className="border-b border-border/40 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Store className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>1. Header & Official Legal Credentials</span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Printed prominently at the top of every customer receipt slip.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="receipt_header_name" className="text-xs font-semibold">
                  Pharmacy Trading Name
                </Label>
                <Input
                  id="receipt_header_name"
                  value={formState.receipt_header_name}
                  onChange={(e) => handleFieldChange("receipt_header_name", e.target.value)}
                  placeholder="e.g. PharmaDaily Central Pharmacy"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="receipt_header_tagline" className="text-xs font-semibold">
                  Store Tagline / Subtitle (Optional)
                </Label>
                <Input
                  id="receipt_header_tagline"
                  value={formState.receipt_header_tagline}
                  onChange={(e) => handleFieldChange("receipt_header_tagline", e.target.value)}
                  placeholder="e.g. Govt. Approved Model Medicine Shop"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="receipt_header_address" className="text-xs font-semibold">
                  Physical Branch Address
                </Label>
                <Input
                  id="receipt_header_address"
                  value={formState.receipt_header_address}
                  onChange={(e) => handleFieldChange("receipt_header_address", e.target.value)}
                  placeholder="e.g. 742 Satmasjid Road, Dhanmondi, Dhaka"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="receipt_header_phone" className="text-xs font-semibold">
                  Hotline / Contact Phone
                </Label>
                <Input
                  id="receipt_header_phone"
                  value={formState.receipt_header_phone}
                  onChange={(e) => handleFieldChange("receipt_header_phone", e.target.value)}
                  placeholder="e.g. +880 1700-000000"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="receipt_header_email" className="text-xs font-semibold">
                  Support Email / Website
                </Label>
                <Input
                  id="receipt_header_email"
                  value={formState.receipt_header_email}
                  onChange={(e) => handleFieldChange("receipt_header_email", e.target.value)}
                  placeholder="e.g. support@pharmadaily.com"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="receipt_header_drug_lic" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <span>DGDA Drug Lic Number</span>
                  <span className="text-[10px] text-muted-foreground font-normal">(Required)</span>
                </Label>
                <Input
                  id="receipt_header_drug_lic"
                  value={formState.receipt_header_drug_lic}
                  onChange={(e) => handleFieldChange("receipt_header_drug_lic", e.target.value)}
                  placeholder="e.g. DL-DHK-2024-8891"
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="receipt_header_bin" className="text-xs font-semibold">
                  NBR VAT / BIN Number
                </Label>
                <Input
                  id="receipt_header_bin"
                  value={formState.receipt_header_bin}
                  onChange={(e) => handleFieldChange("receipt_header_bin", e.target.value)}
                  placeholder="e.g. 002391029-0101"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: FOOTER CUSTOMIZATION */}
          <div className="rounded-xl border border-border/70 p-4 space-y-4 bg-card shadow-2xs">
            <div className="border-b border-border/40 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Receipt className="size-4 text-blue-600 dark:text-blue-400" />
                <span>2. Footer Notes & Return Policy</span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Customer instructions, pharmacy return rules, and closing blessings.
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="receipt_footer_thank_you" className="text-xs font-semibold">
                  Thank You Greeting
                </Label>
                <Input
                  id="receipt_footer_thank_you"
                  value={formState.receipt_footer_thank_you}
                  onChange={(e) => handleFieldChange("receipt_footer_thank_you", e.target.value)}
                  placeholder="*** THANK YOU · GET WELL SOON ***"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="receipt_footer_return_policy" className="text-xs font-semibold">
                  Return & Exchange Policy Terms
                </Label>
                <Textarea
                  id="receipt_footer_return_policy"
                  rows={2}
                  value={formState.receipt_footer_return_policy}
                  onChange={(e) => handleFieldChange("receipt_footer_return_policy", e.target.value)}
                  placeholder="Returns accepted within 7 days with original receipt. Cold-chain items & cut strips are non-returnable."
                  className="text-xs resize-none"
                />
                <p className="text-[10px] text-muted-foreground">
                  Clear terms protect the pharmacy from non-refundable cold-chain or damaged returns.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <Label htmlFor="receipt_footer_helpline" className="text-xs font-semibold">
                    Customer Feedback / Helpline
                  </Label>
                  <Input
                    id="receipt_footer_helpline"
                    value={formState.receipt_footer_helpline}
                    onChange={(e) => handleFieldChange("receipt_footer_helpline", e.target.value)}
                    placeholder="e.g. +880 1700-000000"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="receipt_footer_tagline" className="text-xs font-semibold">
                    System / Copyright Tagline
                  </Label>
                  <Input
                    id="receipt_footer_tagline"
                    value={formState.receipt_footer_tagline}
                    onChange={(e) => handleFieldChange("receipt_footer_tagline", e.target.value)}
                    placeholder="e.g. PharmaDaily Cloud POS"
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: DISPLAY TOGGLES & HARDWARE */}
          <div className="rounded-xl border border-border/70 p-4 space-y-4 bg-card shadow-2xs">
            <div className="border-b border-border/40 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Printer className="size-4 text-amber-600 dark:text-amber-400" />
                <span>3. Thermal Paper Width & Display Elements</span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Control which sections are printed on the slip and set hardware roll dimensions.
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-center">
                <Label htmlFor="receipt_paper_size" className="text-xs font-semibold">
                  Default Till Roll Paper
                </Label>
                <div className="sm:col-span-2">
                  <Select
                    value={formState.receipt_paper_size}
                    onValueChange={(v) => handleFieldChange("receipt_paper_size", v)}
                  >
                    <SelectTrigger id="receipt_paper_size" className="h-9 text-xs font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="80mm">80mm Thermal Paper (Standard 3-inch POS · Recommended)</SelectItem>
                      <SelectItem value="58mm">58mm Thermal Paper (Compact 2-inch Mini Till)</SelectItem>
                      <SelectItem value="a4">A4 Full Page Laser / Inkjet Invoice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 space-y-2">
                {[
                  {
                    key: "receipt_show_barcode",
                    title: "Print Invoice Barcode",
                    desc: "Prints scannable barcode for laser guns to quickly pull up sales return",
                  },
                  {
                    key: "receipt_show_batch_expiry",
                    title: "Print Batch Number & Expiry Date",
                    desc: "Prints medicine batch and expiry details directly below each line item",
                  },
                  {
                    key: "receipt_show_customer_info",
                    title: "Print Customer Name & Mobile",
                    desc: "Displays registered patient name and contact number on the receipt header",
                  },
                  {
                    key: "receipt_show_cashier_info",
                    title: "Print Cashier & Counter Number",
                    desc: "Stamps cashier identifier and register counter for shift accountability",
                  },
                  {
                    key: "receipt_show_amount_in_words",
                    title: "Spell Total Amount in Words",
                    desc: "Prints spelled out verbal amount (e.g. Two Hundred Sixty-One Taka Only)",
                  },
                ].map((item) => {
                  const isChecked = formState[item.key] !== "false";
                  return (
                    <div
                      key={item.key}
                      onClick={() => handleToggle(item.key)}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-medium text-foreground">{item.title}</div>
                        <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                      </div>
                      <div
                        className={cn(
                          "size-5 rounded flex items-center justify-center border transition-colors shrink-0",
                          isChecked
                            ? "bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900"
                            : "border-zinc-300 dark:border-zinc-700 bg-transparent"
                        )}
                      >
                        {isChecked && <Check className="size-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sticky Preview: 5 columns on LG */}
        <div className="lg:col-span-5 sticky top-6 space-y-3">
          <div className="flex items-center justify-between bg-zinc-900 text-white dark:bg-zinc-900 px-4 py-2.5 rounded-t-xl">
            <div className="flex items-center gap-2">
              <Eye className="size-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Live Thermal Preview</span>
            </div>

            {/* Paper Switcher */}
            <div className="flex items-center gap-1 bg-zinc-800 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setPreviewPaper("80mm")}
                className={cn(
                  "px-2 py-0.5 rounded font-mono text-[10px] font-semibold transition-colors cursor-pointer",
                  previewPaper === "80mm"
                    ? "bg-white text-zinc-950 font-bold shadow-xs"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                80mm
              </button>
              <button
                type="button"
                onClick={() => setPreviewPaper("58mm")}
                className={cn(
                  "px-2 py-0.5 rounded font-mono text-[10px] font-semibold transition-colors cursor-pointer",
                  previewPaper === "58mm"
                    ? "bg-white text-zinc-950 font-bold shadow-xs"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                58mm
              </button>
            </div>
          </div>

          <div className="bg-zinc-200/70 dark:bg-zinc-950 p-4 rounded-b-xl border border-zinc-300 dark:border-zinc-800 overflow-y-auto max-h-[75vh] flex justify-center">
            <div className="shadow-xl rounded-xs overflow-hidden bg-white">
              <PosThermalReceipt receipt={sampleReceipt} paperWidth={previewPaper} />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestPrint}
              className="w-full text-xs h-9 font-semibold bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
            >
              <Printer className="size-3.5 mr-1.5" />
              Test Hardware Print ({previewPaper})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
