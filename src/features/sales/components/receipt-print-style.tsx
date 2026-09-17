import { type ReceiptPaperSize } from "@/features/settings/queries";

const PAGE_SIZE: Record<ReceiptPaperSize, string> = {
  "58mm": "58mm auto",
  "80mm": "80mm auto",
  a4: "A4",
};

/**
 * Tells the browser's print dialog what paper this actually is.
 *
 * Without an explicit `@page size`, a "Print" click sends the invoice to
 * whatever the OS default happens to be — usually A4 or Letter — and a
 * 58/80mm thermal till printer either chops the receipt off mid-line or
 * scales it down to a sliver in the corner of a full sheet. This is the one
 * line that makes "Print" on a till printer actually work.
 */
export function ReceiptPrintStyle({ paperSize }: { paperSize: ReceiptPaperSize }) {
  return (
    <style>{`
      @media print {
        @page {
          size: ${PAGE_SIZE[paperSize]};
          margin: ${paperSize === "a4" ? "12mm" : "2mm"};
        }
      }
    `}</style>
  );
}
