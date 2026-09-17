import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Truck } from "lucide-react";

import { getSuppliers } from "@/features/suppliers/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { formatCurrency, toNumber } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Suppliers",
};

const CATALOGUE_EDITORS = ["super_admin", "branch_manager", "stock_manager"];

export default async function SuppliersPage() {
  const [profile, suppliers] = await Promise.all([
    getCurrentProfile(),
    getSuppliers({ includeInactive: true }),
  ]);

  const canEdit = profile ? CATALOGUE_EDITORS.includes(profile.role) : false;

  const totalDue = suppliers.reduce((sum, s) => sum + toNumber(s.due_amount), 0);
  const withDue = suppliers.filter((s) => toNumber(s.due_amount) > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Distributors the pharmacy buys from, shared across every branch."
        action={
          canEdit ? (
            <Button asChild>
              <Link href="/suppliers/new">
                <Plus className="size-4" />
                Add Supplier
              </Link>
            </Button>
          ) : undefined
        }
      />

      {suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No suppliers yet"
          description="Add a supplier before recording your first purchase."
          action={
            canEdit ? (
              <Button asChild>
                <Link href="/suppliers/new">
                  <Plus className="size-4" />
                  Add Supplier
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Suppliers</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{suppliers.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total outstanding</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{formatCurrency(totalDue)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>With balance owed</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{withDue.length}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="overflow-hidden py-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="hidden sm:table-cell">Phone</TableHead>
                    <TableHead className="hidden lg:table-cell">Address</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead>Status</TableHead>
                    {canEdit && <TableHead className="w-16" />}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {suppliers.map((s) => {
                    const due = toNumber(s.due_amount);
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                          {s.phone ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden max-w-xs truncate text-sm lg:table-cell">
                          {s.address ?? "—"}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${due > 0 ? "font-medium text-amber-700 dark:text-amber-500" : "text-muted-foreground"}`}
                        >
                          {formatCurrency(due)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.is_active ? "default" : "outline"}>
                            {s.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/suppliers/${s.id}/edit`}>Edit</Link>
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          <CardContent className="text-muted-foreground px-0 text-xs">
            Outstanding balances are maintained automatically when a purchase is recorded with an
            unpaid amount.
          </CardContent>
        </>
      )}
    </div>
  );
}
