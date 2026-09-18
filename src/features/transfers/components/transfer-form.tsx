"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createTransferAction } from "@/features/transfers/actions";
import {
  transferSchema,
  type TransferFormValues,
  type TransferInput,
} from "@/features/transfers/schemas";
import { type StockRow } from "@/features/stock/queries";
import { BatchCombobox } from "@/components/shared/batch-combobox";
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
  branches: BranchOption[];
  stock: StockRow[];
  fromBranchId: string;
  canChooseSource: boolean;
};

export function TransferForm({ branches, stock, fromBranchId, canChooseSource }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<TransferFormValues, unknown, TransferInput>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      from_branch_id: fromBranchId,
      to_branch_id: "",
      notes: "",
      items: [{ source_stock_id: "", quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const { errors } = form.formState;

  const items = useWatch({ control: form.control, name: "items" });
  const selectedFrom = useWatch({ control: form.control, name: "from_branch_id" });

  // Only batches at the sending branch can be sent from it.
  const available = React.useMemo(
    () => stock.filter((s) => s.branch_id === selectedFrom && s.quantity > 0),
    [stock, selectedFrom],
  );

  const destinations = branches.filter((b) => b.id !== selectedFrom);

  /** Lines asking for more than the batch holds — caught here and again in the database. */
  const overdrawn = (items ?? [])
    .map((item, index) => {
      const batch = available.find((b) => b.id === item?.source_stock_id);
      return { index, batch, requested: Number(item?.quantity) || 0 };
    })
    .filter(({ batch, requested }) => batch && requested > batch.quantity);

  function onSubmit(values: TransferInput) {
    setFormError(null);

    startTransition(async () => {
      const result = await createTransferAction(values);

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      toast.success("Transfer requested", {
        description: "Nothing moves until a manager approves it.",
      });
      router.push(`/transfers/${result.data}`);
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

      {/* Workflow Indicator: Requested → Approved → In Transit → Received */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-3">
          Transfer Lifecycle Workflow
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium">
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-200 dark:bg-zinc-300 dark:text-zinc-900">
              01
            </span>
            <span>Requested</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              02
            </span>
            <span>Approved</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              03
            </span>
            <span>In Transit</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              04
            </span>
            <span>Received</span>
          </div>
        </div>
      </div>

      {/* Visual Branch Routing: Source Branch ↓ Destination Branch */}
      <Card className="border-zinc-200 shadow-2xs dark:border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Multi-Branch Route
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Source Branch */}
          <Field data-invalid={!!errors.from_branch_id}>
            <FieldLabel htmlFor="from_branch_id" className="text-xs font-semibold">
              Source Branch (Sending) <span className="text-destructive">*</span>
            </FieldLabel>
            {canChooseSource ? (
              <Controller
                control={form.control}
                name="from_branch_id"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      form.setValue("items", [{ source_stock_id: "", quantity: 1 }]);
                      form.setValue("to_branch_id", "");
                    }}
                    disabled={isPending}
                  >
                    <SelectTrigger id="from_branch_id" className="h-9">
                      <SelectValue placeholder="Select sending branch..." />
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
            ) : (
              <div className="flex h-9 items-center rounded-md border px-3 text-xs font-medium bg-zinc-50 dark:bg-zinc-900">
                {branches.find((b) => b.id === fromBranchId)?.name ?? "Your branch"}
              </div>
            )}
            {errors.from_branch_id && <FieldError>{errors.from_branch_id.message}</FieldError>}
          </Field>

          {/* Prominent Down Arrow ↓ */}
          <div className="flex items-center justify-center py-1">
            <div className="flex size-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shadow-2xs">
              <span className="text-sm font-bold">↓</span>
            </div>
          </div>

          {/* Destination Branch */}
          <Field data-invalid={!!errors.to_branch_id}>
            <FieldLabel htmlFor="to_branch_id" className="text-xs font-semibold">
              Destination Branch (Receiving) <span className="text-destructive">*</span>
            </FieldLabel>
            <Controller
              control={form.control}
              name="to_branch_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                  <SelectTrigger id="to_branch_id" aria-invalid={!!errors.to_branch_id} className="h-9">
                    <SelectValue placeholder="Select destination branch..." />
                  </SelectTrigger>
                  <SelectContent>
                    {destinations.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.to_branch_id && <FieldError>{errors.to_branch_id.message}</FieldError>}
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
            disabled={isPending || available.length === 0}
            onClick={() => append({ source_stock_id: "", quantity: 1 })}
          >
            <Plus className="size-4" />
            Add line
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {available.length === 0 ? (
            <p className="text-muted-foreground py-4 text-sm">
              There is no stock at the sending branch to transfer.
            </p>
          ) : (
            fields.map((fieldItem, index) => {
              const itemErrors = errors.items?.[index];
              const line = items?.[index];
              const batch = available.find((b) => b.id === line?.source_stock_id);
              const requested = Number(line?.quantity) || 0;
              const tooMany = batch !== undefined && requested > batch.quantity;

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

                  <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                    <Field data-invalid={!!itemErrors?.source_stock_id}>
                      <FieldLabel htmlFor={`items.${index}.source_stock_id`}>Batch</FieldLabel>
                      <Controller
                        control={form.control}
                        name={`items.${index}.source_stock_id`}
                        render={({ field }) => (
                          <BatchCombobox
                            id={`items.${index}.source_stock_id`}
                            batches={available}
                            value={field.value}
                            disabled={isPending}
                            aria-invalid={!!itemErrors?.source_stock_id}
                            onSelect={(b) => field.onChange(b.id)}
                          />
                        )}
                      />
                      {itemErrors?.source_stock_id && (
                        <FieldError>{itemErrors.source_stock_id.message}</FieldError>
                      )}
                    </Field>

                    <Field data-invalid={!!itemErrors?.quantity || tooMany}>
                      <FieldLabel htmlFor={`items.${index}.quantity`}>Quantity</FieldLabel>
                      <Input
                        id={`items.${index}.quantity`}
                        type="number"
                        min={1}
                        max={batch?.quantity}
                        inputMode="numeric"
                        aria-invalid={!!itemErrors?.quantity || tooMany}
                        disabled={isPending}
                        {...form.register(`items.${index}.quantity`)}
                      />
                      {itemErrors?.quantity ? (
                        <FieldError>{itemErrors.quantity.message}</FieldError>
                      ) : tooMany ? (
                        <FieldError>Only {batch?.quantity} in that batch.</FieldError>
                      ) : batch ? (
                        <FieldDescription>{batch.quantity} available</FieldDescription>
                      ) : null}
                    </Field>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Field>
            <FieldLabel htmlFor="notes">Notes</FieldLabel>
            <Input
              id="notes"
              placeholder="Why this stock is moving — optional"
              disabled={isPending}
              {...form.register("notes")}
            />
          </Field>
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle />
        <AlertDescription>
          Requesting a transfer moves nothing. Stock leaves the sending branch only when a manager
          approves it, and reaches the receiving branch only when someone there confirms it arrived.
        </AlertDescription>
      </Alert>

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={isPending || available.length === 0 || overdrawn.length > 0}
        >
          {isPending && <Spinner />}
          Request transfer
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
