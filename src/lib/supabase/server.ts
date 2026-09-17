import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/env";
import { type Database } from "@/types";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Still the anon key — server-side code is not privileged here, it simply
 * carries the signed-in user's cookies. RLS remains in force, which is what
 * makes branch isolation hold even if a page forgets to filter by branch.
 *
 * Must be created per request: it closes over that request's cookie store.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies. This is expected and
            // harmless: `middleware.ts` refreshes the session on every request,
            // so the refreshed cookie still reaches the browser.
          }
        },
      },
    },
  );
}
