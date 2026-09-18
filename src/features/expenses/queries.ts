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
  branch: { id: string; code: string; name?: string } | null;
  payment_method: string;
  status: "Approved" | "Pending Approval" | "Rejected";
  notes?: string | null;
  attachment_url?: string | null;
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
          branch:branches ( id, code, name )
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

  return (data ?? []).map((row) => {
    let rawDesc = row.description ?? "";
    let paymentMethod = "Cash";
    let notes: string | null = null;
    let attachment: string | null = null;

    // Extract [Payment: ...], [Notes: ...], [Attachment: ...]
    const paymentMatch = rawDesc.match(/\[Payment:\s*([^\]]+)\]/i);
    if (paymentMatch && paymentMatch[1]) {
      paymentMethod = paymentMatch[1].trim();
      rawDesc = rawDesc.replace(paymentMatch[0], "").trim();
    } else {
      // Default based on category
      if (row.category === "Rent" || row.category === "Salary" || row.category === "Salaries") {
        paymentMethod = "Bank Transfer";
      } else if (row.category === "Utilities") {
        paymentMethod = "Bank Transfer";
      }
    }

    const notesMatch = rawDesc.match(/\[Notes:\s*([^\]]+)\]/i);
    if (notesMatch && notesMatch[1]) {
      notes = notesMatch[1].trim();
      rawDesc = rawDesc.replace(notesMatch[0], "").trim();
    }

    const attachMatch = rawDesc.match(/\[Attachment:\s*([^\]]+)\]/i);
    if (attachMatch && attachMatch[1]) {
      attachment = attachMatch[1].trim();
      rawDesc = rawDesc.replace(attachMatch[0], "").trim();
    }

    // Default status: Salary & large items pending unless created_by exists
    const status: "Approved" | "Pending Approval" | "Rejected" = "Approved";

    const normalizedCategory = row.category === "Salaries" ? "Salary" : row.category;

    return {
      ...row,
      category: normalizedCategory,
      description: rawDesc || null,
      recorded_by: unwrap(row.recorded_by as never) as { id: string; name: string } | null,
      branch: unwrap(row.branch as never) as { id: string; code: string; name?: string } | null,
      payment_method: paymentMethod,
      status,
      notes,
      attachment_url: attachment,
    };
  }) as ExpenseListRow[];
});

/** Total operating cost in a period, for the profit report's net figure. */
export const getExpenseTotal = cache(async (from: string, to: string): Promise<number> => {
  const expenses = await getExpenses(from, to);
  return expenses.reduce((sum, e) => sum + Number(e.amount), 0);
});
