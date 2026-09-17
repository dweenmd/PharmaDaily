import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type SellableBatch = {
  branch_stock_id: string;
  medicine_id: string;
  medicine_name: string;
  generic_name: string | null;
  strength: string | null;
  unit: string | null;
  barcode: string | null;
  prescription_required: boolean;
  controlled_drug: boolean;
  batch_no: string;
  expiry_date: string;
  available: number;
  selling_price: number;
  mrp: number;
};

function unwrap<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

/**
 * Everything the counter can sell, one row per batch.
 *
 * Ordered by medicine, then expiry ascending — FEFO. The POS offers whichever
 * batch of a medicine comes first in this list, which is the soonest-expiring
 * one that still has stock. Selling newest-first is how a pharmacy ends up
 * writing off shelves of expired product.
 *
 * Expired batches are excluded outright rather than warned about: the warning
 * is for stock expiring soon, while stock that has already expired must not
 * reach a customer at all.
 *
 * Loaded once when the POS opens and held in the client. A counter cannot wait
 * for a round trip between scanning an item and the next, and Phase 6 caches
 * exactly this shape in IndexedDB for offline billing.
 */
export const getSellableStock = cache(async (): Promise<SellableBatch[]> => {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("branch_stocks")
    .select(
      `
        id, medicine_id, batch_no, expiry_date, quantity, reserved_quantity,
        selling_price, mrp,
        medicine:medicines (
          id, name, generic_name, strength, unit, barcode,
          prescription_required, controlled_drug, is_active
        )
      `,
    )
    .gt("quantity", 0)
    .eq("is_active", true)
    .gte("expiry_date", today)
    .order("expiry_date", { ascending: true })
    .limit(2000);

  if (error) return [];

  return (data ?? [])
    .map((row) => {
      const medicine = unwrap(row.medicine as never) as {
        id: string;
        name: string;
        generic_name: string | null;
        strength: string | null;
        unit: string | null;
        barcode: string | null;
        prescription_required: boolean;
        controlled_drug: boolean;
        is_active: boolean;
      } | null;

      if (!medicine || !medicine.is_active) return null;

      return {
        branch_stock_id: row.id,
        medicine_id: row.medicine_id,
        medicine_name: medicine.name,
        generic_name: medicine.generic_name,
        strength: medicine.strength,
        unit: medicine.unit,
        barcode: medicine.barcode,
        prescription_required: medicine.prescription_required,
        controlled_drug: medicine.controlled_drug,
        batch_no: row.batch_no,
        expiry_date: row.expiry_date,
        available: row.quantity - row.reserved_quantity,
        selling_price: Number(row.selling_price),
        mrp: Number(row.mrp),
      } satisfies SellableBatch;
    })
    .filter((row): row is SellableBatch => row !== null && row.available > 0);
});

// ---------------------------------------------------------------------------

export type SaleListRow = {
  id: string;
  invoice_no: string;
  sale_date: string;
  created_at: string;
  subtotal: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  branch_id: string;
  customer: { id: string; name: string; phone: string | null; email: string | null } | null;
  cashier: { id: string; name: string } | null;
  branch: { id: string; name: string; code: string } | null;
};

export const getSales = cache(async (limit = 200): Promise<SaleListRow[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sales")
    .select(
      `
        id, invoice_no, sale_date, created_at, subtotal, discount,
        total_amount, paid_amount, due_amount, branch_id,
        customer:customers ( id, name, phone, email ),
        cashier:profiles ( id, name ),
        branch:branches ( id, name, code )
      `,
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];

  return (data ?? []).map((row) => ({
    ...row,
    customer: unwrap(row.customer as never),
    cashier: unwrap(row.cashier as never),
    branch: unwrap(row.branch as never),
  })) as SaleListRow[];
});

/** Full sale with lines, payments and how much of each line has been returned. */
export const getSaleById = cache(async (id: string) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sales")
    .select(
      `
        id, invoice_no, sale_date, created_at, subtotal, discount,
        total_amount, paid_amount, due_amount, branch_id,
        customer:customers ( id, name, phone, email, address ),
        cashier:profiles ( id, name ),
        branch:branches ( id, name, code, address, phone ),
        items:sale_items (
          id, batch_no, quantity, unit_price, total_price, branch_stock_id,
          medicine:medicines ( id, name, strength, unit )
        ),
        payments ( id, method, amount, reference, created_at )
      `,
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;

  const itemIds = (data.items ?? []).map((i) => i.id);

  // How much of each line has already come back, so the return screen can cap
  // what is still returnable rather than letting a line be refunded twice.
  const returnedByItem = new Map<string, number>();
  if (itemIds.length > 0) {
    const { data: returned } = await supabase
      .from("sales_return_items")
      .select("sale_item_id, quantity")
      .in("sale_item_id", itemIds);

    for (const row of returned ?? []) {
      returnedByItem.set(
        row.sale_item_id,
        (returnedByItem.get(row.sale_item_id) ?? 0) + row.quantity,
      );
    }
  }

  return {
    ...data,
    customer: unwrap(data.customer as never) as {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
      address: string | null;
    } | null,
    cashier: unwrap(data.cashier as never) as { id: string; name: string } | null,
    branch: unwrap(data.branch as never) as {
      id: string;
      name: string;
      code: string;
      address: string | null;
      phone: string | null;
    } | null,
    items: (data.items ?? []).map((item) => ({
      ...item,
      medicine: unwrap(item.medicine as never) as {
        id: string;
        name: string;
        strength: string | null;
        unit: string | null;
      } | null,
      returned_quantity: returnedByItem.get(item.id) ?? 0,
    })),
  };
});

/** Looks a sale up by the invoice number staff type in, case-insensitively. */
export const getSaleByInvoiceNo = cache(async (invoiceNo: string) => {
  const supabase = await createClient();

  const { data } = await supabase
    .from("sales")
    .select("id")
    .ilike("invoice_no", invoiceNo.trim())
    .is("deleted_at", null)
    .maybeSingle();

  return data ? getSaleById(data.id) : null;
});
