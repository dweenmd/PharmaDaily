"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { PAYMENT_METHODS } from "@/features/sales/schemas";
import { customerSchema, type CustomerInput } from "@/features/sales/schemas";
import { type ActionResult } from "@/features/medicines/schemas";

export const paymentSchema = z.object({
  amount: z.coerce.number().positive("Enter an amount greater than zero"),
  // 'due' is excluded: settling a debt with a debt is not a payment.
  method: z.enum(["cash", "bkash", "nagad", "card"]),
  reference: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  notes: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
});

export type PaymentFormValues = z.input<typeof paymentSchema>;
export type PaymentInput = z.output<typeof paymentSchema>;

/**
 * Records a customer paying off credit.
 *
 * Goes through record_customer_payment(), which writes an append-only ledger
 * row and then RECOMPUTES the balance from source records. It does not
 * decrement a number — so a double-submitted form cannot push the balance
 * below what is actually owed, and the balance can always be re-derived if it
 * ever looks wrong.
 */
export async function recordCustomerPaymentAction(
  customerId: string,
  branchId: string,
  input: PaymentInput,
): Promise<ActionResult<string>> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Invalid payment",
      field: issue?.path[0] as string,
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("record_customer_payment", {
    p_customer_id: customerId,
    p_branch_id: branchId,
    p_amount: parsed.data.amount,
    p_method: parsed.data.method,
    p_reference: parsed.data.reference ?? undefined,
    p_notes: parsed.data.notes ?? undefined,
  });

  if (error) {
    if (error.code === "42501") {
      return { ok: false, error: "You do not have permission to collect payments." };
    }
    // The function's own messages name the actual outstanding figure, which is
    // exactly what the person at the counter needs to see.
    return { ok: false, error: error.message || "Could not record the payment." };
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  return { ok: true, data: data as unknown as string };
}

export async function recordSupplierPaymentAction(
  supplierId: string,
  branchId: string,
  input: PaymentInput,
): Promise<ActionResult<string>> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Invalid payment",
      field: issue?.path[0] as string,
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("record_supplier_payment", {
    p_supplier_id: supplierId,
    p_branch_id: branchId,
    p_amount: parsed.data.amount,
    p_method: parsed.data.method,
    p_reference: parsed.data.reference ?? undefined,
    p_notes: parsed.data.notes ?? undefined,
  });

  if (error) {
    if (error.code === "42501") {
      return { ok: false, error: "Only a manager can pay a supplier." };
    }
    return { ok: false, error: error.message || "Could not record the payment." };
  }

  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${supplierId}`);
  return { ok: true, data: data as unknown as string };
}

export async function updateCustomerAction(
  id: string,
  input: CustomerInput,
): Promise<ActionResult<string>> {
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid input", field: issue?.path[0] as string };
  }

  const supabase = await createClient();

  // due_amount is not in this schema and not in the UPDATE grant, so there is
  // no path from this form to the balance.
  const { error } = await supabase
    .from("customers")
    .update(parsed.data)
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    if (error.code === "23505") {
      if (error.message.includes("customers_email_unique_live")) {
        return {
          ok: false,
          error: "Another customer already uses this email.",
          field: "email",
        };
      }
      return {
        ok: false,
        error: "Another customer already uses this phone number.",
        field: "phone",
      };
    }
    return { ok: false, error: "Could not save the customer." };
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return { ok: true, data: id };
}

export { PAYMENT_METHODS };
