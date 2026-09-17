"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { createStockAdjustmentAction } from "@/features/stock/actions";
import {
  ADJUSTMENT_REASONS,
  stockAdjustmentSchema,
  type StockAdjustmentFormValues,
  type StockAdjustmentInput,
} from "@/features/stock/schemas";
import { type StockRow } from "@/features/stock/queries";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
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

export function StockAdjustmentForm({ batches }: { batches: StockRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<StockAdjustmentFormValues, unknown, StockAdjustmentInput>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      branch_stock_id: "",
      branch_id: "",
      medicine_id: "",
      batch_no: "",
      type: "decrease",
      quantity: 1,
      reason: "Damaged / broken",
      reason_detail: "",
    },
  });

  const { errors } = form.formState;

  const selectedId = useWatch({ control: form.control, name: "branch_stock_id" });
  const type = useWatch({ control: form.control, name: "type" });
  const quantity = useWatch({ control: form.control, name: "quantity" });
  const reason = useWatch({ control: form.control, name: "reason" });

  const batch = batches.find((b) => b.id === selectedId) ?? null;

  const resulting = batch
    ? batch.quantity + (type === "increase" ? 1 : -1) * (Number(quantity) || 0)
    : null;
  const wouldGoNegative = resulting !== null && resulting < 0;

  /** Selecting a batch fills in the three identifiers the function needs. */
  function selectBatch(id: string) {
    const found = batches.find((b) => b.id === id);
    form.setValue("branch_stock_id", id, { shouldDirty: true });
    if (found) {
      form.setValue("branch_id", found.branch_id);
      form.setValue("medicine_id", found.medicine_id);
      form.setValue("batch_no", found.batch_no);
    }
  }

  function onSubmit(values: StockAdjustmentInput) {
    setFormError(null);

    startTransition(async () => {
      const result = await createStockAdjustmentAction(values);

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      toast.success("Stock adjusted", { description: "The ledger has been updated." });
      router.push("/stock");
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
          <CardTitle className="text-base">Batch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field data-invalid={!!errors.branch_stock_id}>
            <FieldLabel htmlFor="branch_stock_id">
              Which batch <span className="text-destructive">*</span>
            </FieldLabel>
            <Select value={selectedId} onValueChange={selectBatch} disabled={isPending}>
              <SelectTrigger id="branch_stock_id" aria-invalid={!!errors.branch_stock_id}>
                <SelectValue placeholder="Select a batch" />
              </SelectTrigger>
              <SelectContent>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {[b.medicine?.name, b.medicine?.strength].filter(Boolean).join(" ")} · batch{" "}
                    {b.batch_no} · {b.quantity} in stock
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.branch_stock_id && <FieldError>{errors.branch_stock_id.message}</FieldError>}
          </Field>

          {batch && (
            <div className="bg-muted/40 grid gap-3 rounded-lg border p-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-muted-foreground text-xs">In stock</p>
                <p className="font-medium tabular-nums">{batch.quantity}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Batch</p>
                <p className="font-mono text-xs">{batch.batch_no}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Expiry</p>
                <p>{formatDate(batch.expiry_date)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Supplier</p>
                <p className="truncate">{batch.supplier?.name ?? "—"}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adjustment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-3">
                {(["decrease", "increase"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={isPending}
                    onClick={() => field.onChange(option)}
                    aria-pressed={field.value === option}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors",
                      field.value === option
                        ? option === "decrease"
                          ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
                          : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
                        : "hover:bg-muted",
                    )}
                  >
                    {option === "decrease" ? (
                      <Minus className="size-4" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    {option === "decrease" ? "Remove stock" : "Add stock"}
                  </button>
                ))}
              </div>
            )}
          />

          <Field data-invalid={!!errors.quantity || wouldGoNegative}>
            <FieldLabel htmlFor="quantity">
              Quantity <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="quantity"
              type="number"
              min={1}
              inputMode="numeric"
              aria-invalid={!!errors.quantity || wouldGoNegative}
              disabled={isPending}
              {...form.register("quantity")}
            />
            {errors.quantity ? (
              <FieldError>{errors.quantity.message}</FieldError>
            ) : wouldGoNegative ? (
              <FieldError>
                Only {batch?.quantity} in stock — cannot remove {Number(quantity) || 0}.
              </FieldError>
            ) : (
              batch && (
                <FieldDescription>
                  {batch.quantity} in stock now, {resulting} after this adjustment.
                </FieldDescription>
              )
            )}
          </Field>

          <Field data-invalid={!!errors.reason}>
            <FieldLabel htmlFor="reason">
              Reason <span className="text-destructive">*</span>
            </FieldLabel>
            <Controller
              control={form.control}
              name="reason"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                  <SelectTrigger id="reason" aria-invalid={!!errors.reason}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADJUSTMENT_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldDescription>
              Every adjustment is recorded against your name in the stock ledger.
            </FieldDescription>
          </Field>

          <Field data-invalid={!!errors.reason_detail}>
            <FieldLabel htmlFor="reason_detail">
              Details {reason === "Other" && <span className="text-destructive">*</span>}
            </FieldLabel>
            <Input
              id="reason_detail"
              placeholder={reason === "Other" ? "Required" : "Optional"}
              aria-invalid={!!errors.reason_detail}
              disabled={isPending}
              {...form.register("reason_detail")}
            />
            {errors.reason_detail && <FieldError>{errors.reason_detail.message}</FieldError>}
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending || wouldGoNegative || !batch}>
          {isPending && <Spinner />}
          Save adjustment
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
