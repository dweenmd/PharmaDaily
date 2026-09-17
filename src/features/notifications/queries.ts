import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { type NotificationRow } from "@/types";

/**
 * Regenerates stock alerts, then reads them back.
 *
 * Called when the dashboard renders. refresh_stock_alerts() is idempotent — a
 * partial unique index on unread (branch_id, dedupe_key) means a repeat run
 * refreshes rather than duplicates — so running it on page load is safe, and it
 * also clears alerts that have resolved themselves.
 *
 * A scheduler (pg_cron, or a Phase 6 background job) can call the same function
 * to keep alerts current for staff who are not looking at the dashboard. This
 * is the cheap version that needs no infrastructure.
 */
export const getNotifications = cache(
  async (branchId: string | null): Promise<NotificationRow[]> => {
    const supabase = await createClient();

    // Failure here must not take the dashboard down with it: alerts are useful,
    // not load-bearing.
    await supabase.rpc("refresh_stock_alerts", { p_branch_id: branchId as string });

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(100);

    return error ? [] : (data ?? []);
  },
);
