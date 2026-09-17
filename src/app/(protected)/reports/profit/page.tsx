import type { Metadata } from "next";

import { getAccessibleBranches } from "@/features/branches/queries";
import { ExportButtons } from "@/features/reports/components/export-buttons";
import { ReportFilters } from "@/features/reports/components/report-filters";
import { getProfitReport } from "@/features/reports/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";
import { formatCurrency, formatDate } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatTile } from "@/components/shared/stat-tile";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Profit report",
};

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async function ProfitReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();

  const from = typeof params.from === "string" ? params.from : isoDaysAgo(29);
  const to = typeof params.to === "string" ? params.to : new Date().toISOString().slice(0, 10);
  const branch = typeof params.branch === "string" ? params.branch : null;

  const superAdmin = profile ? isSuperAdmin(profile.role) : false;
  const branchFilter = superAdmin ? branch : (profile?.branch_id ?? null);

  const [branches, rows] = await Promise.all([
    getAccessibleBranches(),
    getProfitReport(from, to, branchFilter),
  ]);

  const revenue = rows.reduce((sum, r) => sum + Number(r.revenue), 0);
  const cost = rows.reduce((sum, r) => sum + Number(r.cost), 0);
  const profit = revenue - cost;
  const margin = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;

  // The widest bar in the table is the biggest contributor, so every other row
  // is read against it. A length comparison answers "which products actually
  // make us money" faster than a column of numbers does.
  const maxProfit = Math.max(1, ...rows.map((r) => Math.abs(Number(r.profit))));

  const csv: (string | number)[][] = [
    ["Medicine", "Strength", "Units sold", "Revenue", "Cost", "Profit", "Margin %"],
    ...rows.map((r) => [
      r.medicine_name,
      r.strength ?? "",
      Number(r.units_sold),
      Number(r.revenue),
      Number(r.cost),
      Number(r.profit),
      Number(r.margin_percent),
    ]),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit report"
        description={`${formatDate(from)} to ${formatDate(to)} · by medicine`}
        action={<ExportButtons filename="profit-report" rows={csv} />}
      />

      <ReportFilters branches={superAdmin ? branches : undefined} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Revenue" value={formatCurrency(revenue)} />
        <StatTile label="Cost of goods" value={formatCurrency(cost)} />
        <StatTile label="Gross profit" value={formatCurrency(profit)} />
        <StatTile
          label="Margin"
          value={`${margin}%`}
          hint="profit as a share of revenue"
          status={margin >= 20 ? "good" : margin >= 10 ? "warning" : "serious"}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing sold in this period"
          description="Profit is calculated from completed sales. Try a wider date range."
        />
      ) : (
        <Card className="viz-root overflow-hidden py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Revenue</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Cost</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="hidden w-40 md:table-cell">Contribution</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((r) => {
                  const rowProfit = Number(r.profit);
                  const share = Math.abs(rowProfit) / maxProfit;

                  return (
                    <TableRow key={r.medicine_id}>
                      <TableCell className="font-medium">
                        {[r.medicine_name, r.strength].filter(Boolean).join(" ")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(r.units_sold)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">
                        {formatCurrency(r.revenue)}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden text-right tabular-nums sm:table-cell">
                        {formatCurrency(r.cost)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(rowProfit)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {/* 4px rounded end, anchored to the baseline. */}
                        <div
                          className="h-2 rounded-r-[4px]"
                          style={{
                            width: `${Math.max(2, share * 100)}%`,
                            background:
                              rowProfit >= 0 ? "var(--viz-series-1)" : "var(--viz-critical)",
                          }}
                          role="img"
                          aria-label={`${Math.round(share * 100)}% of the largest contributor`}
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(r.margin_percent)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <p className="text-muted-foreground text-xs">
        Profit is revenue less the cost recorded on each sale line at the time it was sold, so
        restocking a batch at a new price does not restate past months. Order-level discounts are
        not apportioned across lines and appear in the sales report instead.
      </p>
    </div>
  );
}
