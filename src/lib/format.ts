/**
 * Shared formatting.
 *
 * Money and dates are rendered in exactly one place so an invoice, a report
 * and a stock list can never disagree about how ৳1,250.00 or an expiry date
 * looks.
 */

const BDT = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Amounts arrive from PostgREST as strings, because numeric(14,2) does not fit
 * a JS number safely. Parse at the edge and keep the raw string around
 * wherever the exact value matters.
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return BDT.format(0);
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(n) ? BDT.format(n) : BDT.format(0);
}

export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(n) ? n : 0;
}

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DATETIME = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "—" : DATE.format(d);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "—" : DATETIME.format(d);
}

/** Whole days until a date. Negative once it has passed. */
export function daysUntil(date: string | Date): number {
  const target = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export type ExpiryStatus = "expired" | "critical" | "warning" | "ok";

/**
 * Expiry banding used by the stock list, the near-expiry report and the POS
 * warning in Phase 3.
 *
 * 90 days is the usual window for returning stock to a distributor, so
 * "warning" is the point at which it is still worth acting on.
 */
export function expiryStatus(expiryDate: string | Date): ExpiryStatus {
  const days = daysUntil(expiryDate);
  if (days < 0) return "expired";
  if (days <= 30) return "critical";
  if (days <= 90) return "warning";
  return "ok";
}

export type StockLevel = "out" | "critical" | "low" | "ok";

/**
 * Low-stock banding, compared against the medicine's reorder level.
 *
 * "critical" is half the reorder level rather than a fixed number, so a
 * fast-moving product with a threshold of 100 is flagged well before it runs
 * out, while a rare one with a threshold of 5 is not screaming constantly.
 */
export function stockLevel(quantity: number, reorderLevel: number): StockLevel {
  if (quantity <= 0) return "out";
  if (quantity <= Math.max(1, Math.floor(reorderLevel / 2))) return "critical";
  if (quantity <= reorderLevel) return "low";
  return "ok";
}
