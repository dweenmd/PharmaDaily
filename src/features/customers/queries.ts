import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { type CustomerRow } from "@/types";

export const getCustomers = cache(
  async (opts: { search?: string; withDebtOnly?: boolean } = {}): Promise<CustomerRow[]> => {
    const supabase = await createClient();

    let query = supabase
      .from("customers")
      .select("*")
      .is("deleted_at", null)
      .order("due_amount", { ascending: false })
      .order("name");

    if (opts.withDebtOnly) query = query.gt("due_amount", 0);

    if (opts.search) {
      const term = opts.search.replace(/[,()]/g, " ").trim();
      if (term) query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%`);
    }

    const { data, error } = await query.limit(500);
    return error ? [] : (data ?? []);
  },
);

export const getCustomerById = cache(async (id: string): Promise<CustomerRow | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  return error ? null : data;
});

/**
 * Everything that makes up a customer's balance: the invoices they still owe
 * on, and the payments they have made against them.
 *
 * Shown together because the balance is now derived from exactly these two
 * lists — if the number looks wrong, this page is where the disagreement is
 * visible rather than something to take on trust.
 *
 * Sales are branch-scoped by RLS, so a branch manager sees what this customer
 * owes at their own branch while a super admin sees the whole picture.
 */
export const getCustomerLedger = cache(async (customerId: string) => {
  const supabase = await createClient();

  const [{ data: sales }, { data: payments }] = await Promise.all([
    supabase
      .from("sales")
      .select("id, invoice_no, sale_date, created_at, total_amount, paid_amount, due_amount")
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("customer_payments")
      .select(
        `
          id, amount, method, reference, notes, created_at,
          collected_by:profiles ( id, name ),
          branch:branches ( id, code )
        `,
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const unwrap = <T>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

  return {
    sales: sales ?? [],
    payments: (payments ?? []).map((p) => ({
      ...p,
      collected_by: unwrap(p.collected_by as never) as { id: string; name: string } | null,
      branch: unwrap(p.branch as never) as { id: string; code: string } | null,
    })),
  };
});

/** Payments made to a supplier, for the supplier detail view. */
export const getSupplierPayments = cache(async (supplierId: string) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("supplier_payments")
    .select(
      `
        id, amount, method, reference, notes, created_at,
        paid_by:profiles ( id, name ),
        branch:branches ( id, code )
      `,
    )
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return [];

  const unwrap = <T>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

  return (data ?? []).map((p) => ({
    ...p,
    paid_by: unwrap(p.paid_by as never) as { id: string; name: string } | null,
    branch: unwrap(p.branch as never) as { id: string; code: string } | null,
  }));
});
