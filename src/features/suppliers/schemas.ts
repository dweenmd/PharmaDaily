import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required").max(200),
  // .nullable() matters here: zodResolver hands the submit handler this
  // schema's own transformed output (empty string already turned to null),
  // and the server re-validates that value through this same schema.
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+\-\s()]*$/, "Phone may contain only digits and + - ( ) characters")
    .nullable()
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  address: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  is_active: z.boolean().default(true),
});

export type SupplierFormValues = z.input<typeof supplierSchema>;
export type SupplierInput = z.output<typeof supplierSchema>;

// Note: due_amount is deliberately absent. It is a running total maintained by
// create_purchase() inside the purchase transaction, so letting a form write it
// directly would let the supplier ledger drift away from the purchases it is
// supposed to summarise.
