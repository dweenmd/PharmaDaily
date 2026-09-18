"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Calendar,
  CalendarX2,
  CheckCircle2,
  Clock,
  CreditCard,
  Hash,
  Landmark,
  PackageCheck,
  Plus,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { createPurchaseAction } from "@/features/purchases/actions";
import {
  purchaseSchema,
  type PurchaseFormValues,
  type PurchaseInput,
} from "@/features/purchases/schemas";
import { MedicineCombobox, type MedicineOption } from "@/components/shared/medicine-combobox";
import { expiryStatus, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { type SupplierRow } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

type BranchOption = { id: string; name: string; code: string };

type Props = {
  suppliers: SupplierRow[];
  medicines: MedicineOption[];
  branches: BranchOption[];
  defaultBranchId: string | null;
  canChooseBranch: boolean;
};

const emptyItem = {
  medicine_id: "",
  medicine_name: "",
  batch_no: "",
  expiry_date: "",
  quantity: 1,
  free_quantity: 0,
  unit_cost: 0,
  cost_price: 0,
  selling_price: 0,
  mrp: 0,
  discount: 0,
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getShelfLifeBadge(dateStr: string) {
  if (!dateStr) return null;
  const exp = new Date(dateStr);
  if (isNaN(exp.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: "Expired", status: "expired" as const, days: diffDays };
  }
  if (diffDays <= 30) {
    return { text: `${diffDays}d left`, status: "critical" as const, days: diffDays };
  }
  if (diffDays <= 90) {
    return { text: `${Math.round(diffDays / 30)}m left`, status: "warning" as const, days: diffDays };
  }
  const months = Math.round(diffDays / 30.4);
  return { text: `${months}m shelf life`, status: "ok" as const, days: diffDays };
}

export function PurchaseForm({
  suppliers,
  medicines,
  branches,
  defaultBranchId,
  canChooseBranch,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [hasSavedDraft, setHasSavedDraft] = React.useState(false);

  const form = useForm<PurchaseFormValues, unknown, PurchaseInput>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      supplier_id: "",
      branch_id: defaultBranchId ?? branches[0]?.id ?? "",
      purchase_date: today(),
      invoice_no: "",
      paid_amount: 0,
      payment_method: "Cash",
      action_type: "complete",
      notes: "",
      items: [{ ...emptyItem }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });
  const { errors } = form.formState;

  // Check for local draft on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("pharmadaily_purchase_draft");
      if (saved) {
        setHasSavedDraft(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const items = useWatch({ control: form.control, name: "items" });
  const paidAmount = useWatch({ control: form.control, name: "paid_amount" });
  const paymentMethod = useWatch({ control: form.control, name: "payment_method" });
  const selectedSupplierId = useWatch({ control: form.control, name: "supplier_id" });

  const activeSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  // Line calculations
  const lineCalculations = (items ?? []).map((item) => {
    const qty = Number(item?.quantity) || 0;
    const freeQty = Number(item?.free_quantity) || 0;
    const unitCost = Number(item?.unit_cost ?? item?.cost_price) || 0;
    const sellingPrice = Number(item?.selling_price) || 0;
    const discountPct = Number(item?.discount) || 0;

    const lineSubtotal = qty * unitCost;
    const lineDiscount = lineSubtotal * (discountPct / 100);
    const lineTotal = Math.max(0, lineSubtotal - lineDiscount);
    const totalPhysicalUnits = qty + freeQty;

    return {
      qty,
      freeQty,
      totalPhysicalUnits,
      unitCost,
      sellingPrice,
      discountPct,
      lineSubtotal,
      lineDiscount,
      lineTotal,
    };
  });

  const subtotal = lineCalculations.reduce((sum, line) => sum + line.lineSubtotal, 0);
  const totalDiscount = lineCalculations.reduce((sum, line) => sum + line.lineDiscount, 0);
  const total = Math.max(0, subtotal - totalDiscount);
  const paid = Number(paidAmount) || 0;
  const due = Math.max(0, total - paid);

  // Warnings
  const lossMakingRows = (items ?? [])
    .map((item, index) => ({ index, item }))
    .filter(
      ({ item }) =>
        Number(item?.selling_price) > 0 &&
        Number(item?.unit_cost ?? item?.cost_price) > 0 &&
        Number(item.selling_price) < Number(item?.unit_cost ?? item?.cost_price),
    );

  const expiryWarnings = (items ?? [])
    .map((item, index) => ({
      index,
      status: item?.expiry_date ? expiryStatus(item.expiry_date) : null,
    }))
    .filter(({ status }) => status === "expired" || status === "critical");

  function handleSaveDraft() {
    try {
      const currentValues = form.getValues();
      localStorage.setItem("pharmadaily_purchase_draft", JSON.stringify(currentValues));
      setHasSavedDraft(true);
      toast.success("Draft saved", {
        description: `Consignment invoice ${currentValues.invoice_no || "unnamed"} saved locally.`,
      });
    } catch {
      toast.error("Could not save draft locally");
    }
  }

  function handleLoadDraft() {
    try {
      const saved = localStorage.getItem("pharmadaily_purchase_draft");
      if (saved) {
        const parsed = JSON.parse(saved);
        form.reset(parsed);
        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          replace(parsed.items);
        }
        toast.success("Draft loaded", {
          description: "Previous purchase consignment draft has been restored.",
        });
      }
    } catch {
      toast.error("Could not load draft");
    }
  }

  function handleDiscardDraft() {
    try {
      localStorage.removeItem("pharmadaily_purchase_draft");
      setHasSavedDraft(false);
      toast.info("Draft discarded");
    } catch {
      // ignore
    }
  }

  function handleActionSubmit(actionType: "receive" | "complete") {
    form.setValue("action_type", actionType);
    form.handleSubmit(onSubmit)();
  }

  function onSubmit(values: PurchaseInput) {
    setFormError(null);

    startTransition(async () => {
      const result = await createPurchaseAction(values);

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      if (result.data === "draft") {
        toast.success("Purchase draft saved");
        return;
      }

      try {
        localStorage.removeItem("pharmadaily_purchase_draft");
      } catch {
        // ignore
      }

      const isReceived = values.action_type === "receive";
      toast.success(isReceived ? "Stock received at dock" : "Purchase completed", {
        description: isReceived
          ? "Consignment stock added to inventory dock."
          : "Stock intake reconciled and supplier ledger updated.",
      });

      router.push(`/purchases/${result.data}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      {/* Draft Resume Banner */}
      {hasSavedDraft && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3.5 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
            <Clock className="size-4 text-zinc-500" />
            <span>You have an uncommitted purchase draft saved on this workstation.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadDraft}
              className="h-7 text-xs"
            >
              Resume Draft
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDiscardDraft}
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
            >
              Discard
            </Button>
          </div>
        </div>
      )}

      {formError && (
        <Alert variant="destructive" role="alert">
          <AlertCircle />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {/* Supplier Section */}
      <Card className="border-zinc-200 shadow-xs dark:border-zinc-800">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Supplier & Consignment
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              Fields marked with <span className="text-destructive">*</span> are required
            </span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Supplier */}
          <Field data-invalid={!!errors.supplier_id}>
            <FieldLabel htmlFor="supplier_id">
              Supplier <span className="text-destructive">*</span>
            </FieldLabel>
            <Controller
              control={form.control}
              name="supplier_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                  <SelectTrigger id="supplier_id" aria-invalid={!!errors.supplier_id} className="h-9">
                    <SelectValue placeholder="Select supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="font-medium">{s.name}</span>
                        {s.phone && (
                          <span className="text-muted-foreground ml-1.5 text-xs font-mono">
                            ({s.phone})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.supplier_id ? (
              <FieldError>{errors.supplier_id.message}</FieldError>
            ) : activeSupplier ? (
              <FieldDescription className="text-xs text-zinc-500">
                {activeSupplier.phone ? `Phone: ${activeSupplier.phone}` : activeSupplier.address || "Verified Supplier"}
              </FieldDescription>
            ) : null}
          </Field>

          {/* Supplier Invoice */}
          <Field data-invalid={!!errors.invoice_no}>
            <FieldLabel htmlFor="invoice_no">
              Supplier Invoice <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="invoice_no"
              placeholder="e.g. INV-2026-9810"
              aria-invalid={!!errors.invoice_no}
              disabled={isPending}
              className="h-9 font-mono uppercase"
              {...form.register("invoice_no")}
            />
            {errors.invoice_no ? (
              <FieldError>{errors.invoice_no.message}</FieldError>
            ) : (
              <FieldDescription className="text-xs">From paper bill or delivery challan.</FieldDescription>
            )}
          </Field>

          {/* Purchase Date */}
          <Field data-invalid={!!errors.purchase_date}>
            <FieldLabel htmlFor="purchase_date">
              Purchase Date <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="purchase_date"
              type="date"
              max={today()}
              aria-invalid={!!errors.purchase_date}
              disabled={isPending}
              className="h-9"
              {...form.register("purchase_date")}
            />
            {errors.purchase_date && <FieldError>{errors.purchase_date.message}</FieldError>}
          </Field>

          {/* Branch (if selectable) or Notes preview */}
          {canChooseBranch ? (
            <Field data-invalid={!!errors.branch_id}>
              <FieldLabel htmlFor="branch_id">
                Receiving Branch <span className="text-destructive">*</span>
              </FieldLabel>
              <Controller
                control={form.control}
                name="branch_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <SelectTrigger id="branch_id" aria-invalid={!!errors.branch_id} className="h-9">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.branch_id && <FieldError>{errors.branch_id.message}</FieldError>}
            </Field>
          ) : (
            <Field>
              <FieldLabel htmlFor="notes">Reference / Notes</FieldLabel>
              <Input
                id="notes"
                placeholder="Optional consignment notes"
                disabled={isPending}
                className="h-9 text-xs"
                {...form.register("notes")}
              />
            </Field>
          )}
        </CardContent>
      </Card>

      {/* Medicine Items Table Section */}
      <Card className="border-zinc-200 shadow-xs dark:border-zinc-800">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Medicine Items ({fields.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verify batch lots and expiry dates accurately for FEFO dispensing compliance.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => append({ ...emptyItem })}
            className="h-8 border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <Plus className="mr-1.5 size-3.5" />
            Add Medicine
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {typeof errors.items?.message === "string" && (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{errors.items.message}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Desktop & Tablet Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-y border-zinc-200 bg-zinc-50/80 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase dark:border-zinc-800 dark:bg-zinc-900/50">
                  <th className="py-2.5 pl-4 pr-2 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Medicine</th>
                  {/* Visually Prominent Batch Header */}
                  <th className="py-2.5 px-3 min-w-[130px] bg-zinc-100/90 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 border-x border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center gap-1">
                      <Hash className="size-3 text-zinc-500" />
                      <span>Batch</span>
                    </div>
                  </th>
                  {/* Visually Prominent Expiry Header */}
                  <th className="py-2.5 px-3 min-w-[160px] bg-zinc-100/90 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 border-r border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center gap-1">
                      <Calendar className="size-3 text-zinc-500" />
                      <span>Expiry</span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 ml-1">
                        FEFO
                      </span>
                    </div>
                  </th>
                  <th className="py-2.5 px-2.5 w-20 text-right">Quantity</th>
                  <th className="py-2.5 px-2.5 w-20 text-right">Free Qty</th>
                  <th className="py-2.5 px-2.5 w-24 text-right">Unit Cost</th>
                  <th className="py-2.5 px-2.5 w-24 text-right">Selling</th>
                  <th className="py-2.5 px-2.5 w-20 text-right">Discount</th>
                  <th className="py-2.5 px-3 w-28 text-right">Total</th>
                  <th className="py-2.5 pr-4 pl-2 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {fields.map((fieldItem, index) => {
                  const itemErrors = errors.items?.[index];
                  const line = items?.[index];
                  const calc = lineCalculations[index] ?? { lineTotal: 0 };
                  const shelfBadge = getShelfLifeBadge(line?.expiry_date || "");

                  return (
                    <tr
                      key={fieldItem.id}
                      className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors"
                    >
                      {/* Row Index */}
                      <td className="py-3 pl-4 pr-2 text-center text-xs font-mono text-zinc-400">
                        {String(index + 1).padStart(2, "0")}
                      </td>

                      {/* Medicine Picker */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <Controller
                            control={form.control}
                            name={`items.${index}.medicine_id`}
                            render={({ field }) => (
                              <MedicineCombobox
                                id={`items.${index}.medicine_id`}
                                medicines={medicines}
                                value={field.value}
                                disabled={isPending}
                                aria-invalid={!!itemErrors?.medicine_id}
                                onSelect={(m) => {
                                  field.onChange(m.id);
                                  form.setValue(`items.${index}.medicine_name`, m.name);
                                }}
                              />
                            )}
                          />
                          {itemErrors?.medicine_id && (
                            <p className="text-[11px] text-destructive font-medium">
                              {itemErrors.medicine_id.message}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* PROMINENT BATCH NUMBER */}
                      <td className="py-3 px-3 bg-zinc-50/50 dark:bg-zinc-900/40 border-x border-zinc-200/80 dark:border-zinc-800">
                        <div className="space-y-1">
                          <Input
                            placeholder="e.g. B2609A"
                            aria-invalid={!!itemErrors?.batch_no}
                            disabled={isPending}
                            className="h-8 font-mono text-xs font-bold uppercase tracking-wider bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 shadow-xs focus:border-zinc-950 dark:focus:border-zinc-100"
                            {...form.register(`items.${index}.batch_no`)}
                          />
                          {itemErrors?.batch_no && (
                            <p className="text-[10px] text-destructive">
                              {itemErrors.batch_no.message}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* PROMINENT EXPIRY DATE */}
                      <td className="py-3 px-3 bg-zinc-50/50 dark:bg-zinc-900/40 border-r border-zinc-200/80 dark:border-zinc-800">
                        <div className="space-y-1">
                          <Input
                            type="date"
                            aria-invalid={!!itemErrors?.expiry_date}
                            disabled={isPending}
                            className="h-8 font-mono text-xs bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 shadow-xs focus:border-zinc-950 dark:focus:border-zinc-100"
                            {...form.register(`items.${index}.expiry_date`)}
                          />
                          {/* Real-time Dynamic Shelf Life Badge */}
                          {shelfBadge ? (
                            <div className="flex items-center gap-1">
                              <span
                                className={cn(
                                  "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium font-mono",
                                  shelfBadge.status === "ok" &&
                                    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700",
                                  shelfBadge.status === "warning" &&
                                    "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800",
                                  shelfBadge.status === "critical" &&
                                    "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800",
                                  shelfBadge.status === "expired" &&
                                    "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800 font-bold",
                                )}
                              >
                                {shelfBadge.text}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-400">YYYY-MM-DD</span>
                          )}
                          {itemErrors?.expiry_date && (
                            <p className="text-[10px] text-destructive">
                              {itemErrors.expiry_date.message}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-2.5">
                        <Input
                          type="number"
                          min={1}
                          inputMode="numeric"
                          aria-invalid={!!itemErrors?.quantity}
                          disabled={isPending}
                          className="h-8 w-20 text-right font-mono text-xs tabular-nums"
                          {...form.register(`items.${index}.quantity`)}
                        />
                      </td>

                      {/* Free Quantity */}
                      <td className="py-3 px-2.5">
                        <div className="space-y-0.5">
                          <Input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            disabled={isPending}
                            placeholder="0"
                            className="h-8 w-20 text-right font-mono text-xs tabular-nums text-zinc-600 dark:text-zinc-400"
                            {...form.register(`items.${index}.free_quantity`)}
                          />
                          {Number(line?.free_quantity) > 0 && (
                            <span className="block text-right text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                              +{Number(line?.free_quantity)} free
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Unit Cost */}
                      <td className="py-3 px-2.5">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          inputMode="decimal"
                          aria-invalid={!!itemErrors?.cost_price}
                          disabled={isPending}
                          className="h-8 w-24 text-right font-mono text-xs tabular-nums"
                          {...form.register(`items.${index}.cost_price`, {
                            onChange: (e) => {
                              form.setValue(`items.${index}.unit_cost`, Number(e.target.value));
                            },
                          })}
                        />
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-2.5">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          inputMode="decimal"
                          aria-invalid={!!itemErrors?.selling_price}
                          disabled={isPending}
                          className="h-8 w-24 text-right font-mono text-xs tabular-nums"
                          {...form.register(`items.${index}.selling_price`)}
                        />
                      </td>

                      {/* Discount (%) */}
                      <td className="py-3 px-2.5">
                        <div className="relative">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step="0.1"
                            inputMode="decimal"
                            disabled={isPending}
                            placeholder="0"
                            className="h-8 w-20 pr-5 text-right font-mono text-xs tabular-nums"
                            {...form.register(`items.${index}.discount`)}
                          />
                          <span className="pointer-events-none absolute right-2 top-2 text-[10px] text-zinc-400">
                            %
                          </span>
                        </div>
                      </td>

                      {/* Line Total */}
                      <td className="py-3 px-3 text-right">
                        <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                          {formatCurrency(calc.lineTotal)}
                        </span>
                      </td>

                      {/* Remove Row Button */}
                      <td className="py-3 pr-4 pl-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isPending || fields.length === 1}
                          onClick={() => remove(index)}
                          aria-label={`Remove row ${index + 1}`}
                          className="size-8 p-0 text-zinc-400 hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer Add Button */}
          <div className="border-t border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => append({ ...emptyItem })}
              className="border-dashed hover:border-solid hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium"
            >
              <Plus className="mr-1.5 size-3.5" />
              Add Medicine
            </Button>
            <span className="text-xs text-muted-foreground">
              Total lines: <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{fields.length}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Expiry & Pricing Safety Alerts */}
      {expiryWarnings.length > 0 && (
        <Alert className="border-amber-300/80 bg-amber-50/60 dark:border-amber-800/60 dark:bg-amber-950/20">
          <CalendarX2 className="text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-900 dark:text-amber-200 text-xs">
            {expiryWarnings.some((w) => w.status === "expired")
              ? `Line ${expiryWarnings
                  .filter((w) => w.status === "expired")
                  .map((w) => w.index + 1)
                  .join(", ")} has an expiry date in the past.`
              : `Line ${expiryWarnings.map((w) => w.index + 1).join(", ")} expires within 30 days.`}{" "}
            Check the year on the manufacturer carton before saving.
          </AlertDescription>
        </Alert>
      )}

      {lossMakingRows.length > 0 && (
        <Alert className="border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
          <TriangleAlert className="text-zinc-600 dark:text-zinc-400" />
          <AlertDescription className="text-xs text-zinc-700 dark:text-zinc-300">
            {lossMakingRows.length === 1
              ? `Line ${lossMakingRows[0]!.index + 1} has a selling price below unit cost.`
              : `Lines ${lossMakingRows.map((r) => r.index + 1).join(", ")} have selling prices below unit cost.`}{" "}
            Please verify cost and selling prices are not inverted.
          </AlertDescription>
        </Alert>
      )}

      {/* Bottom Section: Payment Method & Financial Summary */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Payment Method Selection & Notes */}
        <div className="space-y-5 lg:col-span-7">
          <Card className="border-zinc-200 shadow-xs dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Payment Method Pills */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "Cash", label: "Cash", icon: Banknote },
                  { value: "Bank", label: "Bank", icon: Landmark },
                  { value: "Other", label: "Other", icon: CreditCard },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => form.setValue("payment_method", m.value as "Cash" | "Bank" | "Other")}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-lg border py-3 px-4 text-sm font-medium transition-all",
                        isSelected
                          ? "border-zinc-950 bg-zinc-950 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 shadow-xs"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-850",
                      )}
                    >
                      <Icon className="size-4" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {canChooseBranch && (
                <Field>
                  <FieldLabel htmlFor="notes">Notes / Challan Reference</FieldLabel>
                  <Input
                    id="notes"
                    placeholder="e.g. Delivery challan #9812, Cheque #019283"
                    disabled={isPending}
                    className="h-9 text-xs"
                    {...form.register("notes")}
                  />
                </Field>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Financial Summary Card */}
        <div className="lg:col-span-5">
          <Card className="border-zinc-200 bg-zinc-50/60 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {/* Subtotal */}
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <span>Subtotal</span>
                <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              {/* Discount */}
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <span>Discount</span>
                <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {totalDiscount > 0 ? `- ${formatCurrency(totalDiscount)}` : "৳0.00"}
                </span>
              </div>

              {/* Total */}
              <div className="border-t border-zinc-200 pt-2.5 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">Total</span>
                  <span className="font-mono text-lg font-bold text-zinc-950 dark:text-white tabular-nums">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* Paid Amount Input */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">Paid</span>
                <div className="w-32">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    aria-invalid={!!errors.paid_amount}
                    disabled={isPending}
                    className="h-8 text-right font-mono text-xs font-semibold tabular-nums"
                    {...form.register("paid_amount")}
                  />
                  {errors.paid_amount && (
                    <p className="text-[10px] text-destructive text-right mt-1">
                      {errors.paid_amount.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Paid Quick Presets */}
              <div className="flex justify-end gap-1.5 pt-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => form.setValue("paid_amount", total)}
                  className="rounded px-2 py-0.5 bg-zinc-200/80 hover:bg-zinc-300 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 font-medium transition-colors"
                >
                  Pay Full
                </button>
                <button
                  type="button"
                  onClick={() => form.setValue("paid_amount", Math.round(total / 2))}
                  className="rounded px-2 py-0.5 bg-zinc-200/80 hover:bg-zinc-300 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 font-medium transition-colors"
                >
                  Pay Half
                </button>
                <button
                  type="button"
                  onClick={() => form.setValue("paid_amount", 0)}
                  className="rounded px-2 py-0.5 bg-zinc-200/80 hover:bg-zinc-300 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 font-medium transition-colors"
                >
                  Due (৳0)
                </button>
              </div>

              {/* Due Balance */}
              <div className="border-t border-zinc-200 pt-2.5 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">Due</span>
                  <span
                    className={cn(
                      "font-mono text-sm font-bold tabular-nums px-2 py-0.5 rounded-md",
                      due > 0
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                        : "text-zinc-700 dark:text-zinc-300",
                    )}
                  >
                    {formatCurrency(due)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Footer Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isPending}
          className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Cancel
        </Button>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Save Draft */}
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={handleSaveDraft}
            className="border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 text-xs font-medium"
          >
            <Save className="mr-1.5 size-3.5" />
            Save Draft
          </Button>

          {/* Receive Stock */}
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => handleActionSubmit("receive")}
            className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 text-xs font-medium"
          >
            <PackageCheck className="mr-1.5 size-3.5" />
            Receive Stock
          </Button>

          {/* Complete Purchase */}
          <Button
            type="button"
            disabled={isPending}
            onClick={() => handleActionSubmit("complete")}
            className="bg-zinc-950 text-white hover:bg-zinc-850 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white text-xs font-medium shadow-xs"
          >
            {isPending ? (
              <Spinner className="mr-1.5" />
            ) : (
              <CheckCircle2 className="mr-1.5 size-3.5" />
            )}
            Complete Purchase
          </Button>
        </div>
      </div>
    </form>
  );
}
