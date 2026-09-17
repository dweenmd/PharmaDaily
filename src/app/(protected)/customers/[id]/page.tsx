import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, HandCoins, Receipt } from "lucide-react";

import { RecordPaymentDialog } from "@/features/customers/components/record-payment-dialog";
import { getCustomerById, getCustomerLedger } from "@/features/customers/queries";
import { PAYMENT_METHOD_LABELS } from "@/features/sales/schemas";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { formatCurrency, formatDateTime, toNumber } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { StatTile } from "@/components/shared/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Customer",
};

const CAN_COLLECT = ["super_admin", "branch_manager", "cashier", "pharmacist"];

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [profile, customer] = await Promise.all([getCurrentProfile(), getCustomerById(id)]);
  if (!customer) notFound();

  const { sales, payments } = await getCustomerLedger(id);

  const due = toNumber(customer.due_amount);
  const invoiced = sales.reduce((sum, s) => sum + toNumber(s.total_amount), 0);
  const paidAtTill = sales.reduce((sum, s) => sum + toNumber(s.paid_amount), 0);
  const collectedLater = payments.reduce((sum, p) => sum + toNumber(p.amount), 0);

  // Collecting is a till operation and needs a branch to record it against; a
  // super admin has no branch of their own, so they review rather than collect.
  const canCollect =
    profile !== null && CAN_COLLECT.includes(profile.role) && profile.branch_id !== null;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/customers">
          <ArrowLeft className="size-4" />
          All customers
        </Link>
      </Button>

      <PageHeader
        title={customer.name}
        description={
          [customer.phone, customer.address].filter(Boolean).join(" · ") || "No contact details"
        }
        action={
          canCollect ? (
            <RecordPaymentDialog
              kind="customer"
              targetId={customer.id}
              targetName={customer.name}
              branchId={profile.branch_id!}
              outstanding={due}
            />
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Outstanding"
          value={formatCurrency(due)}
          status={due > 0 ? "warning" : "good"}
          hint={due > 0 ? "owed to the pharmacy" : "nothing owed"}
        />
        <StatTile
          label="Invoiced"
          value={formatCurrency(invoiced)}
          hint={`${sales.length} sales`}
        />
        <StatTile label="Paid at the till" value={formatCurrency(paidAtTill)} />
        <StatTile
          label="Collected later"
          value={formatCurrency(collectedLater)}
          hint={`${payments.length} payment${payments.length === 1 ? "" : "s"}`}
        />
      </div>

      {due > 0 && !canCollect && (
        <p className="text-muted-foreground text-sm">
          This customer owes {formatCurrency(due)}. Collecting is done at a branch till, so it has
          to be recorded by someone signed in there.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="size-4" />
              Invoices
            </CardTitle>
            <CardDescription>What they still owe on adds up to the balance above.</CardDescription>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <p className="text-muted-foreground py-4 text-sm">No sales yet.</p>
            ) : (
              <ul className="divide-y">
                {sales.map((sale) => {
                  const saleDue = toNumber(sale.due_amount);
                  return (
                    <li key={sale.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <Link
                          href={`/sales/${sale.id}`}
                          className="font-mono text-sm font-medium hover:underline"
                        >
                          {sale.invoice_no}
                        </Link>
                        <p className="text-muted-foreground text-xs">
                          {formatDateTime(sale.created_at)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm tabular-nums">{formatCurrency(sale.total_amount)}</p>
                        {saleDue > 0 && (
                          <p className="text-xs text-amber-600 tabular-nums dark:text-amber-500">
                            {formatCurrency(saleDue)} due
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HandCoins className="size-4" />
              Payments received
            </CardTitle>
            <CardDescription>Every collection is recorded against whoever took it.</CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-muted-foreground py-4 text-sm">
                Nothing collected outside the till yet.
              </p>
            ) : (
              <ul className="divide-y">
                {payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm">
                        <Badge variant="secondary" className="font-normal">
                          {PAYMENT_METHOD_LABELS[payment.method]}
                        </Badge>
                        {payment.reference && (
                          <span className="text-muted-foreground truncate text-xs">
                            {payment.reference}
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatDateTime(payment.created_at)} ·{" "}
                        {payment.collected_by?.name ?? "Unknown"}
                        {payment.branch?.code && ` · ${payment.branch.code}`}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium text-emerald-700 tabular-nums dark:text-emerald-500">
                      {formatCurrency(payment.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground text-xs">
        The balance is derived from these two lists — outstanding invoice amounts less payments
        received — rather than stored as an editable figure. It cannot be written directly by
        anyone.
      </p>
    </div>
  );
}
