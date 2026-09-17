import { daysUntil } from "@/lib/format";
import { type SellableBatch } from "@/features/sales/queries";

export type PosWarning = {
  level: "info" | "caution" | "danger";
  label: string;
  detail: string;
};

/**
 * Warnings shown when a line is added to the cart.
 *
 * ALL OF THESE WARN; NONE OF THEM BLOCK. That is deliberate. A cashier can see
 * the prescription in the customer's hand and the system cannot, so a hard
 * block would only teach staff to work around the system — which is far more
 * dangerous than a warning they have read and dismissed.
 *
 * The one thing that IS blocked, elsewhere: already-expired stock never
 * reaches the POS at all, because getSellableStock() filters it out.
 */
export function warningsFor(batch: SellableBatch, quantity: number): PosWarning[] {
  const warnings: PosWarning[] = [];

  if (quantity > batch.available) {
    warnings.push({
      level: "danger",
      label: "Not enough stock",
      detail: `Only ${batch.available} left in batch ${batch.batch_no}.`,
    });
  }

  const days = daysUntil(batch.expiry_date);
  if (days <= 30) {
    warnings.push({
      level: "caution",
      label: "Expires soon",
      detail: `Batch ${batch.batch_no} expires in ${days} day${days === 1 ? "" : "s"}.`,
    });
  }

  if (batch.controlled_drug) {
    warnings.push({
      level: "danger",
      label: "Controlled drug",
      detail: "Verify the prescription and record the dispensing details.",
    });
  } else if (batch.prescription_required) {
    warnings.push({
      level: "caution",
      label: "Prescription required",
      detail: "Check the customer has a valid prescription before dispensing.",
    });
  }

  if (batch.mrp > 0 && batch.selling_price > batch.mrp) {
    warnings.push({
      level: "danger",
      label: "Above MRP",
      detail: "This batch is priced above its printed maximum retail price.",
    });
  }

  return warnings;
}

/** The most severe level across a set of warnings, for badge colouring. */
export function highestLevel(warnings: PosWarning[]): PosWarning["level"] | null {
  if (warnings.some((w) => w.level === "danger")) return "danger";
  if (warnings.some((w) => w.level === "caution")) return "caution";
  if (warnings.length > 0) return "info";
  return null;
}
