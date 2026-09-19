import { type ReceiptPaperSize } from "@/features/settings/queries";

const PAGE_SIZE: Record<ReceiptPaperSize, string> = {
  "58mm": "58mm auto",
  "80mm": "80mm auto",
  a4: "A4",
};

/**
 * Ensures clean, isolated thermal POS receipt / invoice printing.
 * Strips away application navigation, header, sidebar, badges, and buttons.
 * Renders ONLY the clean pharmacy invoice slip sized to POS paper (80mm / 58mm / A4).
 */
export function ReceiptPrintStyle({ paperSize }: { paperSize: ReceiptPaperSize }) {
  const isThermal = paperSize !== "a4";

  return (
    <style>{`
      @media print {
        @page {
          size: ${PAGE_SIZE[paperSize]};
          margin: ${isThermal ? "0mm" : "10mm"};
        }

        /* Hide all UI layout shells, navigation, sidebar, and breadcrumbs */
        header,
        aside,
        nav,
        [data-slot="sidebar"],
        [data-slot="sidebar-wrapper"],
        [data-sidebar],
        [data-slot="dialog-overlay"],
        [data-slot="sheet-overlay"],
        button,
        .print\\:hidden {
          display: none !important;
        }

        /* Reset body and layout containers */
        html,
        body {
          background: #ffffff !important;
          color: #000000 !important;
          margin: 0 !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        main,
        [data-slot="sidebar-inset"] {
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
          background: #ffffff !important;
          width: 100% !important;
        }

        /* Ensure card fills exact thermal paper width */
        .mx-auto {
          margin: 0 auto !important;
          max-width: ${isThermal ? (paperSize === "58mm" ? "58mm" : "80mm") : "100%"} !important;
        }

        /* Card print resets */
        [data-slot="card"] {
          border: none !important;
          box-shadow: none !important;
          padding: ${isThermal ? "2mm" : "4mm"} !important;
          background: #ffffff !important;
          color: #000000 !important;
          border-radius: 0 !important;
        }
      }
    `}</style>
  );
}
