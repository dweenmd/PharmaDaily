"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/features/medicines/schemas";
import { EDITABLE_SETTINGS, type SettingKey } from "./constants";

const settingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  branchId: z.string().uuid().nullable(),
});

export async function saveSettingAction(
  key: SettingKey,
  value: string | number,
  branchId: string | null,
): Promise<ActionResult> {
  try {
    const parsed = settingSchema.safeParse({ key, value: String(value), branchId });
    if (!parsed.success) {
      return { ok: false, error: "That setting is not editable." };
    }

    const keyStr = parsed.data.key;
    const spec = keyStr in EDITABLE_SETTINGS ? EDITABLE_SETTINGS[keyStr as SettingKey] : undefined;

    if (spec) {
      if (spec.type === "number") {
        const numeric = Number(parsed.data.value);
        if (!Number.isFinite(numeric) || numeric < spec.min || numeric > spec.max) {
          return {
            ok: false,
            error: `${spec.label} must be between ${spec.min} and ${spec.max} ${spec.unit}.`,
          };
        }
      } else if ("options" in spec && Array.isArray(spec.options)) {
        const valid = (spec.options as readonly { value: string }[]).some(
          (o) => o.value === parsed.data.value,
        );
        if (!valid) return { ok: false, error: `${spec.label} is not a recognised option.` };
      }
    }

    const supabase = await createClient();

    // Upsert against the right scope. The two partial unique indexes mean a
    // branch row and the global row coexist, with the branch one winning when
    // the alert generator reads it.
    const existingQuery = supabase.from("settings").select("id").eq("key", parsed.data.key);

    const { data: existing } = parsed.data.branchId
      ? await existingQuery.eq("branch_id", parsed.data.branchId).maybeSingle()
      : await existingQuery.is("branch_id", null).maybeSingle();

    const error = existing
      ? (
          await supabase
            .from("settings")
            .update({ value: String(parsed.data.value) })
            .eq("id", existing.id)
        ).error
      : (
          await supabase.from("settings").insert({
            key,
            value: String(parsed.data.value),
            branch_id: parsed.data.branchId,
          })
        ).error;

    if (error) {
      if (error.code === "42501") {
        return { ok: false, error: "Only a manager or administrator can change these settings." };
      }
      return { ok: false, error: "Could not save the setting." };
    }

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("saveSettingAction error:", err);
    return { ok: false, error: "An unexpected error occurred while saving setting." };
  }
}

// ---------------------------------------------------------------------------

/**
 * Saves multiple settings in batch for a clean workspace submission.
 * Optimized to fetch existing keys in one query, then batch insert and update.
 */
export async function saveSettingsBatchAction(
  updates: Record<string, string>,
  branchId: string | null,
): Promise<ActionResult> {
  try {
    const keys = Object.keys(updates);
    if (keys.length === 0) {
      return { ok: true, data: undefined };
    }

    const supabase = await createClient();
    const normalizedBranchId = branchId ?? null;

    // 1. Fetch existing settings for this branch scope in a single query
    const existingQuery = supabase.from("settings").select("id, key").in("key", keys);
    const { data: existingRows, error: fetchErr } = normalizedBranchId
      ? await existingQuery.eq("branch_id", normalizedBranchId)
      : await existingQuery.is("branch_id", null);

    if (fetchErr) {
      if (fetchErr.code === "42501") {
        return { ok: false, error: "Only a manager or administrator can change settings." };
      }
      return { ok: false, error: "Failed to read existing configuration." };
    }

    const existingMap = new Map<string, string>();
    for (const row of existingRows ?? []) {
      existingMap.set(row.key, row.id);
    }

    // 2. Partition updates into updates and new inserts
    const updatePromises: Promise<{ error: { code?: string; message?: string } | null }>[] = [];
    const newInserts: { key: string; value: string; branch_id: string | null }[] = [];

    for (const [key, value] of Object.entries(updates)) {
      const existingId = existingMap.get(key);
      if (existingId) {
        updatePromises.push(
          (async () => {
            const { error } = await supabase
              .from("settings")
              .update({ value: String(value) })
              .eq("id", existingId);
            return { error };
          })(),
        );
      } else {
        newInserts.push({
          key,
          value: String(value),
          branch_id: normalizedBranchId,
        });
      }
    }

    // 3. Insert new records in batch if any
    if (newInserts.length > 0) {
      const { error: insertErr } = await supabase.from("settings").insert(newInserts);
      if (insertErr) {
        if (insertErr.code === "42501") {
          return { ok: false, error: "Only a manager or administrator can change settings." };
        }
        return { ok: false, error: `Failed to insert new settings: ${insertErr.message}` };
      }
    }

    // 4. Await concurrent updates
    if (updatePromises.length > 0) {
      const updateResults = await Promise.all(updatePromises);
      for (const res of updateResults) {
        if (res.error) {
          if (res.error.code === "42501") {
            return { ok: false, error: "Only a manager or administrator can change settings." };
          }
          return { ok: false, error: `Failed to update settings: ${res.error.message}` };
        }
      }
    }

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("saveSettingsBatchAction error:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred while saving settings.",
    };
  }
}
