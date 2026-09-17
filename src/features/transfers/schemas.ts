import { z } from "zod";

/**
 * Lives apart from `actions.ts` because that file is `"use server"`.
 *
 * A schema is data, not a function, so Next.js can't pass it across the
 * server/client boundary the way it passes an action — importing a value
 * export from a `"use server"` module into a Client Component gets a
 * stripped reference back, not the real Zod object, and `zodResolver` throws
 * "Invalid input: not a Zod schema" the moment the form touches it.
 */

export const transferItemSchema = z.object({
  source_stock_id: z.string().uuid("Select a batch"),
  quantity: z.coerce.number().int("Whole units only").positive("Quantity must be at least 1"),
});

export const transferSchema = z.object({
  from_branch_id: z.string().uuid("Select the sending branch"),
  to_branch_id: z.string().uuid("Select the receiving branch"),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  items: z.array(transferItemSchema).min(1, "Add at least one item"),
});

export type TransferFormValues = z.input<typeof transferSchema>;
export type TransferInput = z.output<typeof transferSchema>;
