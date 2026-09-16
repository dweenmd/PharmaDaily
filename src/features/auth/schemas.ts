import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Distinct failure modes the login screen renders differently.
 *
 * Kept as a code rather than a message so the server never has to send
 * user-facing copy, and the client can decide how to present each case.
 */
export type LoginErrorCode =
  | "invalid_credentials"
  | "account_inactive"
  | "email_not_confirmed"
  | "rate_limited"
  | "offline"
  | "unknown";

export type LoginResult = { ok: true; redirectTo: string } | { ok: false; code: LoginErrorCode };
