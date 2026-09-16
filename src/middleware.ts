import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every path except static assets and the service worker.
     *
     * Excluding sw.js matters: the service worker must be fetchable while
     * signed out, otherwise the PWA cannot install or serve the offline shell.
     */
    "/((?!_next/static|_next/image|favicon.ico|sw.js|workbox-.*\\.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|webmanifest)$).*)",
  ],
};
