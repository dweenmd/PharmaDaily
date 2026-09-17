import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type ExpenseListRow = {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  branch_id: string;
  created_at: string;
  recorded_by: { id: string; name: string } | null;
  branch: { id: string; code: string } | null;
};

/**
 * Operating costs for a period.
 *
 * Branch-scoped by RLS. These are what turn the gross margin the profit report
 * shows into something an owner would recognise as profit.
 */
export const getExpenses = cache(async (from: string, to: string): Promise<ExpenseListRow[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .select(
      `
          id, category, description, amount, expense_date, branch_id, created_at,
          recorded_by:profiles ( id, name ),
          branch:branches ( id, code )
        `,
    )
    .is("deleted_at", null)
    .gte("expense_date", from)
    .lte("expense_date", to)
    .order("expense_date", { ascending: false })
    .limit(500);

  if (error) return [];

  const unwrap = <T>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

  return (data ?? []).map((row) => ({
    ...row,
    recorded_by: unwrap(row.recorded_by as never) as { id: string; name: string } | null,
    branch: unwrap(row.branch as never) as { id: string; code: string } | null,
  })) as ExpenseListRow[];
});

/** Total operating cost in a period, for the profit report's net figure. */
export const getExpenseTotal = cache(async (from: string, to: string): Promise<number> => {
  const expenses = await getExpenses(from, to);
  return expenses.reduce((sum, e) => sum + Number(e.amount), 0);
});
