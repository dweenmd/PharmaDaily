import Link from "next/link";
import { AlertTriangle, ArrowRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type LowStockItem = {
  medicine_id: string;
  medicine_name: string;
  strength: string | null;
  unit: string | null;
  dosage_form?: string | null;
  total_quantity: number;
  reorder_level: number;
};

type Props = {
  items: LowStockItem[];
  limit?: number;
};

export function LowStockCard({ items, limit = 5 }: Props) {
  const displayed = items.slice(0, limit);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Low Stock</h3>
              {items.length > 0 && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
                  {items.length} alert{items.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Medicines below minimum reorder level</p>
          </div>
        </div>

        <Button asChild variant="ghost" size="xs" className="h-7 text-xs text-muted-foreground hover:text-foreground">
          <Link href="/stock/low">
            View All
            <ArrowRight className="size-3 ml-1" />
          </Link>
        </Button>
      </div>

      {/* List */}
      {displayed.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground bg-zinc-50/50 dark:bg-zinc-900/30 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
          <p className="font-medium text-foreground">All items in stock</p>
          <p className="text-[11px] mt-0.5">No medicines currently below reorder thresholds.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
          {displayed.map((item) => {
            const isOut = item.total_quantity <= 0;
            const isCritical = item.total_quantity <= Math.max(1, Math.floor(item.reorder_level / 2));
            const percent = Math.min(100, Math.max(0, Math.round((item.total_quantity / Math.max(1, item.reorder_level)) * 100)));

            return (
              <div key={item.medicine_id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground truncate">{item.medicine_name}</span>
                    {item.strength && (
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                        {item.strength}
                      </span>
                    )}
                  </div>

                  {/* Stock Metrics & Visual Bar */}
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground font-mono">
                      {item.total_quantity}
                    </span>
                    <span>/</span>
                    <span className="font-mono">{item.reorder_level} min</span>

                    <div className="w-16 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden ml-1">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          isOut
                            ? "bg-rose-500 w-full"
                            : isCritical
                            ? "bg-amber-500"
                            : "bg-zinc-400 dark:bg-zinc-500"
                        )}
                        style={{ width: `${Math.max(5, percent)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Status & Restock Action */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold border",
                      isOut
                        ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50"
                        : isCritical
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50"
                        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                    )}
                  >
                    {isOut ? "Out of Stock" : isCritical ? "Critical" : "Low Stock"}
                  </span>

                  <Button
                    asChild
                    variant="outline"
                    size="xs"
                    className="h-6.5 text-[11px] font-medium border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <Link href={`/purchases/new?medicine=${item.medicine_id}`}>
                      <Plus className="size-3 mr-0.5" />
                      Order
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
