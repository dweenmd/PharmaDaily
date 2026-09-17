"use client";

import * as React from "react";

const KEY = "pharmadaily.pos.held-sale";

export type HeldSale = {
  lines: { stockId: string; quantity: number }[];
  customerId: string | null;
  discount: number;
  heldAt: string;
};

/**
 * A sale parked mid-transaction — the customer has gone back for one more
 * item and the queue behind them should not wait.
 *
 * Kept in localStorage: it has to survive a refresh or a dropped connection,
 * but it is not a transaction and has no business reaching the server. Nothing
 * has been sold yet.
 *
 * Exposed through useSyncExternalStore rather than an effect, because reading
 * localStorage is reading external mutable state — which is exactly what that
 * hook is for. It also means two till windows on the same machine stay in
 * step, since the browser's own `storage` event is one of the subscriptions.
 */
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Fires when ANOTHER tab writes; our own writes go through notify().
  window.addEventListener("storage", onChange);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    // Private browsing, or site data blocked. Holding is a convenience, so
    // losing it is not an error worth surfacing.
    return null;
  }
}

/** The server has no localStorage, so nothing is held as far as it knows. */
function getServerSnapshot(): string | null {
  return null;
}

export function useHeldSale() {
  const raw = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const held = React.useMemo<HeldSale | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as HeldSale;
    } catch {
      return null;
    }
  }, [raw]);

  const hold = React.useCallback((sale: HeldSale) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(sale));
      notify();
      return true;
    } catch {
      return false;
    }
  }, []);

  const clear = React.useCallback(() => {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      // Nothing to clean up if storage was unavailable in the first place.
    }
    notify();
  }, []);

  return { held, hold, clear };
}
