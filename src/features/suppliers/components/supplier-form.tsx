"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { createSupplierAction, updateSupplierAction } from "@/features/suppliers/actions";
import {
  supplierSchema,
  type SupplierFormValues,
  type SupplierInput,
} from "@/features/suppliers/schemas";
import { type SupplierRow } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function SupplierForm({ supplier }: { supplier?: SupplierRow }) {
  const router = useRouter();
  const isEdit = Boolean(supplier);
  const [isPending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<SupplierFormValues, unknown, SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier?.name ?? "",
      phone: supplier?.phone ?? "",
      address: supplier?.address ?? "",
      is_active: supplier?.is_active ?? true,
    },
  });

  const { errors } = form.formState;

  function onSubmit(values: SupplierInput) {
    setFormError(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateSupplierAction(supplier!.id, values)
        : await createSupplierAction(values);

      if (!result.ok) {
        setFormError(result.error);
        if (result.field) form.setFocus(result.field as keyof SupplierFormValues);
        return;
      }

      toast.success(isEdit ? "Supplier updated" : "Supplier added");
      router.push("/suppliers");
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
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field className="sm:col-span-2" data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">
              Supplier name <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="name"
              autoFocus
              placeholder="Square Pharmaceuticals Ltd."
              aria-invalid={!!errors.name}
              disabled={isPending}
              {...form.register("name")}
            />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.phone}>
            <FieldLabel htmlFor="phone">Phone</FieldLabel>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              placeholder="+880 1XXX-XXXXXX"
              aria-invalid={!!errors.phone}
              disabled={isPending}
              {...form.register("phone")}
            />
            {errors.phone && <FieldError>{errors.phone.message}</FieldError>}
          </Field>

          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="address">Address</FieldLabel>
            <Input
              id="address"
              placeholder="Mohakhali, Dhaka"
              disabled={isPending}
              {...form.register("address")}
            />
          </Field>

          <Field className="sm:col-span-2">
            <Controller
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <label className="flex cursor-pointer items-start gap-3">
                  <Checkbox
                    checked={field.value !== false}
                    onCheckedChange={(v) => field.onChange(v === true)}
                    disabled={isPending}
                  />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium">Active</span>
                    <span className="text-muted-foreground block text-xs">
                      Inactive suppliers stay in purchase history but cannot be selected for new
                      purchases.
                    </span>
                  </span>
                </label>
              )}
            />
          </Field>

          {isEdit && (
            <Field className="sm:col-span-2">
              <FieldDescription>
                The outstanding balance is maintained by the purchase records and cannot be edited
                here.
              </FieldDescription>
            </Field>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner />}
          {isEdit ? "Save changes" : "Add supplier"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
