"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CalendarX2, Plus, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { createPurchaseAction } from "@/features/purchases/actions";
import {
  purchaseSchema,
  type PurchaseFormValues,
  type PurchaseInput,
} from "@/features/purchases/schemas";
import { MedicineCombobox, type MedicineOption } from "@/components/shared/medicine-combobox";
import { expiryStatus, formatCurrency } from "@/lib/format";
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
  /** The user's own branch. Super admins may pick a different one. */
  defaultBranchId: string | null;
  canChooseBranch: boolean;
};

const emptyItem = {
  medicine_id: "",
  batch_no: "",
  expiry_date: "",
  quantity: 1,
  cost_price: 0,
  selling_price: 0,
  mrp: 0,
};

function today() {
  return new Date().toISOString().slice(0, 10);
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

  const form = useForm<PurchaseFormValues, unknown, PurchaseInput>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      supplier_id: "",
      branch_id: defaultBranchId ?? branches[0]?.id ?? "",
      purchase_date: today(),
      invoice_no: "",
      paid_amount: 0,
      notes: "",
      items: [{ ...emptyItem }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const { errors } = form.formState;

  // useWatch rather than form.watch(): it subscribes to just these paths, so
  // typing a quantity does not re-render every row in the table.
  const items = useWatch({ control: form.control, name: "items" });
  const paidAmount = useWatch({ control: form.control, name: "paid_amount" });

  const total = (items ?? []).reduce(
    (sum, item) => sum + (Number(item?.quantity) || 0) * (Number(item?.cost_price) || 0),
    0,
  );
  const due = Math.max(0, total - (Number(paidAmount) || 0));

  /**
   * Selling below cost is legal — clearing near-expiry stock, matching a
   * competitor — so it warns rather than blocks. Silently accepting it would
   * hide the far more common case: a decimal typed in the wrong column.
   */
  const lossMakingRows = (items ?? [])
    .map((item, index) => ({ index, item }))
    .filter(
      ({ item }) =>
        Number(item?.selling_price) > 0 &&
        Number(item?.cost_price) > 0 &&
        Number(item.selling_price) < Number(item.cost_price),
    );

  /**
   * Expiry dates that are already past or nearly so.
   *
   * Receiving short-dated stock is a real thing — distributors clear it at a
   * discount — so this warns rather than blocks. It exists because the common
   * case is a typo: last year's year in the expiry field silently puts
   * unsellable stock on the shelf, and nobody notices until a customer is
   * standing at the counter.
   */
  const expiryWarnings = (items ?? [])
    .map((item, index) => ({
      index,
      status: item?.expiry_date ? expiryStatus(item.expiry_date) : null,
    }))
    .filter(({ status }) => status === "expired" || status === "critical");

  function onSubmit(values: PurchaseInput) {
    setFormError(null);

    startTransition(async () => {
      const result = await createPurchaseAction(values);

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      toast.success("Purchase recorded", { description: "Stock and supplier balance updated." });
      router.push(`/purchases/${result.data}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      {formError && (
        <Alert variant="destructive" role="alert">
          <AlertCircle />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consignment details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field data-invalid={!!errors.supplier_id}>
            <FieldLabel htmlFor="supplier_id">
              Supplier <span className="text-destructive">*</span>
            </FieldLabel>
            <Controller
              control={form.control}
              name="supplier_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                  <SelectTrigger id="supplier_id" aria-invalid={!!errors.supplier_id}>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.supplier_id && <FieldError>{errors.supplier_id.message}</FieldError>}
          </Field>

          {canChooseBranch && (
            <Field data-invalid={!!errors.branch_id}>
              <FieldLabel htmlFor="branch_id">
                Receiving branch <span className="text-destructive">*</span>
              </FieldLabel>
              <Controller
                control={form.control}
                name="branch_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <SelectTrigger id="branch_id" aria-invalid={!!errors.branch_id}>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.branch_id && <FieldError>{errors.branch_id.message}</FieldError>}
            </Field>
          )}

          <Field data-invalid={!!errors.invoice_no}>
            <FieldLabel htmlFor="invoice_no">
              Supplier invoice no <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="invoice_no"
              placeholder="INV-22841"
              aria-invalid={!!errors.invoice_no}
              disabled={isPending}
              {...form.register("invoice_no")}
            />
            {errors.invoice_no ? (
              <FieldError>{errors.invoice_no.message}</FieldError>
            ) : (
              <FieldDescription>From the supplier&apos;s paperwork.</FieldDescription>
            )}
          </Field>

          <Field data-invalid={!!errors.purchase_date}>
            <FieldLabel htmlFor="purchase_date">
              Purchase date <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="purchase_date"
              type="date"
              max={today()}
              aria-invalid={!!errors.purchase_date}
              disabled={isPending}
              {...form.register("purchase_date")}
            />
            {errors.purchase_date && <FieldError>{errors.purchase_date.message}</FieldError>}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Items</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => append({ ...emptyItem })}
          >
            <Plus className="size-4" />
            Add line
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {typeof errors.items?.message === "string" && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{errors.items.message}</AlertDescription>
            </Alert>
          )}

          {fields.map((fieldItem, index) => {
            const itemErrors = errors.items?.[index];
            const line = items?.[index];
            const lineTotal = (Number(line?.quantity) || 0) * (Number(line?.cost_price) || 0);

            return (
              <div key={fieldItem.id} className="rounded-lg border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-medium">
                    Line {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending || fields.length === 1}
                    onClick={() => remove(index)}
                    aria-label={`Remove line ${index + 1}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <Field className="lg:col-span-2" data-invalid={!!itemErrors?.medicine_id}>
                    <FieldLabel htmlFor={`items.${index}.medicine_id`}>Medicine</FieldLabel>
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
                          onSelect={(m) => field.onChange(m.id)}
                        />
                      )}
                    />
                    {itemErrors?.medicine_id && (
                      <FieldError>{itemErrors.medicine_id.message}</FieldError>
                    )}
                  </Field>

                  <Field data-invalid={!!itemErrors?.batch_no}>
                    <FieldLabel htmlFor={`items.${index}.batch_no`}>Batch</FieldLabel>
                    <Input
                      id={`items.${index}.batch_no`}
                      placeholder="B2411"
                      aria-invalid={!!itemErrors?.batch_no}
                      disabled={isPending}
                      {...form.register(`items.${index}.batch_no`)}
                    />
                    {itemErrors?.batch_no && <FieldError>{itemErrors.batch_no.message}</FieldError>}
                  </Field>

                  <Field data-invalid={!!itemErrors?.expiry_date}>
                    <FieldLabel htmlFor={`items.${index}.expiry_date`}>Expiry</FieldLabel>
                    <Input
                      id={`items.${index}.expiry_date`}
                      type="date"
                      aria-invalid={!!itemErrors?.expiry_date}
                      disabled={isPending}
                      {...form.register(`items.${index}.expiry_date`)}
                    />
                    {itemErrors?.expiry_date && (
                      <FieldError>{itemErrors.expiry_date.message}</FieldError>
                    )}
                  </Field>

                  <Field data-invalid={!!itemErrors?.quantity}>
                    <FieldLabel htmlFor={`items.${index}.quantity`}>Qty</FieldLabel>
                    <Input
                      id={`items.${index}.quantity`}
                      type="number"
                      min={1}
                      inputMode="numeric"
                      aria-invalid={!!itemErrors?.quantity}
                      disabled={isPending}
                      {...form.register(`items.${index}.quantity`)}
                    />
                    {itemErrors?.quantity && <FieldError>{itemErrors.quantity.message}</FieldError>}
                  </Field>

                  <Field data-invalid={!!itemErrors?.cost_price}>
                    <FieldLabel htmlFor={`items.${index}.cost_price`}>Cost</FieldLabel>
                    <Input
                      id={`items.${index}.cost_price`}
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      aria-invalid={!!itemErrors?.cost_price}
                      disabled={isPending}
                      {...form.register(`items.${index}.cost_price`)}
                    />
                    {itemErrors?.cost_price && (
                      <FieldError>{itemErrors.cost_price.message}</FieldError>
                    )}
                  </Field>

                  <Field data-invalid={!!itemErrors?.selling_price}>
                    <FieldLabel htmlFor={`items.${index}.selling_price`}>Selling</FieldLabel>
                    <Input
                      id={`items.${index}.selling_price`}
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      aria-invalid={!!itemErrors?.selling_price}
                      disabled={isPending}
                      {...form.register(`items.${index}.selling_price`)}
                    />
                    {itemErrors?.selling_price && (
                      <FieldError>{itemErrors.selling_price.message}</FieldError>
                    )}
                  </Field>

                  <Field data-invalid={!!itemErrors?.mrp}>
                    <FieldLabel htmlFor={`items.${index}.mrp`}>MRP</FieldLabel>
                    <Input
                      id={`items.${index}.mrp`}
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      aria-invalid={!!itemErrors?.mrp}
                      disabled={isPending}
                      {...form.register(`items.${index}.mrp`)}
                    />
                    {itemErrors?.mrp && <FieldError>{itemErrors.mrp.message}</FieldError>}
                  </Field>

                  <div className="flex items-end justify-end lg:col-span-1">
                    <span className="text-sm font-medium tabular-nums">
                      {formatCurrency(lineTotal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {expiryWarnings.length > 0 && (
        <Alert>
          <CalendarX2 />
          <AlertDescription>
            {expiryWarnings.some((w) => w.status === "expired")
              ? `Line ${expiryWarnings
                  .filter((w) => w.status === "expired")
                  .map((w) => w.index + 1)
                  .join(", ")} has an expiry date in the past.`
              : `Line ${expiryWarnings.map((w) => w.index + 1).join(", ")} expires within 30 days.`}{" "}
            Check the year is right before saving — this stock cannot be sold once it expires.
          </AlertDescription>
        </Alert>
      )}

      {lossMakingRows.length > 0 && (
        <Alert>
          <TriangleAlert />
          <AlertDescription>
            {lossMakingRows.length === 1
              ? `Line ${lossMakingRows[0]!.index + 1} sells below cost.`
              : `Lines ${lossMakingRows.map((r) => r.index + 1).join(", ")} sell below cost.`}{" "}
            This is allowed, but check the prices are not swapped.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field className="lg:col-span-2">
            <FieldLabel htmlFor="notes">Notes</FieldLabel>
            <Input
              id="notes"
              placeholder="Optional"
              disabled={isPending}
              {...form.register("notes")}
            />
          </Field>

          <Field data-invalid={!!errors.paid_amount}>
            <FieldLabel htmlFor="paid_amount">Paid now</FieldLabel>
            <Input
              id="paid_amount"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              aria-invalid={!!errors.paid_amount}
              disabled={isPending}
              {...form.register("paid_amount")}
            />
            {errors.paid_amount && <FieldError>{errors.paid_amount.message}</FieldError>}
          </Field>

          <div className="space-y-2 rounded-lg border p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium tabular-nums">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span className="tabular-nums">{formatCurrency(Number(paidAmount) || 0)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium">Due</span>
              <span
                className={`font-medium tabular-nums ${due > 0 ? "text-amber-700 dark:text-amber-500" : ""}`}
              >
                {formatCurrency(due)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner />}
          Save purchase
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
