import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ScrollText } from "lucide-react";

import { getStockMovements } from "@/features/stock/queries";
import { formatDateTime } from "@/lib/format";
import { type StockMovementType } from "@/types";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
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

export const metadata: Metadata = {
  title: "Stock ledger",
};

const TYPE_LABELS: Record<StockMovementType, string> = {
  purchase: "Purchase",
  sale: "Sale",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
  adjustment: "Adjustment",
  return: "Return",
};

export default async function StockMovementsPage() {
  const movements = await getStockMovements(200);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/stock">
          <ArrowLeft className="size-4" />
          Back to stock
        </Link>
      </Button>

      <PageHeader
        title="Stock ledger"
        description="Every quantity change, in order. This is the record the stock balances are reconciled against — entries can be added but never edited or removed."
      />

      {movements.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No movements yet"
          description="Recording a purchase or an adjustment writes the first entry."
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="hidden md:table-cell">By</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {movements.map((m) => {
                  const isIncrease = m.quantity > 0;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {formatDateTime(m.created_at)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {[m.medicine?.name, m.medicine?.strength].filter(Boolean).join(" ") || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{m.batch_no}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{TYPE_LABELS[m.type]}</Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium tabular-nums ${
                          isIncrease
                            ? "text-emerald-700 dark:text-emerald-500"
                            : "text-red-700 dark:text-red-500"
                        }`}
                      >
                        {isIncrease ? "+" : ""}
                        {m.quantity}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                        {m.created_by_profile?.name ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
