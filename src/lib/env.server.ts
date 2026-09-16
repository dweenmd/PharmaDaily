import "server-only";

import { z } from "zod";

/**
 * Server-only environment variables.
 *
 * The `server-only` import above is a build-time tripwire: if any Client
 * Component ever pulls this module into its import graph, the build fails
 * instead of shipping the service-role key to a browser.
 *
 * SUPABASE_SERVICE_ROLE_KEY bypasses Row Level Security entirely. Treat it
 * like a database superuser password.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is missing"),
});

let cached: z.infer<typeof serverEnvSchema> | null = null;

/**
 * Lazily validated so that the app can boot — and render the login page —
 * without a service-role key present. Only the few code paths that genuinely
 * need admin rights pay the cost of requiring it.
 */
export function getServerEnv() {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");

    throw new Error(
      `Invalid server environment configuration:\n${issues}\n\n` +
        `Add it to .env.local. Never expose this value to the browser.`,
    );
  }

  cached = parsed.data;
  return cached;
}
