"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

import {
  branchSchema,
  createBranchAction,
  updateBranchAction,
  type BranchFormValues,
  type BranchInput,
} from "@/features/branches/actions";
import { type BranchRow } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function BranchForm({ branch }: { branch?: BranchRow }) {
  const router = useRouter();
  const isEdit = Boolean(branch);
  const [isPending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<BranchFormValues, unknown, BranchInput>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: branch?.name ?? "",
      code: branch?.code ?? "",
      address: branch?.address ?? "",
      phone: branch?.phone ?? "",
      is_active: branch?.is_active ?? true,
    },
  });

  const { errors } = form.formState;
  const code = useWatch({ control: form.control, name: "code" });

  function onSubmit(values: BranchInput) {
    setFormError(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateBranchAction(branch!.id, values)
        : await createBranchAction(values);

      if (!result.ok) {
        setFormError(result.error);
        if (result.field) form.setFocus(result.field as keyof BranchFormValues);
        return;
      }

      toast.success(isEdit ? "Branch updated" : "Branch created");
      router.push("/branches");
      router.refresh();
    });
  }

  const year = new Date().getFullYear();

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      {formError && (
        <Alert variant="destructive" role="alert">
          <AlertCircle />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="grid gap-5 pt-6 sm:grid-cols-2">
          <Field className="sm:col-span-2" data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">
              Branch name <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="name"
              autoFocus
              placeholder="Dhanmondi"
              aria-invalid={!!errors.name}
              disabled={isPending}
              {...form.register("name")}
            />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.code}>
            <FieldLabel htmlFor="code">
              Branch code <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="code"
              placeholder="DHK"
              className="font-mono uppercase"
              aria-invalid={!!errors.code}
              disabled={isPending || isEdit}
              {...form.register("code")}
            />
            {errors.code ? (
              <FieldError>{errors.code.message}</FieldError>
            ) : (
              <FieldDescription>
                {isEdit
                  ? "Fixed once invoices exist — changing it would make old and new invoice numbers inconsistent."
                  : `Becomes the invoice prefix: ${(code || "DHK").toUpperCase()}-${year}-0001`}
              </FieldDescription>
            )}
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
              placeholder="House 12, Road 5, Dhanmondi, Dhaka"
              disabled={isPending}
              {...form.register("address")}
            />
            <FieldDescription>Printed on every invoice this branch issues.</FieldDescription>
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
                      An inactive branch keeps all its history but stops appearing where staff
                      choose a branch.
                    </span>
                  </span>
                </label>
              )}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner />}
          {isEdit ? "Save changes" : "Create branch"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
