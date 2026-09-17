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

export const branchSchema = z.object({
  name: z.string().trim().min(1, "Branch name is required").max(200),
  // Feeds the invoice prefix, so it has to stay short, uppercase and free of
  // anything that would make an invoice number ambiguous.
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Use at least 2 characters")
    .max(10, "Keep it to 10 characters or fewer")
    .regex(/^[A-Z0-9]+$/, "Letters and digits only — it becomes the invoice prefix"),
  address: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+\-\s()]*$/, "Phone may contain only digits and + - ( ) characters")
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  is_active: z.boolean().default(true),
});

export type BranchFormValues = z.input<typeof branchSchema>;
export type BranchInput = z.output<typeof branchSchema>;
