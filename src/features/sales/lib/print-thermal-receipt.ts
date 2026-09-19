import type { PosReceiptData } from "@/features/sales/components/pos-thermal-receipt";
import { formatCurrency } from "@/lib/format";

/**
 * Isolated thermal POS receipt printing utility.
 * Creates an isolated hidden iframe and prints ONLY the thermal receipt slip.
 * Eliminates background website DOM, sidebars, modals, and screen distortion.
 */
export function printThermalReceipt(receipt: PosReceiptData, paperWidth: "80mm" | "58mm" = "80mm") {
  if (typeof window === "undefined") return;

  const is58mm = paperWidth === "58mm";
  const widthCss = is58mm ? "58mm" : "80mm";
  const fontSizeCss = is58mm ? "10px" : "12px";

  const itemsHtml = receipt.items
    .map(
      (item) => `
      <div style="margin-bottom: 5px; font-size: ${fontSizeCss};">
        <div style="font-weight: bold; text-transform: uppercase;">${escapeHtml(item.name)}</div>
        ${
          item.batch_no || item.expiry_date
            ? `<div style="font-size: 9px; color: #555;">${
                item.batch_no ? `Batch: ${escapeHtml(item.batch_no)} ` : ""
              }${item.expiry_date ? `| Exp: ${escapeHtml(item.expiry_date)}` : ""}</div>`
            : ""
        }
        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 1px;">
          <span style="color: #666;">${escapeHtml(item.dosage_form || item.generic || "")}</span>
          <span>${item.quantity} x ${formatCurrency(item.unit_price)}</span>
          <span style="font-weight: bold;">${formatCurrency(item.total)}</span>
        </div>
      </div>
    `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt #${escapeHtml(receipt.invoice_no)}</title>
        <style>
          @page {
            size: ${widthCss} auto;
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: ${is58mm ? "2mm" : "4mm"};
            width: ${widthCss};
            font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace;
            background: #ffffff;
            color: #000000;
            line-height: 1.25;
            font-size: ${fontSizeCss};
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .border-dashed { border-top: 1px dashed #000; margin: 6px 0; }
          .border-solid { border-top: 1px solid #000; margin: 6px 0; }
          .border-double { border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 4px 0; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .barcode {
            display: inline-block;
            font-size: 14px;
            font-weight: bold;
            letter-spacing: 4px;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 2px 8px;
            margin: 6px 0 2px 0;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="text-center">
          <div style="font-size: 15px; font-weight: bold; text-transform: uppercase;">
            ${escapeHtml(receipt.branch_name || "PharmaDaily Pharmacy")}
          </div>
          ${receipt.branch_address ? `<div style="font-size: 10px;">${escapeHtml(receipt.branch_address)}</div>` : ""}
          <div style="font-size: 10px;">
            ${receipt.branch_phone ? `Tel: ${escapeHtml(receipt.branch_phone)} ` : ""}
            ${receipt.bin_no ? `| BIN: ${escapeHtml(receipt.bin_no)}` : ""}
          </div>
          ${receipt.drug_lic ? `<div style="font-size: 10px; font-weight: bold;">Drug Lic: ${escapeHtml(receipt.drug_lic)}</div>` : ""}
        </div>

        <div class="border-dashed"></div>

        <!-- Invoice Meta -->
        <div style="font-size: 10px;">
          <div class="row">
            <span class="font-bold">INVOICE: #${escapeHtml(receipt.invoice_no)}</span>
            <span>${escapeHtml(receipt.payment_method.toUpperCase())}</span>
          </div>
          <div class="row" style="color: #444;">
            <span>DATE: ${escapeHtml(receipt.date_time)}</span>
            ${receipt.cashier_name ? `<span>BY: ${escapeHtml(receipt.cashier_name)}</span>` : ""}
          </div>
          ${
            receipt.customer_name
              ? `<div class="row" style="margin-top: 2px;">
                  <span>CUST: ${escapeHtml(receipt.customer_name)}</span>
                  ${receipt.customer_phone ? `<span>${escapeHtml(receipt.customer_phone)}</span>` : ""}
                </div>`
              : ""
          }
        </div>

        <div class="border-dashed"></div>

        <!-- Column Headers -->
        <div class="row font-bold" style="font-size: 10px; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 4px;">
          <span style="flex: 2;">ITEM / BATCH</span>
          <span style="flex: 1; text-align: center;">QTY</span>
          <span style="flex: 1; text-align: right;">PRICE</span>
          <span style="flex: 1; text-align: right;">TOTAL</span>
        </div>

        <!-- Items -->
        ${itemsHtml}

        <div class="border-dashed"></div>

        <!-- Totals -->
        <div style="font-size: 11px;">
          <div class="row">
            <span>Subtotal:</span>
            <span>${formatCurrency(receipt.subtotal)}</span>
          </div>
          ${
            receipt.discount > 0
              ? `<div class="row">
                  <span>Discount:</span>
                  <span>-${formatCurrency(receipt.discount)}</span>
                </div>`
              : ""
          }
          <div class="row" style="font-size: 10px; color: #555;">
            <span>VAT / Tax (0% Exempt):</span>
            <span>${formatCurrency(receipt.tax || 0)}</span>
          </div>
          <div class="border-double row font-bold" style="font-size: 13px;">
            <span>TOTAL PAYABLE:</span>
            <span>${formatCurrency(receipt.grand_total)}</span>
          </div>
          ${
            receipt.amount_in_words
              ? `<div class="text-center" style="font-size: 9px; font-style: italic; color: #555;">(${escapeHtml(receipt.amount_in_words)})</div>`
              : ""
          }
        </div>

        <!-- Tender & Change -->
        <div class="border-dashed"></div>
        <div style="font-size: 10px;">
          <div class="row">
            <span>Paid Via (${escapeHtml(receipt.payment_method)}):</span>
            <span class="font-bold">${formatCurrency(receipt.grand_total)}</span>
          </div>
          ${
            receipt.amount_received != null && receipt.amount_received > 0
              ? `<div class="row">
                  <span>Cash Tendered:</span>
                  <span>${formatCurrency(receipt.amount_received)}</span>
                </div>
                <div class="row font-bold">
                  <span>Change Due:</span>
                  <span>${formatCurrency(receipt.change ?? Math.max(0, receipt.amount_received - receipt.grand_total))}</span>
                </div>`
              : ""
          }
        </div>

        <!-- Barcode -->
        <div class="text-center" style="margin-top: 6px;">
          <div class="barcode">*${escapeHtml(receipt.invoice_no)}*</div>
          <div style="font-size: 8px; color: #666;">Scan barcode to verify sale or return</div>
        </div>

        <!-- Footer Policy -->
        <div class="border-dashed"></div>
        <div class="text-center" style="font-size: 9px; color: #444; line-height: 1.3;">
          <div class="font-bold" style="color: #000;">*** THANK YOU · GET WELL SOON ***</div>
          <div>Returns accepted within 7 days with receipt.</div>
          <div>Cold-chain items & cut strips are non-returnable.</div>
          <div style="font-size: 8px; color: #888; margin-top: 4px;">PharmaDaily Cloud POS</div>
        </div>
      </body>
    </html>
  `;

  // Create isolated iframe
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  // Trigger print after iframe renders
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Thermal print error:", e);
      window.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }
  }, 250);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
