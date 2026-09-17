import { z } from "zod";

/** Furthest-future expiry a real consignment could carry; guards against a typo'd year. */
const MAX_EXPIRY_YEARS = 20;

export const purchaseItemSchema = z.object({
  medicine_id: z.string().uuid("Select a medicine"),
  medicine_name: z.string().optional(), // display only, not sent to the database
  batch_no: z.string().trim().min(1, "Batch number is required").max(64),
  expiry_date: z
    .string()
    .min(1, "Expiry date is required")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date")
    .refine((v) => {
      const limit = new Date();
      limit.setFullYear(limit.getFullYear() + MAX_EXPIRY_YEARS);
      return new Date(v) <= limit;
    }, `Expiry cannot be more than ${MAX_EXPIRY_YEARS} years away`),
  quantity: z.coerce.number().int("Whole units only").positive("Quantity must be at least 1"),
  cost_price: z.coerce.number().min(0, "Cost cannot be negative"),
  selling_price: z.coerce.number().min(0, "Selling price cannot be negative"),
  mrp: z.coerce.number().min(0, "MRP cannot be negative"),
});

export const purchaseSchema = z
  .object({
    supplier_id: z.string().uuid("Select a supplier"),
    branch_id: z.string().uuid("Select a branch"),
    purchase_date: z.string().min(1, "Purchase date is required"),
    invoice_no: z.string().trim().min(1, "Supplier invoice number is required").max(64),
    paid_amount: z.coerce.number().min(0, "Paid amount cannot be negative").default(0),
    notes: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((v) => (v === "" || v === undefined ? null : v)),
    items: z.array(purchaseItemSchema).min(1, "Add at least one item"),
  })
  .superRefine((value, ctx) => {
    // Selling below cost is legal but almost always a data-entry slip, so it is
    // surfaced as a warning in the UI rather than blocked here. What IS blocked
    // is selling above the printed MRP, which is a regulatory problem.
    value.items.forEach((item, index) => {
      if (item.mrp > 0 && item.selling_price > item.mrp) {
        ctx.addIssue({
          code: "custom",
          path: ["items", index, "selling_price"],
          message: "Selling price cannot exceed MRP",
        });
      }
    });

    const total = value.items.reduce((sum, i) => sum + i.quantity * i.cost_price, 0);
    if (value.paid_amount > total + 0.009) {
      ctx.addIssue({
        code: "custom",
        path: ["paid_amount"],
        message: "Paid amount cannot exceed the purchase total",
      });
    }
  });

export type PurchaseFormValues = z.input<typeof purchaseSchema>;
export type PurchaseInput = z.output<typeof purchaseSchema>;
export type PurchaseItemInput = z.output<typeof purchaseItemSchema>;
