import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type ReceiptPaperSize = "58mm" | "80mm" | "a4";

const VALID_SIZES: readonly ReceiptPaperSize[] = ["58mm", "80mm", "a4"];

export type ReceiptCustomization = {
  paper_size: ReceiptPaperSize;
  header_name: string;
  header_tagline: string;
  header_address: string;
  header_phone: string;
  header_drug_lic: string;
  header_bin: string;
  header_email: string;
  footer_thank_you: string;
  footer_return_policy: string;
  footer_helpline: string;
  footer_tagline: string;
  show_barcode: boolean;
  show_batch_expiry: boolean;
  show_customer_info: boolean;
  show_cashier_info: boolean;
  show_amount_in_words: boolean;
};

export const DEFAULT_RECEIPT_CUSTOMIZATION: ReceiptCustomization = {
  paper_size: "80mm",
  header_name: "PharmaDaily Pharmacy",
  header_tagline: "Govt. Approved Model Pharmacy",
  header_address: "742 Satmasjid Road, Dhanmondi, Dhaka",
  header_phone: "+880 1700-000000",
  header_drug_lic: "DL-DHK-2024-8891",
  header_bin: "002391029-0101",
  header_email: "support@pharmadaily.com",
  footer_thank_you: "*** THANK YOU · GET WELL SOON ***",
  footer_return_policy:
    "Returns accepted within 7 days with original receipt. Cold-chain items & cut strips are non-returnable.",
  footer_helpline: "+880 1700-000000",
  footer_tagline: "PharmaDaily Cloud POS",
  show_barcode: true,
  show_batch_expiry: true,
  show_customer_info: true,
  show_cashier_info: true,
  show_amount_in_words: true,
};

/**
 * Resolves receipt_paper_size for a branch: its own override if set,
 * otherwise the chain-wide default, otherwise "80mm".
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

/**
 * Resolves full receipt customization (header, footer, display toggles) for a branch or chainwide.
 */
export const getReceiptCustomizationSettings = cache(
  async (branchId: string | null): Promise<ReceiptCustomization> => {
    const supabase = await createClient();

    const { data } = await supabase
      .from("settings")
      .select("key, value, branch_id")
      .or(branchId ? `branch_id.eq.${branchId},branch_id.is.null` : "branch_id.is.null");

    const values: Record<string, string> = {};
    for (const row of data ?? []) {
      if (row.branch_id === null && !(row.key in values)) {
        values[row.key] = row.value;
      }
      if (branchId && row.branch_id === branchId) {
        values[row.key] = row.value;
      }
    }

    const paperSize = values["receipt_paper_size"];
    const validPaper = VALID_SIZES.includes(paperSize as ReceiptPaperSize)
      ? (paperSize as ReceiptPaperSize)
      : "80mm";

    return {
      paper_size: validPaper,
      header_name: values["receipt_header_name"] || values["pharmacy_name"] || DEFAULT_RECEIPT_CUSTOMIZATION.header_name,
      header_tagline: values["receipt_header_tagline"] || DEFAULT_RECEIPT_CUSTOMIZATION.header_tagline,
      header_address: values["receipt_header_address"] || values["pharmacy_address"] || DEFAULT_RECEIPT_CUSTOMIZATION.header_address,
      header_phone: values["receipt_header_phone"] || values["pharmacy_phone"] || DEFAULT_RECEIPT_CUSTOMIZATION.header_phone,
      header_drug_lic: values["receipt_header_drug_lic"] || values["pharmacy_license"] || DEFAULT_RECEIPT_CUSTOMIZATION.header_drug_lic,
      header_bin: values["receipt_header_bin"] || values["tax_id_number"] || DEFAULT_RECEIPT_CUSTOMIZATION.header_bin,
      header_email: values["receipt_header_email"] || values["pharmacy_email"] || DEFAULT_RECEIPT_CUSTOMIZATION.header_email,
      footer_thank_you: values["receipt_footer_thank_you"] || DEFAULT_RECEIPT_CUSTOMIZATION.footer_thank_you,
      footer_return_policy: values["receipt_footer_return_policy"] || values["receipt_footer_text"] || DEFAULT_RECEIPT_CUSTOMIZATION.footer_return_policy,
      footer_helpline: values["receipt_footer_helpline"] || DEFAULT_RECEIPT_CUSTOMIZATION.footer_helpline,
      footer_tagline: values["receipt_footer_tagline"] || DEFAULT_RECEIPT_CUSTOMIZATION.footer_tagline,
      show_barcode: values["receipt_show_barcode"] !== "false",
      show_batch_expiry: values["receipt_show_batch_expiry"] !== "false",
      show_customer_info: values["receipt_show_customer_info"] !== "false",
      show_cashier_info: values["receipt_show_cashier_info"] !== "false",
      show_amount_in_words: values["receipt_show_amount_in_words"] !== "false",
    };
  },
);
