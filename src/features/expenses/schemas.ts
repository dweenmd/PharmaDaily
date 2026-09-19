import { z } from "zod";

/**
 * Operating cost categories for PharmaDaily:
 * Rent, Utilities, Salary, Transport, Maintenance, Supplies, Other
 */
export const EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Salary",
  "Transport",
  "Maintenance",
  "Supplies",
  "Other",
] as const;

export const PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "bKash / MFS",
  "Cheque",
  "Corporate Card",
  "Other",
] as const;

export const expenseSchema = z.object({
  category: z.preprocess(
    (val) => (val === "Salaries" ? "Salary" : val),
    z.enum(EXPENSE_CATEGORIES),
  ),
  description: z
    .string()
    .trim()
    .max(400)
    .nullable()
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  payment_method: z.string().optional().default("Cash"),
  notes: z
    .string()
    .trim()
    .max(400)
    .nullable()
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  attachment_name: z.string().nullable().optional(),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  expense_date: z.string().min(1, "Date is required"),
});

export type ExpenseFormValues = z.input<typeof expenseSchema>;
export type ExpenseInput = z.output<typeof expenseSchema>;
