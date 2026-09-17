import { z } from "zod";

export const updateOwnNameSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
});

export type UpdateOwnNameInput = z.output<typeof updateOwnNameSchema>;
