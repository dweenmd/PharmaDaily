import type { Metadata } from "next";
import Link from "next/link";
import { Receipt, ShoppingCart } from "lucide-react";

import { getSales } from "@/features/sales/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Sales",
};

const CAN_SELL = ["super_admin", "branch_manager", "cashier", "pharmacist"];

export default async function SalesPage() {
  const [profile, sales] = await Promise.all([getCurrentProfile(), getSales()]);

  const showBranch = profile ? isSuperAdmin(profile.role) : false;
  const canSell = profile ? CAN_SELL.includes(profile.role) && profile.branch_id !== null : false;

  const today = new Date().toISOString().slice(0, 10);
  const todaysSales = sales.filter((s) => s.sale_date === today);
  const todaysTakings = todaysSales.reduce((sum, s) => sum + Number(s.paid_amount), 0);
  const outstanding = sales.reduce((sum, s) => sum + Number(s.due_amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        description={showBranch ? "Every branch." : "Your branch."}
        action={
          canSell ? (
            <Button asChild>
              <Link href="/pos">
                <ShoppingCart className="size-4" />
                Open POS
              </Link>
            </Button>
          ) : undefined
        }
      />

      {sales.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No sales yet"
          description="Completed sales appear here with their invoices."
          action={
            canSell ? (
              <Button asChild>
                <Link href="/pos">
                  <ShoppingCart className="size-4" />
                  Open POS
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Sales today</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{todaysSales.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Taken today</CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {formatCurrency(todaysTakings)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Outstanding credit</CardDescription>
                <CardTitle
                  className={`text-2xl tabular-nums ${outstanding > 0 ? "text-amber-700 dark:text-amber-500" : ""}`}
                >
                  {formatCurrency(outstanding)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="overflow-hidden py-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="hidden sm:table-cell">When</TableHead>
                    <TableHead>Customer</TableHead>
                    {showBranch && <TableHead className="hidden lg:table-cell">Branch</TableHead>}
                    <TableHead className="hidden md:table-cell">Cashier</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-sm font-medium">
                        {sale.invoice_no}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden text-sm whitespace-nowrap sm:table-cell">
                        {formatDateTime(sale.created_at)}
                      </TableCell>
                      <TableCell className="max-w-40 truncate">
                        {sale.customer?.name ?? (
                          <span className="text-muted-foreground">Walk-in</span>
                        )}
                      </TableCell>
                      {showBranch && (
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {sale.branch?.code ?? "—"}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-muted-foreground hidden max-w-32 truncate text-sm md:table-cell">
                        {sale.cashier?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(sale.total_amount)}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${Number(sale.due_amount) > 0 ? "font-medium text-amber-700 dark:text-amber-500" : "text-muted-foreground"}`}
                      >
                        {formatCurrency(sale.due_amount)}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/sales/${sale.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
