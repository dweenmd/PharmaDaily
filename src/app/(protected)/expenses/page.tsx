import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Wallet } from "lucide-react";

import { ExpenseDialog } from "@/features/expenses/components/expense-dialog";
import { getExpenses } from "@/features/expenses/queries";
import { ReportFilters } from "@/features/reports/components/report-filters";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";
import { formatCurrency, formatDate } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatTile } from "@/components/shared/stat-tile";
import { Badge } from "@/components/ui/badge";
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
  title: "Expenses",
};

const CAN_VIEW = ["super_admin", "branch_manager"];

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await getCurrentProfile();
  if (!profile || !CAN_VIEW.includes(profile.role)) notFound();

  const params = await searchParams;
  const from = typeof params.from === "string" ? params.from : isoDaysAgo(29);
  const to = typeof params.to === "string" ? params.to : new Date().toISOString().slice(0, 10);

  const expenses = await getExpenses(from, to);
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const showBranch = isSuperAdmin(profile.role);

  const byCategory = new Map<string, number>();
  for (const expense of expenses) {
    byCategory.set(
      expense.category,
      (byCategory.get(expense.category) ?? 0) + Number(expense.amount),
    );
  }
  const topCategory = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Rent, salaries and the rest of what it costs to run the branch."
        action={profile.branch_id ? <ExpenseDialog branchId={profile.branch_id} /> : undefined}
      />

      <Suspense fallback={<div className="h-10 animate-pulse rounded-lg bg-muted/40" />}>
        <ReportFilters />
      </Suspense>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatTile
          label="Total in period"
          value={formatCurrency(total)}
          hint={`${formatDate(from)} to ${formatDate(to)}`}
        />
        <StatTile label="Entries" value={String(expenses.length)} />
        <StatTile
          label="Largest category"
          value={topCategory ? topCategory[0] : "—"}
          hint={topCategory ? formatCurrency(topCategory[1]) : undefined}
        />
      </div>

      {!profile.branch_id && (
        <p className="text-muted-foreground text-sm">
          Expenses belong to a branch. Your account is not assigned to one, so you can review them
          but not add any.
        </p>
      )}

      {expenses.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No expenses in this period"
          description="Recording operating costs is what makes the profit report reflect what the business actually kept."
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden sm:table-cell">Note</TableHead>
                  {showBranch && <TableHead className="hidden lg:table-cell">Branch</TableHead>}
                  <TableHead className="hidden md:table-cell">Recorded by</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(expense.expense_date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{expense.category}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden max-w-xs truncate text-sm sm:table-cell">
                      {expense.description ?? "—"}
                    </TableCell>
                    {showBranch && (
                      <TableCell className="hidden font-mono text-xs lg:table-cell">
                        {expense.branch?.code ?? "—"}
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground hidden max-w-32 truncate text-sm md:table-cell">
                      {expense.recorded_by?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(expense.amount)}
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
