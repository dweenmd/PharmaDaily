import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { type Database } from "../src/types";

// Scripts run outside Next, so .env.local has to be loaded explicitly.
config({ path: ".env.local", quiet: true });

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    console.error(`\n  Missing ${name} in .env.local\n`);
    process.exit(1);
  }
  return value;
}

export const SUPABASE_URL = required("NEXT_PUBLIC_SUPABASE_URL");
export const ANON_KEY = required("NEXT_PUBLIC_SUPABASE_ANON_KEY");

/**
 * Service-role client. Bypasses RLS entirely — scripts only.
 *
 * Read lazily so a script that needs only the anon key (the "can a normal user
 * see this?" half of verify-rls) does not demand the service-role key.
 */
export function adminClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Anon-key client: exactly what an ordinary browser session gets, RLS included. */
export function anonClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
