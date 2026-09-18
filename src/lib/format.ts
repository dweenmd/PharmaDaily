/**
 * Shared formatting.
 *
 * Money and dates are rendered in exactly one place so an invoice, a report
 * and a stock list can never disagree about how ৳1,250.00 or an expiry date
 * looks.
 */

/**
 * Digits and grouping only — the ৳ is added by hand below.
 *
 * `style: "currency"` with BDT renders "BDT 1,250.00" in every runtime this
 * app actually runs in, which is banking notation nobody at a pharmacy
 * counter writes, and three characters wider than the symbol in every table
 * cell and tile on every screen. `currencyDisplay: "narrowSymbol"` does give
 * ৳, but it depends on ICU data that an older tablet browser may not carry —
 * and a server and client that disagree about a price is a hydration
 * mismatch. Prefixing the symbol ourselves is the same output everywhere.
 *
 * Grouping stays Western (12,500,000) rather than lakh-style (1,25,00,000)
 * to match the Latin digits used throughout the UI; Bengali numerals are a
 * localisation decision, not a formatting one.
 */
const AMOUNT = new Intl.NumberFormat("en-BD", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const CURRENCY_SYMBOL = "৳";

function withSymbol(n: number): string {
  // The sign leads, as in -৳50.00: a minus tucked between symbol and digits
  // is easy to miss on a refund line.
  return n < 0 ? `-${CURRENCY_SYMBOL}${AMOUNT.format(Math.abs(n))}` : `${CURRENCY_SYMBOL}${AMOUNT.format(n)}`;
}

/**
 * Amounts arrive from PostgREST as strings, because numeric(14,2) does not fit
 * a JS number safely. Parse at the edge and keep the raw string around
 * wherever the exact value matters.
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return withSymbol(0);
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(n) ? withSymbol(n) : withSymbol(0);
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

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function numToWords(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n] ?? "";
  if (n < 100) return `${TENS[Math.floor(n / 10)] ?? ""} ${ONES[n % 10] ?? ""}`.trim();
  if (n < 1000) {
    return `${ONES[Math.floor(n / 100)] ?? ""} Hundred ${numToWords(n % 100)}`.trim();
  }
  if (n < 100000) {
    return `${numToWords(Math.floor(n / 1000))} Thousand ${numToWords(n % 1000)}`.trim();
  }
  if (n < 10000000) {
    return `${numToWords(Math.floor(n / 100000))} Lakh ${numToWords(n % 100000)}`.trim();
  }
  return `${numToWords(Math.floor(n / 10000000))} Crore ${numToWords(n % 10000000)}`.trim();
}

/** Convert amount to words in Taka & Paisa for professional invoices. */
export function amountInWords(amount: number): string {
  if (amount <= 0) return "Zero Taka Only";
  const taka = Math.floor(amount);
  const paisa = Math.round((amount - taka) * 100);

  const takaStr = numToWords(taka) + " Taka";
  const paisaStr = paisa > 0 ? ` and ${numToWords(paisa)} Paisa` : "";
  return `${takaStr}${paisaStr} Only`;
}
