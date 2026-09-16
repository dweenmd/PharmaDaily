import { type NextRequest } from "next/server";

import { buildCsp, generateNonce } from "@/lib/security/csp";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next 16 renamed the `middleware` convention to `proxy`. Same runtime role:
 * it runs before every matched request.
 *
 * Two jobs here:
 *   1. Refresh the Supabase session cookie and keep anonymous traffic out of
 *      protected routes.
 *   2. Issue a per-request CSP nonce. The policy has to be built here rather
 *      than in next.config.ts, because a nonce is only worth anything if it
 *      is unique per response.
 */
export async function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  const nonce = generateNonce();
  const csp = buildCsp(nonce, isDev);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = await updateSession(request, requestHeaders);
  response.headers.set("content-security-policy", csp);

  return response;
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
