import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { type UserRole } from "@/types";

export type StaffRow = {
  id: string;
  auth_id: string;
  name: string;
  role: UserRole;
  branch_id: string | null;
  is_active: boolean;
  password_set: boolean;
  created_at: string;
  branch: { id: string; name: string; code: string } | null;
};

/**
 * Staff visible to the caller.
 *
 * Read through the ordinary client, so RLS scopes it: a super admin sees
 * everyone, a branch manager sees their own branch. The write actions use the
 * service role and have to re-check all of that by hand — this one does not.
 */
export const getStaff = cache(async (): Promise<StaffRow[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
        id, auth_id, name, role, branch_id, is_active, password_set, created_at,
        branch:branches ( id, name, code )
      `,
    )
    .is("deleted_at", null)
    .order("is_active", { ascending: false })
    .order("name");

  if (error) return [];

  return (data ?? []).map((row) => ({
    ...row,
    branch: Array.isArray(row.branch) ? (row.branch[0] ?? null) : row.branch,
  })) as StaffRow[];
});

export type StaffAuthMeta = {
  email: string;
  last_sign_in_at: string | null;
};

/**
 * Email and sign-in history, fetched separately.
 *
 * Both live on auth.users, which application code cannot read — that
 * separation is the point of keeping credentials out of profiles. Shown on
 * the staff list because "which account is this?" is otherwise unanswerable
 * when two people share a name, and "has this account ever been used?" is
 * otherwise unanswerable at all.
 */
export const getStaffAuthMeta = cache(async (): Promise<Record<string, StaffAuthMeta>> => {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return {};

  return Object.fromEntries(
    (data.users ?? [])
      .filter((u) => u.email)
      .map((u) => [u.id, { email: u.email!, last_sign_in_at: u.last_sign_in_at ?? null }]),
  );
});
