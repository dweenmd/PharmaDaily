import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { type Database } from "@/types";

/** Routes reachable without a session. Everything else requires one. */
const PUBLIC_PATHS = ["/login", "/auth/callback", "/offline", "/manifest.webmanifest"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refreshes the Supabase session cookie and enforces the authenticated/
 * anonymous split.
 *
 * Two things here are load-bearing and easy to break:
 *
 *   1. `supabase.auth.getUser()` — NOT `getSession()`. getSession() only
 *      decodes whatever cookie the browser sent, which a client can forge.
 *      getUser() revalidates the token against the auth server, so the answer
 *      can be trusted for an access decision.
 *
 *   2. The response object must be created before the client and returned
 *      as-is, carrying whatever cookies Supabase set during the refresh.
 *      Building a fresh NextResponse at the end would silently drop the
 *      rotated token and log the user out roughly every hour.
 *
 * This is a convenience/UX layer, not the security boundary. The real
 * guarantee is Row Level Security in the database: bypassing this redirect
 * still yields nothing readable.
 */
export async function updateSession(request: NextRequest, requestHeaders?: Headers) {
  // When the caller supplies headers (the CSP nonce), they have to ride along
  // on the REQUEST, not just the response: that is how Next.js picks the nonce
  // up and stamps it onto its own script tags.
  const nextOptions = requestHeaders ? { request: { headers: requestHeaders } } : { request };

  let supabaseResponse = NextResponse.next(nextOptions);

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next(nextOptions);
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  // Signed out, heading somewhere protected -> bounce to login, remembering
  // where they were going so the redirect back is seamless.
  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("redirectTo", `${pathname}${search}`);

    // Distinguishes "your session expired" from "please sign in", so the login
    // page can explain what happened instead of appearing for no reason.
    if (request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) {
      loginUrl.searchParams.set("reason", "session_expired");
    }

    return NextResponse.redirect(loginUrl);
  }

  // Already signed in, but sitting on the login page -> send them inside.
  if (user && pathname === "/login") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}
