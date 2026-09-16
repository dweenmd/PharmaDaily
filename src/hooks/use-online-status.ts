"use client";

import * as React from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);

  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

/**
 * The server cannot know the client's connectivity. Reporting "online" keeps
 * the first client render identical to the server's, so hydration does not
 * mismatch; the real value arrives immediately afterwards.
 */
function getServerSnapshot() {
  return true;
}

/**
 * Tracks browser connectivity.
 *
 * `navigator.onLine` is only a hint — it reports whether the device has a
 * network interface up, not whether Supabase is reachable. That is good enough
 * for the header indicator and for explaining a failed login; Phase 6's sync
 * queue is what makes offline billing genuinely work.
 */
export function useOnlineStatus(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
