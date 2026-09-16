"use client";

import { SerwistProvider } from "@serwist/next/react";

/**
 * Registers the service worker and makes it available to the tree.
 *
 * Disabled in development: a service worker caches aggressively there and
 * makes code changes look like they did not apply. Offline behaviour is
 * tested against a production build.
 *
 * `cacheOnNavigation` is off deliberately — it would cache page navigations,
 * which is exactly what src/app/sw.ts avoids doing on shared till devices.
 */
export function PwaProvider({ children }: { children: React.ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/sw.js"
      disable={process.env.NODE_ENV === "development"}
      register
      cacheOnNavigation={false}
      reloadOnOnline
    >
      {children}
    </SerwistProvider>
  );
}
