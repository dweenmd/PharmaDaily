import { z } from "zod";

export const paymentSchema = z.object({
  amount: z.coerce.number().positive("Enter an amount greater than zero"),
  // 'due' is excluded: settling a debt with a debt is not a payment.
  method: z.enum(["cash", "bkash", "nagad", "card"]),
  reference: z
    .string()
    .trim()
    .max(64)
    .nullable()
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  notes: z
    .string()
    .trim()
    .max(300)
    .nullable()
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
});

export type PaymentFormValues = z.input<typeof paymentSchema>;
export type PaymentInput = z.output<typeof paymentSchema>;
