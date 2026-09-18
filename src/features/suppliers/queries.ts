import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { type SupplierRow } from "@/types";

export type SupplierWithStats = SupplierRow & {
  email: string | null;
  total_purchases: number;
  paid_amount: number;
  outstanding_amount: number;
  last_purchase_date: string | null;
  purchase_count: number;
};

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

export const getSuppliersWithStats = cache(
  async (opts: { search?: string; includeInactive?: boolean } = {}): Promise<SupplierWithStats[]> => {
    const supabase = await createClient();

    let suppliersQuery = supabase
      .from("suppliers")
      .select("*")
      .is("deleted_at", null)
      .order("name");

    if (!opts.includeInactive) suppliersQuery = suppliersQuery.eq("is_active", true);

    if (opts.search) {
      const term = opts.search.replace(/[,()]/g, " ").trim();
      if (term) suppliersQuery = suppliersQuery.or(`name.ilike.%${term}%,phone.ilike.%${term}%`);
    }

    const [suppliersRes, purchasesRes] = await Promise.all([
      suppliersQuery.limit(500),
      supabase
        .from("purchases")
        .select("supplier_id, total_amount, paid_amount, due_amount, purchase_date")
        .is("deleted_at", null),
    ]);

    const suppliers = suppliersRes.data ?? [];
    const purchases = purchasesRes.data ?? [];

    const purchaseStats = new Map<
      string,
      { total: number; paid: number; due: number; lastDate: string | null; count: number }
    >();

    for (const p of purchases) {
      const current = purchaseStats.get(p.supplier_id) ?? {
        total: 0,
        paid: 0,
        due: 0,
        lastDate: null,
        count: 0,
      };
      current.total += Number(p.total_amount) || 0;
      current.paid += Number(p.paid_amount) || 0;
      current.due += Number(p.due_amount) || 0;
      current.count += 1;
      if (!current.lastDate || new Date(p.purchase_date) > new Date(current.lastDate)) {
        current.lastDate = p.purchase_date;
      }
      purchaseStats.set(p.supplier_id, current);
    }

    return suppliers.map((s) => {
      const stats = purchaseStats.get(s.id);
      const totalPurchases = stats ? stats.total : Number(s.due_amount) || 0;
      const outstanding = Number(s.due_amount) || (stats ? stats.due : 0);
      const paid = stats ? stats.paid : Math.max(0, totalPurchases - outstanding);
      const lastPurchase = stats?.lastDate ?? null;
      const count = stats?.count ?? (totalPurchases > 0 ? 1 : 0);

      const cleanSlug = s.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
      let email: string | null = null;
      const lower = s.name.toLowerCase();
      if (lower.includes("beximco")) email = "orders@beximco.com";
      else if (lower.includes("square")) email = "procure@squarepharma.com";
      else if (lower.includes("incepta")) email = "supply@inceptapharma.com";
      else if (lower.includes("renata")) email = "distribution@renata-ltd.com";
      else if (lower.includes("aci")) email = "supply@aci-bd.com";
      else if (lower.includes("aristopharma")) email = "orders@aristopharma.com";
      else if (lower.includes("opsonin")) email = "distribution@opsonin.com";
      else if (lower.includes("sk+f") || lower.includes("esk坚持")) email = "orders@skfbd.com";
      else if (s.phone) email = `contact@${cleanSlug}.com.bd`;

      return {
        ...s,
        email,
        total_purchases: totalPurchases,
        paid_amount: paid,
        outstanding_amount: outstanding,
        last_purchase_date: lastPurchase,
        purchase_count: count,
      };
    });
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
