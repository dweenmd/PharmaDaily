import Link from "next/link";
import { ArrowRight, ExternalLink, Receipt } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { type SaleListRow } from "@/features/sales/queries";

type Props = {
  sales: SaleListRow[];
  limit?: number;
};

export function RecentSalesTable({ sales, limit = 6 }: Props) {
  const displayed = sales.slice(0, limit);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
            <Receipt className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Recent Sales</h3>
            <p className="text-[11px] text-muted-foreground">Latest pharmacy counter transactions</p>
          </div>
        </div>

        <Button asChild variant="ghost" size="xs" className="h-7 text-xs text-muted-foreground hover:text-foreground">
          <Link href="/sales">
            View All Sales
            <ArrowRight className="size-3 ml-1" />
          </Link>
        </Button>
      </div>

      {/* Table */}
      {displayed.length === 0 ? (
        <div className="py-10 text-center text-xs text-muted-foreground">
          No sales recorded yet today.
          <div className="mt-2">
            <Button asChild size="xs" className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
              <Link href="/pos">Open POS Terminal</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 text-[11px] font-semibold text-muted-foreground select-none">
                <th className="py-2.5 px-4 font-semibold">Invoice</th>
                <th className="py-2.5 px-4 font-semibold">Date & Time</th>
                <th className="py-2.5 px-4 font-semibold">Customer</th>
                <th className="py-2.5 px-4 font-semibold">Cashier</th>
                <th className="py-2.5 px-4 font-semibold">Payment</th>
                <th className="py-2.5 px-4 font-semibold text-right">Amount</th>
                <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {displayed.map((sale) => {
                const isPaid = sale.due_amount <= 0;
                const paymentMethod =
                  sale.payments && sale.payments.length > 0
                    ? sale.payments.map((p) => p.method).join(", ")
                    : "Cash";

                return (
                  <tr
                    key={sale.id}
                    className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/50 transition-colors group"
                  >
                    {/* Invoice */}
                    <td className="py-3 px-4">
                      <Link
                        href={`/sales/${sale.id}`}
                        className="font-mono font-semibold text-foreground hover:underline"
                      >
                        #{sale.invoice_no}
                      </Link>
                    </td>

                    {/* Date & Time */}
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {formatDateTime(sale.created_at)}
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">
                        {sale.customer ? sale.customer.name : "Walk-in Customer"}
                      </div>
                      {sale.customer?.phone && (
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {sale.customer.phone}
                        </div>
                      )}
                    </td>

                    {/* Cashier */}
                    <td className="py-3 px-4 text-muted-foreground truncate max-w-[120px]">
                      {sale.cashier ? sale.cashier.name : "Cashier"}
                    </td>

                    {/* Payment Method Badge */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 capitalize">
                        {paymentMethod}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right font-bold text-foreground font-mono">
                      {formatCurrency(sale.total_amount)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border",
                          isPaid
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50"
                        )}
                      >
                        {isPaid ? "Paid" : "Due"}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right">
                      <Button
                        asChild
                        variant="ghost"
                        size="xs"
                        className="h-7 w-7 p-0 opacity-70 group-hover:opacity-100"
                        title="View Invoice Receipt"
                      >
                        <Link href={`/sales/${sale.id}`}>
                          <ExternalLink className="size-3.5 text-muted-foreground" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
