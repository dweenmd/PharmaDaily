import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { type Database } from "@/types";

/**
 * A throwaway Supabase client for checking a password mid-request without
 * disturbing the signed-in user's own session.
 *
 * The anon key only — this is not the service-role client. Used to verify
 * someone else's credentials (a manager approving a discount override) from
 * inside a server action, where signing in on the request's own cookie-bound
 * client would log the current cashier out and in as the manager instead.
 * `persistSession: false` is what makes that safe: the resulting session
 * lives only in this client instance's memory for the rest of the request,
 * never touches a cookie, and is discarded when the function returns.
 */
export function createEphemeralClient() {
  return createSupabaseClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
