import { env } from "@/lib/env";

/**
 * Content Security Policy.
 *
 * The header the other security headers cannot replace: it is what turns an
 * injected `<script>` — from a medicine name, a customer note, a supplier
 * address — into a no-op instead of a session theft. A pharmacy POS handles
 * money and patient-adjacent data on shared devices, so this is worth the
 * strictness.
 *
 * Built per request because script-src carries a fresh nonce. Next.js reads
 * the nonce out of this header and stamps it onto its own script tags, so
 * framework scripts keep working without opening the policy up.
 */
export function buildCsp(nonce: string, isDev: boolean): string {
  // The Supabase origin is a different host, so it must be allowed explicitly
  // for PostgREST, Auth and Realtime to work at all.
  const supabaseOrigin = new URL(env.NEXT_PUBLIC_SUPABASE_URL).origin;
  const supabaseWs = supabaseOrigin.replace(/^http/, "ws");

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],

    // 'strict-dynamic' lets a nonced script load its own chunks, which is how
    // Next's runtime works. Browsers that honour it ignore the host list, so
    // 'self' is there only as a fallback for older ones.
    //
    // Dev additionally needs 'unsafe-eval' for React Fast Refresh.
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],

    // Next and Tailwind inject inline <style> tags that have no nonce of their
    // own, so 'unsafe-inline' is unavoidable here. It is a far smaller risk
    // than inline script: CSS cannot exfiltrate a session token.
    "style-src": ["'self'", "'unsafe-inline'"],

    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'", "data:"],

    "connect-src": [
      "'self'",
      supabaseOrigin,
      supabaseWs,
      // Dev server websocket for hot reload.
      ...(isDev ? ["ws://localhost:*", "http://localhost:*"] : []),
    ],

    // Service worker.
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],

    // Nothing in this app should ever be embedded, and it embeds nothing.
    "frame-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],

    // Forms may only post back to us — blocks a classic phishing overlay that
    // retargets the login form at an attacker's host.
    "form-action": ["'self'"],
    "base-uri": ["'self'"],
  };

  if (!isDev) {
    // Catches a stray http:// asset before a browser blocks it as mixed
    // content and breaks the page.
    directives["upgrade-insecure-requests"] = [];
  }

  return Object.entries(directives)
    .map(([directive, values]) => (values.length ? `${directive} ${values.join(" ")}` : directive))
    .join("; ");
}

/** 128 bits of randomness, base64 — regenerated on every request. */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
