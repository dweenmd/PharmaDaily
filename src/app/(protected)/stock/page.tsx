import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, ScrollText, SlidersHorizontal, TriangleAlert } from "lucide-react";

import { STOCK_ROW_LIMIT, getStock } from "@/features/stock/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";
import { daysUntil, expiryStatus, formatCurrency, formatDate, toNumber } from "@/lib/format";
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
  title: "Stock",
};

const STOCK_EDITORS = ["super_admin", "branch_manager", "stock_manager"];

export default async function StockPage() {
  const [profile, stock] = await Promise.all([getCurrentProfile(), getStock()]);

  const canAdjust = profile ? STOCK_EDITORS.includes(profile.role) : false;
  const showBranch = profile ? isSuperAdmin(profile.role) : false;

  const stockValue = stock.reduce((sum, s) => sum + s.quantity * toNumber(s.purchase_price), 0);
  const expiringSoon = stock.filter((s) => {
    const status = expiryStatus(s.expiry_date);
    return status === "expired" || status === "critical";
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock"
        description={
          showBranch ? "Batches on hand across every branch." : "Batches on hand at your branch."
        }
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/stock/movements">
                <ScrollText className="size-4" />
                Ledger
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/stock/low">
                <TriangleAlert className="size-4" />
                Low stock
              </Link>
            </Button>
            {canAdjust && (
              <Button asChild>
                <Link href="/stock/adjustments/new">
                  <SlidersHorizontal className="size-4" />
                  Adjust stock
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {stock.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No stock on hand"
          description="Record a purchase to put stock on the shelf."
          action={
            canAdjust ? (
              <Button asChild>
                <Link href="/purchases/new">New Purchase</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Batches</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{stock.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Stock value at cost</CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {formatCurrency(stockValue)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Expired or expiring in 30 days</CardDescription>
                <CardTitle
                  className={`text-2xl tabular-nums ${expiringSoon.length > 0 ? "text-amber-700 dark:text-amber-500" : ""}`}
                >
                  {expiringSoon.length}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="overflow-hidden py-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Expiry</TableHead>
                    {showBranch && <TableHead className="hidden lg:table-cell">Branch</TableHead>}
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Cost</TableHead>
                    <TableHead className="text-right">Selling</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">MRP</TableHead>
                    <TableHead className="hidden lg:table-cell">Supplier</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {stock.map((s) => {
                    const status = expiryStatus(s.expiry_date);
                    const days = daysUntil(s.expiry_date);

                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {[s.medicine?.name, s.medicine?.strength].filter(Boolean).join(" ")}
                            </p>
                            {s.medicine?.generic_name && (
                              <p className="text-muted-foreground truncate text-xs">
                                {s.medicine.generic_name}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="font-mono text-xs">{s.batch_no}</TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm">{formatDate(s.expiry_date)}</span>
                            {status === "expired" && (
                              <Badge variant="destructive" className="w-fit">
                                Expired
                              </Badge>
                            )}
                            {status === "critical" && (
                              <span className="w-fit text-xs font-medium text-red-600 dark:text-red-500">
                                {days} days left
                              </span>
                            )}
                            {status === "warning" && (
                              <span className="w-fit text-xs text-amber-600 dark:text-amber-500">
                                {days} days left
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {showBranch && (
                          <TableCell className="hidden lg:table-cell">
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {s.branch?.code ?? "—"}
                            </Badge>
                          </TableCell>
                        )}

                        <TableCell className="text-right font-medium tabular-nums">
                          {s.quantity}
                          {s.reserved_quantity > 0 && (
                            <span className="text-muted-foreground ml-1 text-xs">
                              ({s.reserved_quantity} held)
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-muted-foreground hidden text-right tabular-nums sm:table-cell">
                          {formatCurrency(s.purchase_price)}
                        </TableCell>

                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(s.selling_price)}
                        </TableCell>

                        <TableCell className="text-muted-foreground hidden text-right tabular-nums lg:table-cell">
                          {formatCurrency(s.mrp)}
                        </TableCell>

                        <TableCell className="text-muted-foreground hidden max-w-40 truncate text-sm lg:table-cell">
                          {s.supplier?.name ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          <p className="text-muted-foreground text-xs">
            Ordered by expiry date — the soonest-expiring batch of each medicine is the one the
            counter should sell first.
          </p>

          {stock.length >= STOCK_ROW_LIMIT && (
            <p className="text-center text-xs text-amber-700 dark:text-amber-500">
              Showing the first {STOCK_ROW_LIMIT} batches by expiry date. Later-expiring batches are
              not listed.
            </p>
          )}
        </>
      )}
    </div>
  );
}
