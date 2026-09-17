import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type PurchaseListRow = {
  id: string;
  invoice_no: string;
  purchase_date: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  branch_id: string;
  supplier: { id: string; name: string } | null;
  branch: { id: string; name: string; code: string } | null;
};

/**
 * Purchase history.
 *
 * Branch scoping comes from RLS, not from a filter here: a branch manager sees
 * their own branch's consignments, a super admin sees every branch's. Cost
 * prices are the most commercially sensitive numbers in the system, which is
 * why that isolation lives in the database rather than in this query.
 */
export const getPurchases = cache(async (): Promise<PurchaseListRow[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("purchases")
    .select(
      `
        id, invoice_no, purchase_date, total_amount, paid_amount, due_amount, branch_id,
        supplier:suppliers ( id, name ),
        branch:branches ( id, name, code )
      `,
    )
    .is("deleted_at", null)
    .order("purchase_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return [];

  return (data ?? []).map((row) => ({
    ...row,
    supplier: Array.isArray(row.supplier) ? (row.supplier[0] ?? null) : row.supplier,
    branch: Array.isArray(row.branch) ? (row.branch[0] ?? null) : row.branch,
  })) as PurchaseListRow[];
});

export const getPurchaseById = cache(async (id: string) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("purchases")
    .select(
      `
        id, invoice_no, purchase_date, total_amount, paid_amount, due_amount,
        notes, branch_id, created_at,
        supplier:suppliers ( id, name, phone ),
        branch:branches ( id, name, code ),
        items:purchase_items (
          id, batch_no, expiry_date, quantity, cost_price, selling_price, mrp,
          medicine:medicines ( id, name, strength, unit )
        )
      `,
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;

  const unwrap = <T>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

  return {
    ...data,
    supplier: unwrap(data.supplier),
    branch: unwrap(data.branch),
    items: (data.items ?? []).map((item) => ({
      ...item,
      medicine: unwrap(item.medicine),
    })),
  };
});
