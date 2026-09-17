import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";

import { AddCustomerDialog } from "@/features/customers/components/add-customer-dialog";
import { getCustomers } from "@/features/customers/queries";
import { formatCurrency, toNumber } from "@/lib/format";
import { EmptyState, NoResultsState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatTile } from "@/components/shared/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomerFilters } from "@/features/customers/components/customer-filters";

export const metadata: Metadata = {
  title: "Customers",
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : undefined;
  const withDebtOnly = params.owing === "1";

  const customers = await getCustomers({ search, withDebtOnly });

  const totalOwed = customers.reduce((sum, c) => sum + toNumber(c.due_amount), 0);
  const owing = customers.filter((c) => toNumber(c.due_amount) > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Shared across every branch, so credit follows the customer rather than the outlet."
        action={<AddCustomerDialog />}
      />

      {/* Two-up from the smallest screen. A short label and a number do not
          need a full row each, and stacking them full-width leaves a "0"
          floating in a band of empty space. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatTile label="Customers" value={String(customers.length)} />
        <StatTile
          label="Owed to the pharmacy"
          value={formatCurrency(totalOwed)}
          status={totalOwed > 0 ? "warning" : "good"}
        />
        <StatTile label="With a balance" value={String(owing.length)} />
      </div>

      <CustomerFilters />

      {customers.length === 0 ? (
        search || withDebtOnly ? (
          <NoResultsState entity="customers" />
        ) : (
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Add one here, or at the counter the first time they buy something on credit."
            action={<AddCustomerDialog />}
          />
        )
      ) : (
        <Card className="overflow-hidden py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Address</TableHead>
                  <TableHead className="text-right">Owes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {customers.map((c) => {
                  const due = toNumber(c.due_amount);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                        {c.phone ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden max-w-48 truncate text-sm md:table-cell">
                        {c.email ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden max-w-xs truncate text-sm lg:table-cell">
                        {c.address ?? "—"}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${due > 0 ? "font-medium text-amber-700 dark:text-amber-500" : "text-muted-foreground"}`}
                      >
                        {formatCurrency(due)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.is_active ? "default" : "outline"}>
                          {c.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/customers/${c.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {customers.length >= 500 && (
        <p className="text-muted-foreground text-center text-xs">
          Showing the first 500. Search to narrow the list.
        </p>
      )}
    </div>
  );
}
