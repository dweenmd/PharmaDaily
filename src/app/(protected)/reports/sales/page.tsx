import type { Metadata } from "next";
import Link from "next/link";

import { getAccessibleBranches } from "@/features/branches/queries";
import { ExportButtons } from "@/features/reports/components/export-buttons";
import { ReportFilters } from "@/features/reports/components/report-filters";
import { getCashiers, getSalesReport, getSalesTrend } from "@/features/reports/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { type PaymentMethod } from "@/types";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatTile } from "@/components/shared/stat-tile";
import { TrendChart } from "@/components/shared/trend-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Sales report",
};

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const METHODS = ["cash", "bkash", "nagad", "card", "due"];

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

  const [branches, cashiers, rows, trend] = await Promise.all([
    getAccessibleBranches(),
    getCashiers(),
    getSalesReport(from, to, branchFilter, cashier, method),
    getSalesTrend(from, to, branchFilter),
  ]);

  const revenue = rows.reduce((sum, r) => sum + Number(r.total_amount), 0);
  const profit = rows.reduce((sum, r) => sum + Number(r.profit), 0);
  const collected = rows.reduce((sum, r) => sum + Number(r.paid_amount), 0);
  const outstanding = rows.reduce((sum, r) => sum + Number(r.due_amount), 0);
  const discounts = rows.reduce((sum, r) => sum + Number(r.discount), 0);

  const csv: (string | number)[][] = [
    [
      "Invoice",
      "Date",
      "Time",
      "Branch",
      "Cashier",
      "Customer",
      "Subtotal",
      "Discount",
      "Total",
      "Paid",
      "Due",
      "Profit",
      "Payment methods",
    ],
    ...rows.map((r) => [
      r.invoice_no,
      r.sale_date,
      formatDateTime(r.created_at),
      r.branch_code,
      r.cashier_name,
      r.customer_name,
      Number(r.subtotal),
      Number(r.discount),
      Number(r.total_amount),
      Number(r.paid_amount),
      Number(r.due_amount),
      Number(r.profit),
      r.methods,
    ]),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales report"
        description={`${formatDate(from)} to ${formatDate(to)} · ${rows.length} invoice${rows.length === 1 ? "" : "s"}`}
        action={<ExportButtons filename="sales-report" rows={csv} />}
      />

      <ReportFilters
        branches={superAdmin ? branches : undefined}
        cashiers={cashiers}
        showPaymentMethod
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatTile label="Revenue" value={formatCurrency(revenue)} />
        <StatTile label="Profit" value={formatCurrency(profit)} hint="after cost of goods" />
        <StatTile label="Collected" value={formatCurrency(collected)} />
        <StatTile
          label="Outstanding"
          value={formatCurrency(outstanding)}
          status={outstanding > 0 ? "warning" : "good"}
        />
        <StatTile label="Discounts given" value={formatCurrency(discounts)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily trend</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart
            points={trend.map((p) => ({
              day: p.day,
              revenue: Number(p.revenue),
              profit: Number(p.profit),
            }))}
          />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          title="No sales in this period"
          description="Try a wider date range, or clear the filters."
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="hidden sm:table-cell">When</TableHead>
                  {superAdmin && <TableHead className="hidden lg:table-cell">Branch</TableHead>}
                  <TableHead className="hidden md:table-cell">Cashier</TableHead>
                  <TableHead className="hidden lg:table-cell">Customer</TableHead>
                  <TableHead className="hidden xl:table-cell">Method</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="w-14 print:hidden" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.sale_id}>
                    <TableCell className="font-mono text-sm font-medium">{r.invoice_no}</TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm whitespace-nowrap sm:table-cell">
                      {formatDateTime(r.created_at)}
                    </TableCell>
                    {superAdmin && (
                      <TableCell className="hidden font-mono text-xs lg:table-cell">
                        {r.branch_code}
                      </TableCell>
                    )}
                    <TableCell className="hidden max-w-32 truncate text-sm md:table-cell">
                      {r.cashier_name}
                    </TableCell>
                    <TableCell className="hidden max-w-32 truncate text-sm lg:table-cell">
                      {r.customer_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-xs xl:table-cell">
                      {r.methods}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(r.total_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(r.profit)}
                    </TableCell>
                    <TableCell className="print:hidden">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/sales/${r.sale_id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {rows.length >= 5000 && (
        <p className="text-muted-foreground text-center text-xs">
          Showing the first 5,000 invoices. Narrow the date range to see the rest.
        </p>
      )}
    </div>
  );
}
