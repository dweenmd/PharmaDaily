import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { type CashMovementType } from "@/types";

export type CashSession = {
  id: string;
  branch_id: string;
  opening_float: number;
  counted_cash: number | null;
  expected_cash: number | null;
  variance: number | null;
  variance_reason: string | null;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
  opened_by_profile: { id: string; name: string } | null;
  closed_by_profile: { id: string; name: string } | null;
  branch: { id: string; name: string; code: string } | null;
};

export type CashMovement = {
  id: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  created_at: string;
  created_by_profile: { id: string; name: string } | null;
};

function unwrap<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

const SESSION_SELECT = `
  id, branch_id, opening_float, counted_cash, expected_cash, variance,
  variance_reason, opened_at, closed_at, notes,
  opened_by_profile:profiles!cash_sessions_opened_by_fkey ( id, name ),
  closed_by_profile:profiles!cash_sessions_closed_by_fkey ( id, name ),
  branch:branches ( id, name, code )
`;

function normaliseSession(row: Record<string, unknown>): CashSession {
  return {
    ...row,
    opened_by_profile: unwrap(row.opened_by_profile as never),
    closed_by_profile: unwrap(row.closed_by_profile as never),
    branch: unwrap(row.branch as never),
  } as CashSession;
}

/** The till session currently open at this branch, if any. */
export const getOpenSession = cache(async (): Promise<CashSession | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cash_sessions")
    .select(SESSION_SELECT)
    .is("closed_at", null)
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return normaliseSession(data as never);
});

export const getSessionHistory = cache(async (limit = 60): Promise<CashSession[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cash_sessions")
    .select(SESSION_SELECT)
    .not("closed_at", "is", null)
    .order("opened_at", { ascending: false })
    .limit(limit);

  return error ? [] : (data ?? []).map((row) => normaliseSession(row as never));
});

/**
 * What the records say should be in the drawer right now.
 *
 * Computed by the database on every read rather than stored, so nobody can
 * adjust it to match a count that has already been taken.
 */
export const getExpectedCash = cache(async (sessionId: string): Promise<number> => {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("cash_session_expected", {
    p_session_id: sessionId,
  });

  return error ? 0 : Number(data ?? 0);
});

export const getSessionMovements = cache(async (sessionId: string): Promise<CashMovement[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cash_movements")
    .select(
      `
        id, type, amount, reason, created_at,
        created_by_profile:profiles ( id, name )
      `,
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) return [];

  return (data ?? []).map((row) => ({
    ...row,
    created_by_profile: unwrap(row.created_by_profile as never) as {
      id: string;
      name: string;
    } | null,
  })) as CashMovement[];
});

/**
 * The takings that make up the expected figure, broken down.
 *
 * Shown alongside the total so a cashier closing the till can see WHERE the
 * number came from. "The system says 12,400" is not something anyone can
 * check; "opening 2,000 + cash sales 9,800 + collections 900 - payouts 300"
 * is.
 */
export const getSessionBreakdown = cache(async (session: CashSession) => {
  const supabase = await createClient();
  const until = session.closed_at ?? new Date().toISOString();

  const [{ data: salesCash }, { data: collections }, { data: refunds }] = await Promise.all([
    supabase
      .from("payments")
      .select("amount")
      .eq("branch_id", session.branch_id)
      .eq("method", "cash")
      .gte("created_at", session.opened_at)
      .lt("created_at", until),
    supabase
      .from("customer_payments")
      .select("amount")
      .eq("branch_id", session.branch_id)
      .eq("method", "cash")
      .gte("created_at", session.opened_at)
      .lt("created_at", until),
    supabase
      .from("sales_returns")
      .select("total_refund")
      .eq("branch_id", session.branch_id)
      .eq("refund_method", "cash")
      .gte("created_at", session.opened_at)
      .lt("created_at", until),
  ]);

  const sum = (rows: { amount: number }[] | null) =>
    (rows ?? []).reduce((total, r) => total + Number(r.amount), 0);

  return {
    salesCash: sum(salesCash),
    collections: sum(collections),
    refunds: (refunds ?? []).reduce((total, r) => total + Number(r.total_refund), 0),
  };
});
