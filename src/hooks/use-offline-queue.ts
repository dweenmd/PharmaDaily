"use client";

import * as React from "react";

import { readQueue, type QueuedSale } from "@/lib/offline/db";

/**
 * The offline queue, as reactive state.
 *
 * IndexedDB has no change events, so writers call `notifyQueueChanged()` after
 * mutating it. Same pattern as the held-sale store: one subscription list, and
 * every reader re-reads when anything writes.
 */
const listeners = new Set<() => void>();

export function notifyQueueChanged() {
  for (const listener of listeners) listener();
}

export function useOfflineQueue() {
  const [queue, setQueue] = React.useState<QueuedSale[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    const rows = await readQueue();
    setQueue(rows);
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    let active = true;

    const reload = () => {
      void readQueue().then((rows) => {
        if (active) {
          setQueue(rows);
          setIsLoading(false);
        }
      });
    };

    listeners.add(reload);
    reload();

    return () => {
      active = false;
      listeners.delete(reload);
    };
  }, []);

  return {
    queue,
    pendingCount: queue.filter((q) => q.status === "pending").length,
    failedCount: queue.filter((q) => q.status === "failed").length,
    isLoading,
    refresh,
  };
}
