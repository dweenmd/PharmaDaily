import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { type SupplierRow } from "@/types";

export const getSuppliers = cache(
  async (opts: { search?: string; includeInactive?: boolean } = {}): Promise<SupplierRow[]> => {
    const supabase = await createClient();

    let query = supabase.from("suppliers").select("*").is("deleted_at", null).order("name");

    if (!opts.includeInactive) query = query.eq("is_active", true);

    if (opts.search) {
      const term = opts.search.replace(/[,()]/g, " ").trim();
      if (term) query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%`);
    }

    const { data, error } = await query.limit(500);
    return error ? [] : (data ?? []);
  },
);

export const getSupplierById = cache(async (id: string): Promise<SupplierRow | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  return error ? null : data;
});

/**
 * Purchase history for one supplier.
 *
 * RLS narrows this to the caller's own branch automatically, so a branch
 * manager sees what their outlet bought from this distributor while a super
 * admin sees every branch's dealings with them.
 */
export const getSupplierPurchases = cache(async (supplierId: string) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("purchases")
    .select("id, invoice_no, purchase_date, total_amount, paid_amount, due_amount, branch_id")
    .eq("supplier_id", supplierId)
    .is("deleted_at", null)
    .order("purchase_date", { ascending: false })
    .limit(100);

  return error ? [] : (data ?? []);
});
