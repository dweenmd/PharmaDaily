import { z } from "zod";

export const PAYMENT_METHODS = ["cash", "bkash", "nagad", "card", "due"] as const;

export const PAYMENT_METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  cash: "Cash",
  bkash: "bKash",
  nagad: "Nagad",
  card: "Card",
  due: "Due",
};

/** Methods that settle immediately. 'due' is the absence of a tender. */
export const TENDER_METHODS = ["cash", "bkash", "nagad", "card"] as const;

export const saleItemSchema = z.object({
  branch_stock_id: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
});

export const salePaymentSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  amount: z.coerce.number().positive(),
  reference: z
    .string()
    .trim()
    .max(64)
    .nullable()
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
});

export const saleSchema = z.object({
  branch_id: z.string().uuid(),
  customer_id: z.string().uuid().nullable().default(null),
  discount: z.coerce.number().min(0).default(0),
  items: z.array(saleItemSchema).min(1, "Add at least one item"),
  payments: z.array(salePaymentSchema).default([]),
  // Set only when the discount needed a manager's sign-off — see
  // requestDiscountOverrideAction. create_sale() re-verifies it server-side;
  // this is not itself proof of anything.
  discount_override_token: z.string().uuid().nullable().default(null),
});

export type SaleInput = z.output<typeof saleSchema>;
export type SalePaymentInput = z.output<typeof salePaymentSchema>;

// ---------------------------------------------------------------------------

export const RETURN_REASONS = [
  "Wrong item dispensed",
  "Customer changed their mind",
  "Damaged packaging",
  "Adverse reaction reported",
  "Expired on arrival",
  "Duplicate purchase",
  "Other",
] as const;

export const salesReturnSchema = z
  .object({
    sale_id: z.string().uuid(),
    reason: z.enum(RETURN_REASONS),
    reason_detail: z
      .string()
      .trim()
      .max(300)
      .nullable()
      .optional()
      .transform((v) => (v === "" || v == null ? null : v)),
    refund_method: z.enum(PAYMENT_METHODS),
    items: z
      .array(
        z.object({
          sale_item_id: z.string().uuid(),
          quantity: z.coerce.number().int().positive(),
        }),
      )
      .min(1, "Select at least one item to return"),
  })
  .superRefine((value, ctx) => {
    if (value.reason === "Other" && !value.reason_detail) {
      ctx.addIssue({
        code: "custom",
        path: ["reason_detail"],
        message: "Explain the reason for this return",
      });
    }
  });

export type SalesReturnInput = z.output<typeof salesReturnSchema>;

// ---------------------------------------------------------------------------

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").max(200),
  // .nullable() matters on all three: zodResolver hands the submit handler
  // this schema's own transformed output (empty string already turned to
  // null), and the server re-validates that value through this same schema.
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+\-\s()]*$/, "Phone may contain only digits and + - ( ) characters")
    .nullable()
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  // Whichever of phone/email a customer gives is what finds them next visit —
  // neither is required on its own, but at least one is worth having.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .nullable()
    .optional()
    .refine((v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "Enter a valid email address")
    .transform((v) => (v === "" || v == null ? null : v)),
  address: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
});

export type CustomerFormValues = z.input<typeof customerSchema>;
export type CustomerInput = z.output<typeof customerSchema>;
