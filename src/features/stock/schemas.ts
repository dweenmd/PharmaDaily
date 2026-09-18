import { z } from "zod";

/**
 * Preset reasons, so adjustments can be grouped in a report rather than
 * arriving as a thousand differently-worded free-text notes.
 *
 * "Other" keeps the escape hatch, but forces an explanation alongside it.
 */
export const ADJUSTMENT_REASONS = [
  "Damaged",
  "Expired",
  "Found",
  "Lost",
  "Correction",
  "Other",
  // Backward compatibility with legacy entries
  "Damaged / broken",
  "Expired — removed from sale",
  "Lost or stolen",
  "Miscounted at receipt",
  "Returned to supplier",
  "Found during stock take",
] as const;

export const stockAdjustmentSchema = z
  .object({
    branch_stock_id: z.string().uuid("Select a batch"),
    branch_id: z.string().uuid(),
    medicine_id: z.string().uuid(),
    batch_no: z.string().min(1),
    type: z.enum(["increase", "decrease"]),
    quantity: z.coerce.number().int("Whole units only").positive("Quantity must be at least 1"),
    reason: z.enum(ADJUSTMENT_REASONS),
    // .nullable() matters here: zodResolver hands the submit handler this
    // schema's own transformed output (empty string already turned to null),
    // and the server re-validates that value through this same schema.
    reason_detail: z
      .string()
      .trim()
      .max(300)
      .nullable()
      .optional()
      .transform((v) => (v === "" || v == null ? null : v)),
  })
  .superRefine((value, ctx) => {
    if (value.reason === "Other" && !value.reason_detail) {
      ctx.addIssue({
        code: "custom",
        path: ["reason_detail"],
        message: "Explain the reason for this adjustment",
      });
    }
  });

export type StockAdjustmentFormValues = z.input<typeof stockAdjustmentSchema>;
export type StockAdjustmentInput = z.output<typeof stockAdjustmentSchema>;
