import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type ReceiptPaperSize = "58mm" | "80mm" | "a4";

const VALID_SIZES: readonly ReceiptPaperSize[] = ["58mm", "80mm", "a4"];

/**
 * Resolves receipt_paper_size for a branch: its own override if set,
 * otherwise the chain-wide default, otherwise "80mm" — the size most
 * pharmacy till printers in Bangladesh actually use, so an install that has
 * never touched this setting still prints something sane rather than
 * whatever the browser's default paper size happens to be.
 */
export const getReceiptPaperSize = cache(
  async (branchId: string | null): Promise<ReceiptPaperSize> => {
    const supabase = await createClient();

    const { data } = await supabase
      .from("settings")
      .select("value, branch_id")
      .eq("key", "receipt_paper_size")
      .or(branchId ? `branch_id.eq.${branchId},branch_id.is.null` : "branch_id.is.null");

    const branchOverride = data?.find((s) => s.branch_id === branchId)?.value;
    const globalDefault = data?.find((s) => s.branch_id === null)?.value;
    const value = branchOverride ?? globalDefault;

    return VALID_SIZES.includes(value as ReceiptPaperSize) ? (value as ReceiptPaperSize) : "80mm";
  },
);
