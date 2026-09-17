import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type StockRow = {
  id: string;
  branch_id: string;
  medicine_id: string;
  batch_no: string;
  expiry_date: string;
  quantity: number;
  reserved_quantity: number;
  purchase_price: number;
  selling_price: number;
  mrp: number;
  received_date: string;
  is_active: boolean;
  medicine: {
    id: string;
    name: string;
    generic_name: string | null;
    strength: string | null;
    unit: string | null;
    reorder_level: number;
  } | null;
  supplier: { id: string; name: string } | null;
  branch: { id: string; name: string; code: string } | null;
};

const STOCK_SELECT = `
  id, branch_id, medicine_id, batch_no, expiry_date, quantity, reserved_quantity,
  purchase_price, selling_price, mrp, received_date, is_active,
  medicine:medicines ( id, name, generic_name, strength, unit, reorder_level ),
  supplier:suppliers ( id, name ),
  branch:branches ( id, name, code )
`;

function unwrap<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function normalise(rows: Record<string, unknown>[]): StockRow[] {
  return rows.map((row) => ({
    ...row,
    medicine: unwrap(row.medicine as never),
    supplier: unwrap(row.supplier as never),
    branch: unwrap(row.branch as never),
  })) as StockRow[];
}

/**
 * Stock on hand.
 *
 * One row per batch, ordered by expiry so the soonest-expiring batch of a
 * medicine reads first — the same FEFO ordering the POS will follow in
 * Phase 3, so what staff see here matches what gets sold.
 *
 * Branch scoping comes from RLS, not from a filter here.
 */
export const getStock = cache(
  async (opts: { search?: string; includeEmpty?: boolean } = {}): Promise<StockRow[]> => {
    const supabase = await createClient();

    let query = supabase
      .from("branch_stocks")
      .select(STOCK_SELECT)
      .order("expiry_date", { ascending: true })
      .limit(1000);

    if (!opts.includeEmpty) query = query.gt("quantity", 0);

    const { data, error } = await query;
    if (error) return [];

    let rows = normalise((data ?? []) as never);

    // Filtering on an embedded relation is awkward in PostgREST, and the row
    // count here is bounded by the query above, so this last step happens in
    // memory rather than contorting the query.
    if (opts.search) {
      const term = opts.search.toLowerCase().trim();
      rows = rows.filter(
        (r) =>
          r.medicine?.name.toLowerCase().includes(term) ||
          r.medicine?.generic_name?.toLowerCase().includes(term) ||
          r.batch_no.toLowerCase().includes(term),
      );
    }

    return rows;
  },
);

export type StockAggregate = {
  medicine_id: string;
  medicine_name: string;
  strength: string | null;
  unit: string | null;
  reorder_level: number;
  branch_id: string;
  branch_code: string | null;
  total_quantity: number;
  batch_count: number;
  earliest_expiry: string | null;
};

/**
 * Stock totalled per medicine per branch, for the low-stock view.
 *
 * The comparison has to be against the total across batches, not against any
 * single batch: five strips in one batch and five in another is ten in hand,
 * and flagging that as low twice would train staff to ignore the alert.
 */
export const getStockByMedicine = cache(async (): Promise<StockAggregate[]> => {
  const rows = await getStock({ includeEmpty: false });

  const byKey = new Map<string, StockAggregate>();

  for (const row of rows) {
    if (!row.medicine) continue;
    const key = `${row.branch_id}:${row.medicine_id}`;
    const existing = byKey.get(key);

    if (existing) {
      existing.total_quantity += row.quantity;
      existing.batch_count += 1;
      if (!existing.earliest_expiry || row.expiry_date < existing.earliest_expiry) {
        existing.earliest_expiry = row.expiry_date;
      }
    } else {
      byKey.set(key, {
        medicine_id: row.medicine_id,
        medicine_name: row.medicine.name,
        strength: row.medicine.strength,
        unit: row.medicine.unit,
        reorder_level: row.medicine.reorder_level,
        branch_id: row.branch_id,
        branch_code: row.branch?.code ?? null,
        total_quantity: row.quantity,
        batch_count: 1,
        earliest_expiry: row.expiry_date,
      });
    }
  }

  return [...byKey.values()];
});

/** Recent ledger entries, newest first. */
export const getStockMovements = cache(async (limit = 100) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("stock_movements")
    .select(
      `
        id, batch_no, type, quantity, reference_type, created_at, branch_id,
        medicine:medicines ( id, name, strength ),
        created_by_profile:profiles ( id, name )
      `,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];

  return (data ?? []).map((row) => ({
    ...row,
    medicine: unwrap(row.medicine as never) as {
      id: string;
      name: string;
      strength: string | null;
    } | null,
    created_by_profile: unwrap(row.created_by_profile as never) as {
      id: string;
      name: string;
    } | null,
  }));
});
