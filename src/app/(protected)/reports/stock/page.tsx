import type { Metadata } from "next";

import { getAccessibleBranches } from "@/features/branches/queries";
import { ExportButtons } from "@/features/reports/components/export-buttons";
import { ReportFilters } from "@/features/reports/components/report-filters";
import { getStockReport } from "@/features/reports/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";
import { formatCurrency } from "@/lib/format";
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
  title: "Stock report",
};

export default async function StockReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();

  const branch = typeof params.branch === "string" ? params.branch : null;
  const superAdmin = profile ? isSuperAdmin(profile.role) : false;
  const branchFilter = superAdmin ? branch : (profile?.branch_id ?? null);

  const [branches, rows] = await Promise.all([
    getAccessibleBranches(),
    getStockReport(branchFilter),
  ]);

  const costValue = rows.reduce((sum, r) => sum + Number(r.cost_value), 0);
  const retailValue = rows.reduce((sum, r) => sum + Number(r.retail_value), 0);
  const units = rows.reduce((sum, r) => sum + Number(r.total_quantity), 0);
  const batches = rows.reduce((sum, r) => sum + Number(r.batch_count), 0);

  // What the stock on the shelf would earn if every unit sold at its current
  // price. Not a forecast — a ceiling.
  const potentialMargin = retailValue - costValue;

  const csv: (string | number)[][] = [
    ["Branch", "Category", "Supplier", "Batches", "Units", "Cost value", "Retail value"],
    ...rows.map((r) => [
      r.branch_code,
      r.category_name,
      r.supplier_name,
      Number(r.batch_count),
      Number(r.total_quantity),
      Number(r.cost_value),
      Number(r.retail_value),
    ]),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock report"
        description="Value on hand, grouped by category and supplier."
        action={<ExportButtons filename="stock-report" rows={csv} />}
      />

      <ReportFilters branches={superAdmin ? branches : undefined} showDateRange={false} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Stock value at cost" value={formatCurrency(costValue)} />
        <StatTile label="Value at retail" value={formatCurrency(retailValue)} />
        <StatTile
          label="Potential margin"
          value={formatCurrency(potentialMargin)}
          hint="if every unit sells at today's price"
        />
        <StatTile
          label="Units on hand"
          value={units.toLocaleString()}
          hint={`${batches} batches`}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No stock on hand"
          description="Record a purchase to put stock on the shelf."
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {superAdmin && <TableHead>Branch</TableHead>}
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden sm:table-cell">Supplier</TableHead>
                  <TableHead className="text-right">Batches</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">At cost</TableHead>
                  <TableHead className="hidden text-right md:table-cell">At retail</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={`${r.branch_id}-${r.category_name}-${r.supplier_name}-${i}`}>
                    {superAdmin && (
                      <TableCell className="font-mono text-xs">{r.branch_code}</TableCell>
                    )}
                    <TableCell className="font-medium">{r.category_name}</TableCell>
                    <TableCell className="text-muted-foreground hidden max-w-40 truncate text-sm sm:table-cell">
                      {r.supplier_name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(r.batch_count)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(r.total_quantity)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(r.cost_value)}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-right tabular-nums md:table-cell">
                      {formatCurrency(r.retail_value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
