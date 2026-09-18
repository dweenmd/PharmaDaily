import type { Metadata } from "next";

import { getAccessibleBranches } from "@/features/branches/queries";
import { getCustomers } from "@/features/customers/queries";
import {
  SalesReportClient,
  type SalesReportRecord,
  type SalesTrendDataPoint,
  type TopMedicineStat,
} from "@/features/reports/components/sales-report-client";
import {
  getCashiers,
  getProfitReport,
  getSalesReport,
  getSalesTrend,
} from "@/features/reports/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { type PaymentMethod } from "@/types";

export const metadata: Metadata = {
  title: "Sales Report · Business Intelligence",
  description: "Enterprise sales report, trend analysis, channel breakdown, and transaction ledger.",
};

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const METHODS = ["cash", "bkash", "nagad", "card", "due"];

function unwrap<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();

  const from = typeof params.from === "string" ? params.from : isoDaysAgo(29);
  const to = typeof params.to === "string" ? params.to : new Date().toISOString().slice(0, 10);
  const branch = typeof params.branch === "string" ? params.branch : null;
  const cashier = typeof params.cashier === "string" ? params.cashier : null;
  const rawMethod = typeof params.method === "string" ? params.method : null;
  const method = rawMethod && METHODS.includes(rawMethod) ? (rawMethod as PaymentMethod) : null;

  const superAdmin = profile ? isSuperAdmin(profile.role) : false;
  const branchFilter = superAdmin ? branch : (profile?.branch_id ?? null);

  const supabase = await createClient();

  // Fetch all parallel analytical datasets
  const [branches, cashiers, customersList, rows, trend, profitReport, returnsData] =
    await Promise.all([
      getAccessibleBranches(),
      getCashiers(),
      getCustomers(),
      getSalesReport(from, to, branchFilter, cashier, method),
      getSalesTrend(from, to, branchFilter),
      getProfitReport(from, to, branchFilter),
      supabase
        .from("sales_returns")
        .select("total_refund, created_at, branch_id")
        .gte("created_at", `${from}T00:00:00`)
        .lte("created_at", `${to}T23:59:59`),
    ]);

  // Compute total returns
  const returnRows = returnsData.data ?? [];
  const returnsTotal = returnRows.reduce((sum, r) => sum + Number(r.total_refund), 0);

  // Fetch item lines for sales if present
  let itemsBySaleId: Record<
    string,
    {
      items: {
        medicine_name: string;
        strength?: string;
        batch_no: string;
        quantity: number;
        unit_price: number;
        total_price: number;
      }[];
      preview: string;
    }
  > = {};

  if (rows.length > 0) {
    const saleIds = rows.slice(0, 150).map((r) => r.sale_id);
    const { data: itemRows } = await supabase
      .from("sale_items")
      .select(
        `
        sale_id, batch_no, quantity, unit_price, total_price,
        medicine:medicines ( name, strength )
      `,
      )
      .in("sale_id", saleIds);

    if (itemRows) {
      itemRows.forEach((row) => {
        const med = unwrap(row.medicine as never) as { name: string; strength: string | null } | null;
        const medicineName = med?.name ?? "Medicine";
        const strength = med?.strength ?? "";

        const existing = itemsBySaleId[row.sale_id];
        const entry = existing ?? { items: [], preview: "" };
        if (!existing) {
          itemsBySaleId[row.sale_id] = entry;
        }

        entry.items.push({
          medicine_name: medicineName,
          strength,
          batch_no: row.batch_no,
          quantity: row.quantity,
          unit_price: Number(row.unit_price),
          total_price: Number(row.total_price),
        });
      });

      // Construct previews
      Object.values(itemsBySaleId).forEach((data) => {
        const names = data.items.map((i) => `${i.medicine_name} (${i.quantity})`);
        data.preview = names.slice(0, 3).join(", ") + (names.length > 3 ? "..." : "");
      });
    }
  }

  // Map Sales Rows to SalesReportRecord
  const initialSales: SalesReportRecord[] = rows.map((r) => {
    const itemsData = itemsBySaleId[r.sale_id];
    const rawMethodKey = (r.methods || "cash").toLowerCase();
    const paymentMethod: "cash" | "bkash" | "nagad" | "card" | "due" | "split" =
      rawMethodKey.includes("bkash")
        ? "bkash"
        : rawMethodKey.includes("nagad")
          ? "nagad"
          : rawMethodKey.includes("card")
            ? "card"
            : rawMethodKey.includes("due")
              ? "due"
              : "cash";

    const branchName =
      branches.find((b) => b.code === r.branch_code || b.id === r.branch_code)?.name ??
      `Branch ${r.branch_code}`;

    return {
      id: r.sale_id,
      invoice_no: r.invoice_no,
      date: r.sale_date,
      created_at: r.created_at,
      customer_name: r.customer_name || "Walk-in Customer",
      cashier_name: r.cashier_name || "Cashier",
      branch_code: r.branch_code,
      branch_name: branchName,
      items_count: itemsData?.items.length || 1,
      items_preview: itemsData?.preview || "Standard prescription items",
      items: itemsData?.items,
      gross: Number(r.subtotal),
      discount: Number(r.discount),
      returns: 0,
      net: Number(r.total_amount),
      paid: Number(r.paid_amount),
      due: Number(r.due_amount),
      profit: Number(r.profit),
      payment_method: paymentMethod,
      payment_label: r.methods || "Cash",
    };
  });

  // Map Trend Data Points
  const initialTrend: SalesTrendDataPoint[] = trend.map((t) => ({
    day: t.day,
    formatted_day: formatDate(t.day),
    gross: Number(t.revenue) + (t.profit ? Number(t.profit) * 0.1 : 0),
    discount: 0,
    returns: 0,
    net: Number(t.revenue),
    profit: Number(t.profit),
    bills: Number(t.sales_count),
  }));

  // Map Top Medicines
  const initialTopMedicines: TopMedicineStat[] = (profitReport ?? [])
    .slice(0, 10)
    .map((item, idx) => ({
      rank: idx + 1,
      medicine_id: item.medicine_id,
      medicine_name: item.medicine_name,
      strength: item.strength,
      units_sold: Number(item.units_sold),
      revenue: Number(item.revenue),
      profit: Number(item.profit),
      margin_percent: Math.round(Number(item.margin_percent) * 10) / 10,
    }));

  const initialCustomers = [
    { id: "all", name: "All Customers" },
    { id: "walkin", name: "Walk-in Customer" },
    ...customersList.map((c) => ({
      id: c.id,
      name: `${c.name}${c.phone ? ` (${c.phone})` : ""}`,
    })),
  ];

  const initialBranches = branches.map((b) => ({
    id: b.id,
    name: b.name,
    code: b.code,
  }));

  return (
    <SalesReportClient
      initialSales={initialSales}
      initialBranches={initialBranches}
      initialCashiers={cashiers}
      initialCustomers={initialCustomers}
      initialTopMedicines={initialTopMedicines}
      initialTrend={initialTrend}
      initialReturnsTotal={returnsTotal}
      dateRange={{ from, to }}
      isSuperAdmin={superAdmin}
    />
  );
}
