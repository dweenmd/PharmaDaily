import type { Metadata } from "next";
import Link from "next/link";
import { Package, Plus } from "lucide-react";

import { getPurchases } from "@/features/purchases/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";
import { formatCurrency, formatDate } from "@/lib/format";
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
  title: "Purchases",
};

const STOCK_EDITORS = ["super_admin", "branch_manager", "stock_manager"];

export default async function PurchasesPage() {
  const [profile, purchases] = await Promise.all([getCurrentProfile(), getPurchases()]);

  const canCreate = profile ? STOCK_EDITORS.includes(profile.role) : false;
  const showBranch = profile ? isSuperAdmin(profile.role) : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchases"
        description={
          showBranch
            ? "Consignments received across every branch."
            : "Consignments received at your branch."
        }
        action={
          canCreate ? (
            <Button asChild>
              <Link href="/purchases/new">
                <Plus className="size-4" />
                New Purchase
              </Link>
            </Button>
          ) : undefined
        }
      />

      {purchases.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No purchases recorded"
          description="Recording a purchase is what puts stock on the shelf and updates the supplier balance."
          action={
            canCreate ? (
              <Button asChild>
                <Link href="/purchases/new">
                  <Plus className="size-4" />
                  New Purchase
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Supplier</TableHead>
                  {showBranch && <TableHead className="hidden md:table-cell">Branch</TableHead>}
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {purchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm font-medium">{p.invoice_no}</TableCell>
                    <TableCell className="max-w-48 truncate">{p.supplier?.name ?? "—"}</TableCell>
                    {showBranch && (
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {p.branch?.code ?? "—"}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                      {formatDate(p.purchase_date)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(p.total_amount)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${p.due_amount > 0 ? "font-medium text-amber-700 dark:text-amber-500" : "text-muted-foreground"}`}
                    >
                      {formatCurrency(p.due_amount)}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/purchases/${p.id}`}>View</Link>
                      </Button>
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
