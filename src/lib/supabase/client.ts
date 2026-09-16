import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import { type Database } from "@/types/database.types";

/**
 * Supabase client for Client Components.
 *
 * Uses the anon key, so every request it makes is subject to Row Level
 * Security exactly as an untrusted caller would be. Safe to ship to the
 * browser.
 *
 * `createBrowserClient` memoises internally, so calling this per component is
 * cheap and does not create duplicate auth listeners.
 */
export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
