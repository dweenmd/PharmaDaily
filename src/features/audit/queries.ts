import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { AUDITED_TABLES } from "@/features/audit/constants";
import { type Json } from "@/types";

export type AuditEntry = {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  changed_fields: string[] | null;
  old_data: Json;
  new_data: Json;
  created_at: string;
  actor: { id: string; name: string; role: string } | null;
  branch: { id: string; name: string; code: string } | null;
};

function unwrap<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export const getAuditLog = cache(
  async (filters: {
    table?: string | null;
    action?: string | null;
    actor?: string | null;
    from?: string | null;
    to?: string | null;
  }): Promise<AuditEntry[]> => {
    const supabase = await createClient();

    let query = supabase
      .from("audit_logs")
      .select(
        `
          id, action, table_name, record_id, changed_fields, old_data, new_data, created_at,
          actor:profiles ( id, name, role ),
          branch:branches ( id, name, code )
        `,
      )
      .order("created_at", { ascending: false })
      .limit(300);

    // Only known table names reach the query. The column is free text, and
    // letting an arbitrary value through would be a needless surface even
    // though PostgREST parameterises it.
    if (filters.table && filters.table in AUDITED_TABLES) {
      query = query.eq("table_name", filters.table);
    }

    if (filters.action && ["INSERT", "UPDATE", "DELETE"].includes(filters.action)) {
      query = query.eq("action", filters.action);
    }

    if (filters.actor) query = query.eq("user_id", filters.actor);
    if (filters.from) query = query.gte("created_at", filters.from);
    if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59`);

    const { data, error } = await query;
    if (error) return [];

    return (data ?? []).map((row) => ({
      ...row,
      actor: unwrap(row.actor as never),
      branch: unwrap(row.branch as never),
    })) as AuditEntry[];
  },
);

/** Staff who appear in the log, for the actor filter. */
export const getAuditActors = cache(async (): Promise<{ id: string; name: string }[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name")
    .is("deleted_at", null)
    .order("name");

  return error ? [] : (data ?? []);
});
