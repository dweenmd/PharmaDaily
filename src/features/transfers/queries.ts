import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { type TransferStatus } from "@/types";

export type TransferListRow = {
  id: string;
  reference_no: string;
  status: TransferStatus;
  created_at: string;
  approved_at: string | null;
  completed_at: string | null;
  notes: string | null;
  rejection_reason: string | null;
  from_branch_id: string;
  to_branch_id: string;
  from_branch: { id: string; name: string; code: string } | null;
  to_branch: { id: string; name: string; code: string } | null;
  item_count: number;
  total_units: number;
};

function unwrap<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

/**
 * Transfers this branch is involved in, either end.
 *
 * RLS returns a row when the caller's branch is the sender OR the receiver —
 * the one place a row is legitimately visible to two branches, because it is
 * about both of them.
 */
export const getTransfers = cache(async (): Promise<TransferListRow[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("stock_transfers")
    .select(
      `
        id, reference_no, status, created_at, approved_at, completed_at,
        notes, rejection_reason, from_branch_id, to_branch_id,
        from_branch:branches!stock_transfers_from_branch_id_fkey ( id, name, code ),
        to_branch:branches!stock_transfers_to_branch_id_fkey ( id, name, code ),
        items:stock_transfer_items ( id, quantity )
      `,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return [];

  return (data ?? []).map((row) => {
    const items = (row.items ?? []) as { id: string; quantity: number }[];
    return {
      ...row,
      from_branch: unwrap(row.from_branch as never),
      to_branch: unwrap(row.to_branch as never),
      item_count: items.length,
      total_units: items.reduce((sum, i) => sum + i.quantity, 0),
    };
  }) as TransferListRow[];
});

export const getTransferById = cache(async (id: string) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("stock_transfers")
    .select(
      `
        id, reference_no, status, created_at, approved_at, completed_at,
        notes, rejection_reason, from_branch_id, to_branch_id,
        from_branch:branches!stock_transfers_from_branch_id_fkey ( id, name, code ),
        to_branch:branches!stock_transfers_to_branch_id_fkey ( id, name, code ),
        requested_by:profiles!stock_transfers_transferred_by_fkey ( id, name ),
        approved_by_profile:profiles!stock_transfers_approved_by_fkey ( id, name ),
        received_by_profile:profiles!stock_transfers_received_by_fkey ( id, name ),
        items:stock_transfer_items (
          id, batch_no, quantity, received_quantity, shortfall_reason,
          medicine:medicines ( id, name, strength, unit ),
          source:branch_stocks ( id, expiry_date, selling_price )
        )
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...data,
    from_branch: unwrap(data.from_branch as never) as {
      id: string;
      name: string;
      code: string;
    } | null,
    to_branch: unwrap(data.to_branch as never) as {
      id: string;
      name: string;
      code: string;
    } | null,
    requested_by: unwrap(data.requested_by as never) as { id: string; name: string } | null,
    approved_by_profile: unwrap(data.approved_by_profile as never) as {
      id: string;
      name: string;
    } | null,
    received_by_profile: unwrap(data.received_by_profile as never) as {
      id: string;
      name: string;
    } | null,
    items: (data.items ?? []).map((item) => ({
      ...item,
      medicine: unwrap(item.medicine as never) as {
        id: string;
        name: string;
        strength: string | null;
        unit: string | null;
      } | null,
      source: unwrap(item.source as never) as {
        id: string;
        expiry_date: string;
        selling_price: number;
      } | null,
    })),
  };
});
