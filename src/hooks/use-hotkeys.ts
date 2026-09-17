"use client";

import * as React from "react";

type HotkeyMap = Record<string, (event: KeyboardEvent) => void>;

/**
 * Function-key shortcuts for the POS.
 *
 * A busy counter is driven from the keyboard — the cashier's hands are on the
 * scanner and the till, not the mouse. Function keys are used rather than
 * modifier combinations because they never collide with typing into the search
 * box mid-scan.
 *
 * preventDefault matters: F12 opens developer tools and F10 focuses the browser
 * menu bar, either of which would interrupt a sale.
 *
 * The handler map is held in a ref so passing a fresh object each render does
 * not tear down and rebuild the listener on every keystroke.
 */
export function useHotkeys(map: HotkeyMap, enabled = true) {
  const mapRef = React.useRef(map);

  React.useEffect(() => {
    mapRef.current = map;
  });

  React.useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      const handler = mapRef.current[event.key];
      if (!handler) return;

      // Escape has to keep working inside inputs — it is how a dialog closes.
      // The function keys are safe there too, since nothing types them.
      handler(event);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
