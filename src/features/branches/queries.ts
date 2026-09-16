import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { type BranchRow } from "@/types/database.types";

export type AccessibleBranch = Pick<BranchRow, "id" | "name" | "code" | "address" | "phone">;

/**
 * Branches the signed-in user may see.
 *
 * There is no role check here on purpose. Row Level Security answers the
 * question: a super admin gets every live branch, everyone else gets exactly
 * their own. Adding a `.eq("branch_id", …)` filter in application code would
 * duplicate that logic in a second place, where it could drift.
 *
 * `cache()` dedupes the call across the layout, the page and any server action
 * in the same request — without it the shell and the dashboard each issue
 * their own round trip on every navigation.
 */
export const getAccessibleBranches = cache(async (): Promise<AccessibleBranch[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("branches")
    .select("id, name, code, address, phone")
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("name");

  if (error) return [];
  return data ?? [];
});
