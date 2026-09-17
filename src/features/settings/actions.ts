"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/features/medicines/schemas";

/**
 * Settings that can be edited from the app.
 *
 * An allowlist rather than a free key/value form: the table is a generic
 * store, but anything not listed here is either not a setting yet or is
 * machinery that should not be tuned from a screen. A form that can write any
 * key would eventually be used to write one nothing reads.
 *
 * Every value is still stored as text (the column's type), so `select`
 * options are validated by membership rather than a numeric range.
 */
export const EDITABLE_SETTINGS = {
  near_expiry_days: {
    type: "number",
    label: "Near-expiry warning window",
    description:
      "How many days ahead a batch counts as expiring soon. 90 days is the usual window for returning stock to a distributor.",
    unit: "days",
    min: 7,
    max: 365,
  },
  low_stock_multiplier: {
    type: "number",
    label: "Low-stock sensitivity",
    description:
      "Multiplies each medicine's reorder level. Above 1 flags stock earlier; below 1 waits longer.",
    unit: "×",
    min: 0.1,
    max: 5,
  },
  max_discount_percent: {
    type: "number",
    label: "Discount limit before approval",
    description:
      "A cashier can apply up to this much discount on a sale by themselves. Above it, a manager has to approve before the sale completes. 100 means no limit.",
    unit: "%",
    min: 0,
    max: 100,
  },
  receipt_paper_size: {
    type: "select",
    label: "Receipt paper size",
    description: "Matches the printer connected at the till.",
    options: [
      { value: "58mm", label: "58mm thermal" },
      { value: "80mm", label: "80mm thermal" },
      { value: "a4", label: "A4" },
    ],
  },
} as const;

export type SettingKey = keyof typeof EDITABLE_SETTINGS;

const settingSchema = z.object({
  key: z.enum(Object.keys(EDITABLE_SETTINGS) as [SettingKey, ...SettingKey[]]),
  value: z.string().min(1),
  branchId: z.string().uuid().nullable(),
});

export async function saveSettingAction(
  key: SettingKey,
  value: string | number,
  branchId: string | null,
): Promise<ActionResult> {
  const parsed = settingSchema.safeParse({ key, value: String(value), branchId });
  if (!parsed.success) {
    return { ok: false, error: "That setting is not editable." };
  }

  const spec = EDITABLE_SETTINGS[parsed.data.key];

  if (spec.type === "number") {
    const numeric = Number(parsed.data.value);
    if (!Number.isFinite(numeric) || numeric < spec.min || numeric > spec.max) {
      return {
        ok: false,
        error: `${spec.label} must be between ${spec.min} and ${spec.max} ${spec.unit}.`,
      };
    }
  } else {
    const valid = (spec.options as readonly { value: string }[]).some(
      (o) => o.value === parsed.data.value,
    );
    if (!valid) return { ok: false, error: `${spec.label} is not a recognised option.` };
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
          key: parsed.data.key,
          value: String(parsed.data.value),
          branch_id: parsed.data.branchId,
        })
      ).error;

  if (error) {
    if (error.code === "42501") {
      return { ok: false, error: "Only a manager can change these settings." };
    }
    return { ok: false, error: "Could not save the setting." };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}
