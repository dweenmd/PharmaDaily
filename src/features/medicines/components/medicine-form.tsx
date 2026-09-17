"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ScanLine } from "lucide-react";
import { toast } from "sonner";

import { createMedicineAction, updateMedicineAction } from "@/features/medicines/actions";
import {
  DOSAGE_FORMS,
  UNITS,
  medicineSchema,
  type MedicineFormValues,
  type MedicineInput,
} from "@/features/medicines/schemas";
import { type MedicineCategoryRow, type MedicineRow } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

type Props = {
  categories: MedicineCategoryRow[];
  /** Present when editing; absent when adding. */
  medicine?: MedicineRow;
};

const NO_CATEGORY = "__none__";

/** Checkbox with a label and explanatory hint, wrapped so the whole row is clickable. */
function CheckboxRow({
  checked,
  onChange,
  disabled,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        disabled={disabled}
      />
      <span className="space-y-0.5">
        <span className="block text-sm font-medium">{label}</span>
        <span className="text-muted-foreground block text-xs">{hint}</span>
      </span>
    </label>
  );
}

export function MedicineForm({ categories, medicine }: Props) {
  const router = useRouter();
  const isEdit = Boolean(medicine);
  const barcodeRef = React.useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);

  // Three generics: what the fields hold, the context, and what the resolver
  // produces after transformation. Without the third, the submit handler would
  // be typed with the pre-transform shape.
  const form = useForm<MedicineFormValues, unknown, MedicineInput>({
    resolver: zodResolver(medicineSchema),
    defaultValues: {
      name: medicine?.name ?? "",
      generic_name: medicine?.generic_name ?? "",
      brand_name: medicine?.brand_name ?? "",
      category_id: medicine?.category_id ?? "",
      dosage_form: medicine?.dosage_form ?? "",
      strength: medicine?.strength ?? "",
      unit: medicine?.unit ?? "",
      pack_size: medicine?.pack_size ?? "",
      barcode: medicine?.barcode ?? "",
      manufacturer: medicine?.manufacturer ?? "",
      prescription_required: medicine?.prescription_required ?? false,
      controlled_drug: medicine?.controlled_drug ?? false,
      reorder_level: medicine?.reorder_level ?? 10,
      is_active: medicine?.is_active ?? true,
    },
  });

  const { errors } = form.formState;

  function onSubmit(values: MedicineInput) {
    setFormError(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateMedicineAction(medicine!.id, values)
        : await createMedicineAction(values);

      if (!result.ok) {
        setFormError(result.error);
        // Put the cursor where the problem is rather than making them hunt.
        if (result.field) {
          form.setFocus(result.field as keyof MedicineInput);
        }
        return;
      }

      toast.success(isEdit ? "Medicine updated" : "Medicine added");
      router.push("/medicines");
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
          <CardTitle className="text-base">Identification</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field className="sm:col-span-2" data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">
              Medicine name <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="name"
              autoFocus
              placeholder="Napa Extra"
              aria-invalid={!!errors.name}
              disabled={isPending}
              {...form.register("name")}
            />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="generic_name">Generic name</FieldLabel>
            <Input
              id="generic_name"
              placeholder="Paracetamol + Caffeine"
              disabled={isPending}
              {...form.register("generic_name")}
            />
            <FieldDescription>Used when searching for a substitute.</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="brand_name">Brand name</FieldLabel>
            <Input
              id="brand_name"
              placeholder="Napa"
              disabled={isPending}
              {...form.register("brand_name")}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="category_id">Category</FieldLabel>
            <Controller
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <Select
                  value={field.value || NO_CATEGORY}
                  onValueChange={(v) => field.onChange(v === NO_CATEGORY ? "" : v)}
                  disabled={isPending}
                >
                  <SelectTrigger id="category_id">
                    <SelectValue placeholder="Uncategorised" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>Uncategorised</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="manufacturer">Manufacturer</FieldLabel>
            <Input
              id="manufacturer"
              placeholder="Beximco Pharmaceuticals"
              disabled={isPending}
              {...form.register("manufacturer")}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Presentation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field>
            <FieldLabel htmlFor="dosage_form">Dosage form</FieldLabel>
            <Controller
              control={form.control}
              name="dosage_form"
              render={({ field }) => (
                <Select
                  value={field.value || NO_CATEGORY}
                  onValueChange={(v) => field.onChange(v === NO_CATEGORY ? "" : v)}
                  disabled={isPending}
                >
                  <SelectTrigger id="dosage_form">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>Not specified</SelectItem>
                    {DOSAGE_FORMS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="strength">Strength</FieldLabel>
            <Input
              id="strength"
              placeholder="500mg"
              disabled={isPending}
              {...form.register("strength")}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="unit">Unit</FieldLabel>
            <Controller
              control={form.control}
              name="unit"
              render={({ field }) => (
                <Select
                  value={field.value || NO_CATEGORY}
                  onValueChange={(v) => field.onChange(v === NO_CATEGORY ? "" : v)}
                  disabled={isPending}
                >
                  <SelectTrigger id="unit">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>Not specified</SelectItem>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="pack_size">Pack size</FieldLabel>
            <Input
              id="pack_size"
              placeholder="10 x 10"
              disabled={isPending}
              {...form.register("pack_size")}
            />
          </Field>

          <Field className="sm:col-span-2" data-invalid={!!errors.barcode}>
            <FieldLabel htmlFor="barcode">Barcode</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="barcode"
                placeholder="8941100010015"
                inputMode="numeric"
                aria-invalid={!!errors.barcode}
                disabled={isPending}
                {...form.register("barcode")}
                ref={(el) => {
                  form.register("barcode").ref(el);
                  barcodeRef.current = el;
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={isPending}
                onClick={() => {
                  barcodeRef.current?.focus();
                  toast.info("Scan now", {
                    description: "A USB scanner types into the focused field.",
                  });
                }}
                aria-label="Scan barcode"
              >
                <ScanLine className="size-4" />
              </Button>
            </div>
            {errors.barcode ? (
              <FieldError>{errors.barcode.message}</FieldError>
            ) : (
              <FieldDescription>
                Must be unique. A handheld scanner types straight into this field.
              </FieldDescription>
            )}
          </Field>

          <Field data-invalid={!!errors.reorder_level}>
            <FieldLabel htmlFor="reorder_level">Reorder level</FieldLabel>
            <Input
              id="reorder_level"
              type="number"
              min={0}
              inputMode="numeric"
              aria-invalid={!!errors.reorder_level}
              disabled={isPending}
              {...form.register("reorder_level")}
            />
            {errors.reorder_level ? (
              <FieldError>{errors.reorder_level.message}</FieldError>
            ) : (
              <FieldDescription>Flagged as low at or below this quantity.</FieldDescription>
            )}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dispensing rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Controller
            control={form.control}
            name="prescription_required"
            render={({ field }) => (
              <CheckboxRow
                checked={field.value === true}
                onChange={field.onChange}
                disabled={isPending}
                label="Prescription required"
                hint="The POS warns the cashier before this is sold."
              />
            )}
          />

          <Controller
            control={form.control}
            name="controlled_drug"
            render={({ field }) => (
              <CheckboxRow
                checked={field.value === true}
                onChange={field.onChange}
                disabled={isPending}
                label="Controlled drug"
                hint="Subject to pharmacist approval and stricter record keeping."
              />
            )}
          />

          <Controller
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <CheckboxRow
                checked={field.value !== false}
                onChange={field.onChange}
                disabled={isPending}
                label="Active"
                hint="Inactive medicines stay in history but cannot be added to new sales."
              />
            )}
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner />}
          {isEdit ? "Save changes" : "Add medicine"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
