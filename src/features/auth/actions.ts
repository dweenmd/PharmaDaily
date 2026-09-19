"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { loginSchema, type LoginResult } from "@/features/auth/schemas";

/**
 * Only same-origin, absolute-path redirects are honoured.
 *
 * Without this check, `/login?redirectTo=https://evil.example` would turn the
 * login form into an open redirect — a convincing phishing primitive, since
 * the link genuinely starts on the real domain. Protocol-relative `//host`
 * and backslash variants are rejected too: browsers normalise `/\` to `//`.
 */
function safeRedirectTarget(raw: FormDataEntryValue | null): string {
  const fallback = "/dashboard";
  if (typeof raw !== "string" || raw.length === 0) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}

export async function signInAction(formData: FormData): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  // The client validates the same schema first, so reaching here means a
  // hand-crafted request. Report it as a credential failure rather than
  // explaining which field was malformed.
  if (!parsed.success) {
    return { ok: false, code: "invalid_credentials" };
  }

  const redirectTo = safeRedirectTarget(formData.get("redirectTo"));
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Supabase returns the same "Invalid login credentials" for a wrong
    // password and for an unknown email, which is the desired behaviour: it
    // stops the login form being used to enumerate valid staff addresses.
    if (error.status === 400) return { ok: false, code: "invalid_credentials" };
    if (error.status === 429) return { ok: false, code: "rate_limited" };
    if (error.code === "email_not_confirmed") return { ok: false, code: "email_not_confirmed" };
    return { ok: false, code: "unknown" };
  }

  if (!data.user) return { ok: false, code: "unknown" };

  // Credentials were right, but that only proves identity. Authorisation is a
  // separate question: a profile that is inactive, soft-deleted or not yet
  // provisioned must not get a usable session, so the session is torn down
  // again immediately.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_active, deleted_at")
    .eq("auth_id", data.user.id)
    .maybeSingle();

  if (!profile || !profile.is_active || profile.deleted_at !== null) {
    await supabase.auth.signOut();
    return { ok: false, code: "account_inactive" };
  }

  return { ok: true, redirectTo };
}

export async function signOutAction(): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();
    // Attempt Supabase server sign-out with a 2.5s timeout.
    // If network fails, drops, or Supabase is slow, catch and proceed with local cleanup.
    await Promise.race([
      supabase.auth.signOut(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Supabase signOut timeout")), 2500),
      ),
    ]).catch((err) => {
      console.warn("Supabase auth.signOut warning (proceeding with local cleanup):", err);
    });
  } catch (err) {
    console.warn("createClient error during signOut:", err);
  }

  // Explicitly wipe all Supabase session cookies from the cookieStore
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    for (const c of allCookies) {
      if (c.name.startsWith("sb-") || c.name.includes("auth-token")) {
        cookieStore.delete(c.name);
        cookieStore.set(c.name, "", {
          path: "/",
          expires: new Date(0),
          maxAge: 0,
        });
      }
    }
  } catch (err) {
    console.warn("Cookie clearing error during signOut:", err);
  }

  return { ok: true };
}
