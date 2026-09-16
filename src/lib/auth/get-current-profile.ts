import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { type BranchRow, type ProfileRow } from "@/types/database.types";

/** A profile joined with its branch, which is what the app shell needs. */
export type CurrentProfile = ProfileRow & {
  branch: Pick<BranchRow, "id" | "name" | "code"> | null;
};

/**
 * Loads the signed-in user's profile.
 *
 * Wrapped in React's `cache()` so the layout, the page and any server action
 * in the same request share one query instead of issuing three.
 *
 * Returns null when there is no session, or when the session's user has no
 * usable profile (inactive or soft-deleted). Callers must treat null as
 * "no access" — it is the same state the database's RLS helpers see, so the
 * UI and the data layer agree.
 */
export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const supabase = await createClient();

  // getUser() revalidates the token with the auth server. Do not swap this for
  // getSession(), which trusts the cookie as presented.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
        id,
        auth_id,
        name,
        role,
        branch_id,
        is_active,
        created_at,
        updated_at,
        deleted_at,
        branch:branches ( id, name, code )
      `,
    )
    .eq("auth_id", user.id)
    .is("deleted_at", null)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  // PostgREST types an embedded one-to-one relation as a possible array;
  // normalise it so callers get a plain object or null.
  const branch = Array.isArray(data.branch) ? (data.branch[0] ?? null) : data.branch;

  return { ...data, branch } as CurrentProfile;
});
