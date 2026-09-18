import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { daysUntil, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ExpiringBatchItem = {
  id: string;
  medicine_name: string;
  strength?: string | null;
  batch_no: string;
  expiry_date: string;
  quantity: number;
};

type Props = {
  items: ExpiringBatchItem[];
  limit?: number;
};

export function ExpiringSoonCard({ items, limit = 5 }: Props) {
  const displayed = items.slice(0, limit);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
            <CalendarClock className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Expiring Soon</h3>
              {items.length > 0 && (
                <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  {items.length} batche{items.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">FEFO Alert · Earliest batches to dispense</p>
          </div>
        </div>

        <Button asChild variant="ghost" size="xs" className="h-7 text-xs text-muted-foreground hover:text-foreground">
          <Link href="/stock">
            View All
            <ArrowRight className="size-3 ml-1" />
          </Link>
        </Button>
      </div>

      {/* List */}
      {displayed.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground bg-zinc-50/50 dark:bg-zinc-900/30 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
          <p className="font-medium text-foreground">No near-expiry batches</p>
          <p className="text-[11px] mt-0.5">All inventory batches are within safe shelf life.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
          {displayed.map((item) => {
            const days = daysUntil(item.expiry_date);
            const isExpired = days < 0;
            const isCritical = days <= 30;

            return (
              <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground truncate">{item.medicine_name}</span>
                    {item.strength && (
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                        {item.strength}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-mono bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.2 rounded text-[10px] text-foreground">
                      {item.batch_no}
                    </span>
                    <span>•</span>
                    <span className="font-mono">{formatDate(item.expiry_date)}</span>
                    <span>•</span>
                    <span className="font-mono">{item.quantity} qty</span>
                  </div>
                </div>

                {/* Days remaining badge */}
                <div className="shrink-0 text-right">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border",
                      isExpired
                        ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50"
                        : isCritical
                        ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50"
                    )}
                  >
                    {isExpired ? "Expired" : `${days}d left`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
