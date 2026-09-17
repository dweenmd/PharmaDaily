import { z } from "zod";

import { USER_ROLES } from "@/lib/auth/roles";

/**
 * Roles a branch manager may assign.
 *
 * Deliberately excludes branch_manager and super_admin. A manager who can
 * mint another manager — or promote themselves by creating a second account —
 * has escalated their own privileges, which is the whole thing the role model
 * exists to prevent.
 */
export const MANAGER_ASSIGNABLE_ROLES = ["cashier", "stock_manager", "pharmacist"] as const;

const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(72, "Passwords are limited to 72 characters")
  .refine((v) => !/^[a-z]+$/i.test(v), "Mix in a number or symbol");

export const createStaffSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Enter a valid email address")
      .transform((v) => v.toLowerCase()),
    // When true, no password is collected here at all — an invite email is
    // sent and the recipient picks their own. When false, the admin sets one
    // on the spot and hands it over in person, same as before.
    send_invite: z.boolean().default(false),
    password: z.string().optional(),
    role: z.enum(USER_ROLES),
    // Required for every role except super_admin, who is chain-wide by design.
    branch_id: z.string().uuid().nullable().default(null),
  })
  .superRefine((val, ctx) => {
    if (val.send_invite) return;
    const result = passwordSchema.safeParse(val.password ?? "");
    if (!result.success) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: result.error.issues[0]?.message ?? "Enter a password",
      });
    }
  });

export type CreateStaffValues = z.input<typeof createStaffSchema>;
export type CreateStaffInput = z.output<typeof createStaffSchema>;

export const updateStaffSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  role: z.enum(USER_ROLES),
  branch_id: z.string().uuid().nullable().default(null),
  is_active: z.boolean().default(true),
});

export type UpdateStaffValues = z.input<typeof updateStaffSchema>;
export type UpdateStaffInput = z.output<typeof updateStaffSchema>;

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});

export const changeOwnPasswordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    password: passwordSchema,
    confirm: z.string().min(1, "Repeat the new password"),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "The two passwords do not match",
  });

export type ChangeOwnPasswordValues = z.input<typeof changeOwnPasswordSchema>;
