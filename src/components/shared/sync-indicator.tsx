"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Cloud, CloudOff, RefreshCw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { syncOfflineSaleAction } from "@/features/sales/sync-actions";
import { notifyQueueChanged, useOfflineQueue } from "@/hooks/use-offline-queue";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { dequeueSale, markQueuedFailure } from "@/lib/offline/db";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Connectivity and the offline queue, in the header.
 *
 * At a counter this is the difference between "the system is broken" and "keep
 * selling, it will catch up", so it states that plainly rather than showing a
 * red dot and leaving the cashier to guess.
 */
export function SyncIndicator() {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const { queue, pendingCount, failedCount } = useOfflineQueue();

  const [syncing, setSyncing] = React.useState(false);
  const [progress, setProgress] = React.useState({ done: 0, total: 0 });

  const syncNow = React.useCallback(async () => {
    const pending = queue.filter((q) => q.status === "pending");
    if (pending.length === 0 || syncing) return;

    setSyncing(true);
    setProgress({ done: 0, total: pending.length });

    let synced = 0;
    let failed = 0;

    // Sequential, oldest first. Firing them in parallel would let a later sale
    // take stock a earlier one needed, and the queue is small by nature.
    for (const sale of pending) {
      const result = await syncOfflineSaleAction({
        id: sale.id,
        branch_id: sale.branch_id,
        occurred_at: sale.occurred_at,
        payload: sale.payload,
      });

      if (result.ok) {
        // Removed only now that the server has it.
        await dequeueSale(sale.id);
        synced += 1;
      } else {
        // Kept, marked failed. A sale that cannot be replayed is a decision
        // for a person, and they can only make it if they can see it.
        await markQueuedFailure(sale.id, result.error);
        failed += 1;
      }

      setProgress((p) => ({ ...p, done: p.done + 1 }));
      notifyQueueChanged();
    }

    setSyncing(false);

    if (synced > 0) {
      toast.success(`${synced} transaction${synced === 1 ? "" : "s"} synced`);
      router.refresh();
    }

    if (failed > 0) {
      toast.error(`${failed} could not be synced`, {
        description: "Open the sync panel to see why.",
      });
    }
  }, [queue, router, syncing]);

  // Reconnecting is the moment to catch up, so it happens without anyone
  // having to remember. The manual button stays for when it does not.
  const previouslyOnline = React.useRef(isOnline);
  React.useEffect(() => {
    if (isOnline && !previouslyOnline.current && pendingCount > 0) {
      void syncNow();
    }
    previouslyOnline.current = isOnline;
  }, [isOnline, pendingCount, syncNow]);

  const hasQueue = pendingCount > 0 || failedCount > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={
            isOnline
              ? `Online${hasQueue ? `, ${pendingCount} waiting to sync` : ""}`
              : "Offline mode"
          }
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
            isOnline
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
          )}
        >
          {isOnline ? <Cloud className="size-3.5" /> : <CloudOff className="size-3.5" />}
          <span className="hidden sm:inline">{isOnline ? "Online" : "Offline"}</span>

          {hasQueue && (
            <span
              className={cn(
                "ml-0.5 rounded-full px-1.5 py-px text-[10px] tabular-nums",
                failedCount > 0 ? "bg-destructive text-destructive-foreground" : "bg-background/70",
              )}
            >
              {pendingCount + failedCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>{isOnline ? "Connected" : "Offline mode"}</DropdownMenuLabel>

        <div className="text-muted-foreground px-2 pb-2 text-xs">
          {isOnline
            ? "Sales go straight to the server."
            : "Billing continues using local data and syncs when you reconnect."}
        </div>

        {syncing && (
          <div className="space-y-1.5 px-2 pb-2">
            <Progress value={(progress.done / Math.max(1, progress.total)) * 100} />
            <p className="text-muted-foreground text-xs">
              Syncing {progress.done} of {progress.total}…
            </p>
          </div>
        )}

        {hasQueue && (
          <>
            <DropdownMenuSeparator />
            <ScrollArea className="max-h-56">
              <ul className="divide-y">
                {queue.map((sale) => (
                  <li key={sale.id} className="px-2 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium tabular-nums">
                          {formatCurrency(sale.summary.total)}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {sale.summary.itemCount} item
                          {sale.summary.itemCount === 1 ? "" : "s"} ·{" "}
                          {formatDateTime(sale.occurred_at)}
                        </p>
                        {sale.status === "failed" && sale.error && (
                          <p className="mt-0.5 flex items-start gap-1 text-xs text-red-600 dark:text-red-500">
                            <TriangleAlert className="mt-px size-3 shrink-0" />
                            <span>{sale.error}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>

            <DropdownMenuSeparator />

            <div className="p-2">
              <Button
                size="sm"
                className="w-full"
                disabled={!isOnline || syncing || pendingCount === 0}
                onClick={() => void syncNow()}
              >
                <RefreshCw className={cn("size-4", syncing && "animate-spin")} />
                {syncing
                  ? "Syncing…"
                  : pendingCount > 0
                    ? `Sync ${pendingCount} now`
                    : "Nothing to sync"}
              </Button>

              {failedCount > 0 && (
                <p className="text-muted-foreground mt-2 text-xs">
                  {failedCount} could not be replayed — usually because the stock sold elsewhere
                  while this till was offline. They stay here until someone decides what to do.
                </p>
              )}
            </div>
          </>
        )}

        {!hasQueue && (
          <div className="text-muted-foreground px-2 pb-3 text-xs">Nothing waiting to sync.</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
