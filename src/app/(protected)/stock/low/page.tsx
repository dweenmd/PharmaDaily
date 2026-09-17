import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, PackageCheck, Plus } from "lucide-react";

import { getStockByMedicine } from "@/features/stock/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";
import { formatDate, stockLevel } from "@/lib/format";
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
  title: "Low stock",
};

const STOCK_EDITORS = ["super_admin", "branch_manager", "stock_manager"];

export default async function LowStockPage() {
  const [profile, aggregates] = await Promise.all([getCurrentProfile(), getStockByMedicine()]);

  const showBranch = profile ? isSuperAdmin(profile.role) : false;
  const canPurchase = profile ? STOCK_EDITORS.includes(profile.role) : false;

  // Compared against the total across batches, not against a single batch —
  // five strips in one batch and five in another is ten in hand, and flagging
  // that twice would train staff to ignore the alert.
  const low = aggregates
    .map((a) => ({ ...a, level: stockLevel(a.total_quantity, a.reorder_level) }))
    .filter((a) => a.level === "critical" || a.level === "low")
    .sort((a, b) => {
      if (a.level !== b.level) return a.level === "critical" ? -1 : 1;
      return a.total_quantity / a.reorder_level - b.total_quantity / b.reorder_level;
    });

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/stock">
          <ArrowLeft className="size-4" />
          Back to stock
        </Link>
      </Button>

      <PageHeader
        title="Low stock"
        description="Medicines at or below their reorder level, counted across all batches."
        action={
          canPurchase && low.length > 0 ? (
            <Button asChild>
              <Link href="/purchases/new">
                <Plus className="size-4" />
                Create Purchase
              </Link>
            </Button>
          ) : undefined
        }
      />

      {low.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="Nothing is running low"
          description="Every medicine currently in stock is above its reorder level."
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  {showBranch && <TableHead className="hidden sm:table-cell">Branch</TableHead>}
                  <TableHead className="text-right">In stock</TableHead>
                  <TableHead className="text-right">Reorder at</TableHead>
                  <TableHead className="hidden md:table-cell">Batches</TableHead>
                  <TableHead className="hidden lg:table-cell">Earliest expiry</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {low.map((a) => (
                  <TableRow key={`${a.branch_id}:${a.medicine_id}`}>
                    <TableCell className="font-medium">
                      {[a.medicine_name, a.strength].filter(Boolean).join(" ")}
                    </TableCell>

                    {showBranch && (
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {a.branch_code ?? "—"}
                        </Badge>
                      </TableCell>
                    )}

                    <TableCell className="text-right font-medium tabular-nums">
                      {a.total_quantity}
                      {a.unit && (
                        <span className="text-muted-foreground ml-1 text-xs">{a.unit}</span>
                      )}
                    </TableCell>

                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {a.reorder_level}
                    </TableCell>

                    <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                      {a.batch_count}
                    </TableCell>

                    <TableCell className="text-muted-foreground hidden text-sm lg:table-cell">
                      {a.earliest_expiry ? formatDate(a.earliest_expiry) : "—"}
                    </TableCell>

                    <TableCell>
                      <Badge variant={a.level === "critical" ? "destructive" : "secondary"}>
                        {a.level === "critical" ? "Critical" : "Low"}
                      </Badge>
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
