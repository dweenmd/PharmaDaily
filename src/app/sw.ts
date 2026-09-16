import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist, StaleWhileRevalidate } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * PharmaDaily service worker.
 *
 * DELIBERATELY CONSERVATIVE ABOUT WHAT IT CACHES.
 *
 * The obvious setup — Serwist's `defaultCache`, which serves HTML
 * network-first with a cache fallback — is wrong for this app. A pharmacy
 * till is a shared device: one cashier signs out, the next signs in. Cached
 * HTML of an authenticated page sits in the Cache Storage of that browser
 * profile, readable by whoever is standing there next, and it is not cleared
 * by signing out.
 *
 * So:
 *   - Static build assets (hashed JS/CSS/fonts/images) are cached freely.
 *     They contain no customer or sales data.
 *   - Navigations are network-only, falling back to a static /offline page.
 *     Nothing authenticated is ever written to the cache.
 *   - Supabase requests are network-only. Phase 6 adds the deliberate,
 *     scoped offline path: the specific medicine/stock rows needed for
 *     billing, held in IndexedDB, plus a replay queue for sales.
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,

  runtimeCaching: [
    // ---------------------------------------------------------------------
    // Immutable, content-hashed build output. Safe to cache for a long time.
    // ---------------------------------------------------------------------
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/_next/static/"),
      handler: new CacheFirst({
        cacheName: "static-assets",
        plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 })],
      }),
    },

    // ---------------------------------------------------------------------
    // Fonts and icons: no user data, changes rarely.
    // ---------------------------------------------------------------------
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && (request.destination === "font" || request.destination === "image"),
      handler: new StaleWhileRevalidate({
        cacheName: "assets",
        plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 })],
      }),
    },

    // ---------------------------------------------------------------------
    // Everything to Supabase — auth, PostgREST, storage. Never cached: a
    // stale stock count or a cached auth response is worse than an error.
    // ---------------------------------------------------------------------
    {
      matcher: ({ url }) =>
        url.hostname.endsWith(".supabase.co") || url.pathname.startsWith("/auth/"),
      handler: new NetworkOnly(),
    },

    // ---------------------------------------------------------------------
    // Page navigations. Network-only, so no authenticated HTML is retained.
    // ---------------------------------------------------------------------
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkOnly(),
    },
  ],

  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
