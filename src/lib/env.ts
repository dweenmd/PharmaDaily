import { z } from "zod";

/**
 * Client-safe environment variables.
 *
 * Only NEXT_PUBLIC_* values belong here — everything in this file is inlined
 * into the browser bundle at build time. Server-only secrets live in
 * `env.server.ts`, which is guarded by the `server-only` package.
 *
 * Next.js replaces `process.env.NEXT_PUBLIC_*` statically, so each variable
 * must be referenced by its full literal name below. Destructuring or dynamic
 * indexing into `process.env` would leave them `undefined` in the browser.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({
    message: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL, e.g. https://xyz.supabase.co",
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing"),
});

const parsed = clientEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsed.success) {
  // Fail at startup with an actionable message rather than surfacing later as
  // an opaque "Invalid API key" from the Supabase client.
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");

  throw new Error(
    `Invalid public environment configuration:\n${issues}\n\n` +
      `Copy .env.local.example to .env.local and fill in the values ` +
      `(run "npm run db:start" for local Supabase credentials).`,
  );
}

export const env = parsed.data;
