import * as React from "react";

const MOBILE_BREAKPOINT = 768;

const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

/** The server has no viewport; assume desktop and correct on hydration. */
function getServerSnapshot() {
  return false;
}

/**
 * Viewport-width breakpoint check.
 *
 * useSyncExternalStore rather than useState + useEffect: it is the API React
 * provides for reading external, mutable state, and it avoids the cascading
 * re-render that calling setState in an effect body causes.
 */
export function useIsMobile(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
