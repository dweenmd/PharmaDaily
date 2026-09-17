"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  customerSchema,
  saleSchema,
  salesReturnSchema,
  type CustomerInput,
  type SaleInput,
  type SalesReturnInput,
} from "@/features/sales/schemas";
import { type ActionResult } from "@/features/medicines/schemas";

/**
 * Completes a sale.
 *
 * Note what is NOT sent: prices. The client sends a batch and a quantity, and
 * create_sale() reads selling_price from branch_stocks itself. A price arriving
 * from the browser would be a price anyone could choose.
 */
export async function createSaleAction(input: SaleInput): Promise<ActionResult<string>> {
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid sale" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_sale", {
    p_branch_id: parsed.data.branch_id,
    // `supabase gen types` does not model nullability of function arguments,
    // so it types every uuid parameter as non-null. NULL here is correct and
    // expected — it is how create_sale() is told this is a walk-in customer.
    p_customer_id: parsed.data.customer_id as string,
    p_discount: parsed.data.discount,
    p_items: parsed.data.items.map((i) => ({
      branch_stock_id: i.branch_stock_id,
      quantity: i.quantity,
    })),
    p_payments: parsed.data.payments.map((p) => ({
      method: p.method,
      amount: p.amount,
      reference: p.reference,
    })),
    p_discount_override_token: parsed.data.discount_override_token as string,
  });

  if (error) {
    // create_sale() raises this specific message when the discount needs a
    // manager's sign-off — distinguished from the generic 42501 below so the
    // POS can open the approval dialog instead of a dead-end error.
    if (error.code === "42501" && /needs a manager's approval/.test(error.message)) {
      return { ok: false, error: error.message, field: "discount" };
    }
    if (error.code === "42501" && /approval has expired/.test(error.message)) {
      return { ok: false, error: error.message, field: "discount" };
    }
    if (error.code === "42501") {
      return { ok: false, error: "You do not have permission to complete sales." };
    }
    // create_sale() raises messages written for a cashier — "Only 3 of Napa
    // left in batch B12" — so they go straight to the screen.
    return { ok: false, error: error.message || "Could not complete the sale." };
  }

  revalidatePath("/sales");
  revalidatePath("/stock");
  return { ok: true, data: data as unknown as string };
}

export async function createSalesReturnAction(
  input: SalesReturnInput,
): Promise<ActionResult<string>> {
  const parsed = salesReturnSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid return", field: issue?.path.join(".") };
  }

  const reason = parsed.data.reason_detail
    ? `${parsed.data.reason}: ${parsed.data.reason_detail}`
    : parsed.data.reason;

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_sales_return", {
    p_sale_id: parsed.data.sale_id,
    p_items: parsed.data.items,
    p_reason: reason,
    p_refund_method: parsed.data.refund_method,
  });

  if (error) {
    if (error.code === "42501") {
      return { ok: false, error: "You do not have permission to process returns." };
    }
    return { ok: false, error: error.message || "Could not process the return." };
  }

  revalidatePath("/sales");
  revalidatePath(`/sales/${parsed.data.sale_id}`);
  revalidatePath("/stock");
  return { ok: true, data: data as unknown as string };
}

/**
 * Registers a walk-in customer from the POS.
 *
 * Any signed-in user may do this, cashiers included — taking a name and a
 * phone number is part of taking a sale on credit.
 */
export async function createCustomerAction(
  input: CustomerInput,
): Promise<
  ActionResult<{ id: string; name: string; phone: string | null; email: string | null; due_amount: number }>
> {
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid input", field: issue?.path[0] as string };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .insert(parsed.data)
    .select("id, name, phone, email, due_amount")
    .single();

  if (error) {
    if (error.code === "23505") {
      if (error.message.includes("customers_email_unique_live")) {
        return {
          ok: false,
          error: "A customer with this email already exists.",
          field: "email",
        };
      }
      return {
        ok: false,
        error: "A customer with this phone number already exists.",
        field: "phone",
      };
    }
    return { ok: false, error: "Could not save the customer." };
  }

  revalidatePath("/customers");
  return { ok: true, data: { ...data, due_amount: Number(data.due_amount) } };
}
