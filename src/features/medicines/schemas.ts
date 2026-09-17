import { z } from "zod";

/** Common dosage forms in Bangladeshi pharmacy practice. */
export const DOSAGE_FORMS = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Suspension",
  "Injection",
  "IV Infusion",
  "Cream",
  "Ointment",
  "Gel",
  "Drops",
  "Eye Drops",
  "Ear Drops",
  "Nasal Spray",
  "Inhaler",
  "Suppository",
  "Powder",
  "Sachet",
  "Lotion",
] as const;

export const UNITS = [
  "Piece",
  "Strip",
  "Bottle",
  "Box",
  "Tube",
  "Vial",
  "Ampoule",
  "Sachet",
  "Pack",
] as const;

/**
 * Trims, and turns an empty string into null so the column stays NULL.
 *
 * `.nullable()` matters as much as `.optional()` here: zodResolver runs this
 * schema once client-side and hands the TRANSFORMED output — "" already
 * turned into null — to the submit handler, which sends exactly that to the
 * server action. The server re-validates with this same schema, so it has to
 * accept the null its own transform just produced, or every empty optional
 * field fails server-side with a bare "Invalid input" no matter what the
 * person typed.
 */
const optionalText = z
  .string()
  .trim()
  .max(200)
  .nullable()
  .optional()
  .transform((v) => (v === "" || v == null ? null : v));

export const medicineSchema = z.object({
  name: z.string().trim().min(1, "Medicine name is required").max(200),
  generic_name: optionalText,
  brand_name: optionalText,
  category_id: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" || v == null ? null : v)),
  dosage_form: optionalText,
  strength: optionalText,
  unit: optionalText,
  pack_size: optionalText,

  // Scanners emit digits; anything else is almost certainly a typo, and a
  // stray space would silently create a second, unscannable product.
  barcode: z
    .string()
    .trim()
    .max(64)
    .regex(/^[A-Za-z0-9-]*$/, "Barcode may contain only letters, digits and hyphens")
    .nullable()
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),

  manufacturer: optionalText,
  prescription_required: z.boolean().default(false),
  controlled_drug: z.boolean().default(false),
  reorder_level: z.coerce
    .number()
    .int("Reorder level must be a whole number")
    .min(0, "Reorder level cannot be negative")
    .max(100000)
    .default(10),
  is_active: z.boolean().default(true),
});

/**
 * The schema transforms ("" -> null, string -> number), so its input and
 * output types differ. The form binds to the INPUT type, because that is what
 * the DOM actually holds; server actions receive the OUTPUT type, which is
 * what the database column expects.
 */
export type MedicineFormValues = z.input<typeof medicineSchema>;
export type MedicineInput = z.output<typeof medicineSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(100),
});

export type CategoryInput = z.infer<typeof categorySchema>;

/** Result shape every medicine/category server action returns. */
export type ActionResult<T = void> =
  { ok: true; data: T } | { ok: false; error: string; field?: string };
