import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next 16 renamed the `middleware` convention to `proxy`. Same runtime role:
 * it runs before every matched request, refreshes the Supabase session cookie
 * and redirects anonymous traffic away from protected routes.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and the service worker.
     *
     * Excluding sw.js matters: the service worker must be fetchable while
     * signed out, otherwise the PWA cannot install or serve the offline shell.
     */
    "/((?!_next/static|_next/image|favicon.ico|sw.js|workbox-.*\\.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|webmanifest)$).*)",
  ],
};
