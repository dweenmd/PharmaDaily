import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { getServerEnv } from "@/lib/env.server";
import { type Database } from "@/types";

/**
 * Service-role Supabase client. BYPASSES ROW LEVEL SECURITY COMPLETELY.
 *
 * Rules for using this:
 *   1. Never import it from a Client Component. The `server-only` guard above
 *      turns that mistake into a build error rather than a key leak.
 *   2. Never hand it a user-supplied branch_id, role or user id without
 *      re-checking the caller's own authorisation first — RLS is not going to
 *      catch a mistake here, because it is switched off for this client.
 *   3. Reach for the normal server client first. This one exists only for the
 *      handful of operations that are legitimately privileged: provisioning a
 *      staff account, assigning a role or branch, deactivating a user.
 */
export function createAdminClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();

  return createSupabaseClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      // No session handling: this client must never pick up, persist or
      // refresh a user's session, or it could accidentally act as them.
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
