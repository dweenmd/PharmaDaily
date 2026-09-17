import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import {
  type DashboardKpis,
  type PaymentMethod,
  type ProfitReportRow,
  type SalesReportRow,
  type SalesTrendPoint,
  type StockReportRow,
} from "@/types";

/**
 * All of these call database functions rather than pulling rows and summing
 * them here. The functions are SECURITY INVOKER, so the same RLS applies: a
 * branch manager asking for another branch's figures gets nothing back, not
 * more.
 *
 * `branchId` is therefore a narrowing filter, never a widening one.
 */

const EMPTY_KPIS: DashboardKpis = {
  sales_count: 0,
  revenue: 0,
  profit: 0,
  collected: 0,
  outstanding: 0,
  low_stock_count: 0,
  near_expiry_count: 0,
  expired_count: 0,
};

export const getDashboardKpis = cache(
  async (date: string, branchId: string | null): Promise<DashboardKpis> => {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("dashboard_kpis", {
      p_date: date,
      p_branch_id: branchId as string,
    });

    if (error || !data || data.length === 0) return EMPTY_KPIS;
    return data[0] ?? EMPTY_KPIS;
  },
);

export const getSalesTrend = cache(
  async (from: string, to: string, branchId: string | null): Promise<SalesTrendPoint[]> => {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("sales_trend", {
      p_from: from,
      p_to: to,
      p_branch_id: branchId as string,
    });

    return error ? [] : (data ?? []);
  },
);

export const getProfitReport = cache(
  async (from: string, to: string, branchId: string | null): Promise<ProfitReportRow[]> => {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("profit_report", {
      p_from: from,
      p_to: to,
      p_branch_id: branchId as string,
    });

    return error ? [] : (data ?? []);
  },
);

export const getStockReport = cache(async (branchId: string | null): Promise<StockReportRow[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("stock_report", {
    p_branch_id: branchId as string,
  });

  return error ? [] : (data ?? []);
});

export const getSalesReport = cache(
  async (
    from: string,
    to: string,
    branchId: string | null,
    cashierId: string | null,
    method: PaymentMethod | null,
  ): Promise<SalesReportRow[]> => {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("sales_report", {
      p_from: from,
      p_to: to,
      p_branch_id: branchId as string,
      p_cashier_id: cashierId as string,
      p_payment_method: method as PaymentMethod,
    });

    return error ? [] : (data ?? []);
  },
);

/** Staff who have actually rung up a sale, for the cashier filter. */
export const getCashiers = cache(async (): Promise<{ id: string; name: string }[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name")
    .in("role", ["cashier", "branch_manager", "pharmacist", "super_admin"])
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name");

  return error ? [] : (data ?? []);
});
