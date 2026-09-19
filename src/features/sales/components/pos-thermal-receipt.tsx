"use client";

import * as React from "react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ReceiptItem = {
  name: string;
  generic?: string | null;
  dosage_form?: string | null;
  batch_no?: string;
  expiry_date?: string;
  quantity: number;
  unit_price: number;
  total: number;
};

export type PosReceiptData = {
  invoice_no: string;
  date_time: string;
  branch_name: string;
  branch_tagline?: string | null;
  branch_address?: string | null;
  branch_phone?: string | null;
  branch_email?: string | null;
  bin_no?: string | null;
  drug_lic?: string | null;
  cashier_name?: string | null;
  counter?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grand_total: number;
  amount_in_words?: string;
  payment_method: string;
  amount_received?: number;
  change?: number;

  // Customizable Footer & Toggles
  footer_thank_you?: string | null;
  footer_return_policy?: string | null;
  footer_helpline?: string | null;
  footer_tagline?: string | null;
  show_barcode?: boolean;
  show_batch_expiry?: boolean;
  show_customer_info?: boolean;
  show_cashier_info?: boolean;
  show_amount_in_words?: boolean;
};

type Props = {
  receipt: PosReceiptData;
  paperWidth?: "80mm" | "58mm" | "a4";
  className?: string;
};

export function PosThermalReceipt({ receipt, paperWidth = "80mm", className }: Props) {
  const is58mm = paperWidth === "58mm";

  const showBarcode = receipt.show_barcode !== false;
  const showBatchExpiry = receipt.show_batch_expiry !== false;
  const showCustomerInfo = receipt.show_customer_info !== false && Boolean(receipt.customer_name);
  const showCashierInfo = receipt.show_cashier_info !== false && Boolean(receipt.cashier_name);
  const showAmountInWords = receipt.show_amount_in_words !== false && Boolean(receipt.amount_in_words);

  const thankYouText = receipt.footer_thank_you || "*** THANK YOU · GET WELL SOON ***";
  const returnPolicyText =
    receipt.footer_return_policy ||
    "Returns accepted within 7 days with original receipt. Cold-chain items & cut strips are non-returnable.";
  const taglineText = receipt.footer_tagline || "PharmaDaily Cloud POS";

  return (
    <div
      id="printable-pos-receipt"
      className={cn(
        "bg-white text-black font-mono text-[12px] leading-tight select-none",
        is58mm ? "w-[58mm] p-2" : "w-[80mm] p-4",
        "mx-auto border border-zinc-200 shadow-sm print:border-0 print:shadow-none print:m-0 print:p-1",
        className
      )}
      style={{
        fontFamily: "'JetBrains Mono', 'Courier New', Courier, monospace",
      }}
    >
      {/* 1. Header (Store Name, Tagline & Legal Identifiers) */}
      <div className="text-center space-y-0.5 pb-2">
        <h1 className="font-bold text-[15px] uppercase tracking-wider">
          {receipt.branch_name || "PharmaDaily Pharmacy"}
        </h1>
        {receipt.branch_tagline && (
          <p className="text-[10px] text-zinc-600 font-medium italic">{receipt.branch_tagline}</p>
        )}
        {receipt.branch_address && (
          <p className="text-[10px] text-zinc-700">{receipt.branch_address}</p>
        )}
        <div className="text-[10px] text-zinc-700 flex justify-center gap-2 flex-wrap">
          {receipt.branch_phone && <span>Tel: {receipt.branch_phone}</span>}
          {receipt.bin_no && <span>BIN: {receipt.bin_no}</span>}
        </div>
        {receipt.branch_email && (
          <p className="text-[9px] text-zinc-600">{receipt.branch_email}</p>
        )}
        {receipt.drug_lic && (
          <p className="text-[10px] text-zinc-800 font-semibold">
            Drug Lic: {receipt.drug_lic}
          </p>
        )}
      </div>

      {/* Dashed Separator */}
      <div className="border-t border-dashed border-zinc-800 my-1.5" />

      {/* 2. Metadata (Invoice, Date, Cashier, Customer) */}
      <div className="text-[11px] space-y-0.5">
        <div className="flex justify-between">
          <span className="font-bold">INVOICE: #{receipt.invoice_no}</span>
          <span>{receipt.payment_method.toUpperCase()}</span>
        </div>
        <div className="flex justify-between text-zinc-700 text-[10px]">
          <span>DATE: {receipt.date_time}</span>
          {showCashierInfo && <span>BY: {receipt.cashier_name}</span>}
        </div>
        {showCustomerInfo && (
          <div className="flex justify-between text-[10px] text-zinc-800 pt-0.5">
            <span className="truncate">CUST: {receipt.customer_name}</span>
            {receipt.customer_phone && <span>{receipt.customer_phone}</span>}
          </div>
        )}
      </div>

      {/* Dashed Separator */}
      <div className="border-t border-dashed border-zinc-800 my-1.5" />

      {/* 3. Items Table Header */}
      <div className="flex justify-between text-[10px] font-bold pb-1 border-b border-zinc-800">
        <span className="w-1/2">{showBatchExpiry ? "ITEM / BATCH" : "ITEM NAME"}</span>
        <span className="w-1/6 text-center">QTY</span>
        <span className="w-1/6 text-right">PRICE</span>
        <span className="w-1/6 text-right">TOTAL</span>
      </div>

      {/* Line Items */}
      <div className="py-1 space-y-1.5">
        {receipt.items.map((item, idx) => (
          <div key={idx} className="text-[11px] leading-tight">
            <div className="font-bold truncate text-[11px]">
              {item.name}
            </div>

            {/* Batch & Expiry (Critical for Medicine Safety) */}
            {showBatchExpiry && (item.batch_no || item.expiry_date) && (
              <div className="text-[9px] text-zinc-600 flex gap-2">
                {item.batch_no && <span>B:{item.batch_no}</span>}
                {item.expiry_date && <span>Exp:{item.expiry_date}</span>}
              </div>
            )}

            <div className="flex justify-between text-zinc-800 text-[10px] pt-0.5">
              <span className="w-1/2 text-[9px] text-zinc-500">
                {item.dosage_form || item.generic || ""}
              </span>
              <span className="w-1/6 text-center font-semibold">{item.quantity}</span>
              <span className="w-1/6 text-right">{formatCurrency(item.unit_price)}</span>
              <span className="w-1/6 text-right font-bold">{formatCurrency(item.total)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Dashed Separator */}
      <div className="border-t border-dashed border-zinc-800 my-1.5" />

      {/* 4. Financial Calculations */}
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatCurrency(receipt.subtotal)}</span>
        </div>

        {receipt.discount > 0 && (
          <div className="flex justify-between text-zinc-700">
            <span>Discount:</span>
            <span>-{formatCurrency(receipt.discount)}</span>
          </div>
        )}

        <div className="flex justify-between text-zinc-600 text-[10px]">
          <span>VAT / Tax (0% Exempt):</span>
          <span>{formatCurrency(receipt.tax || 0)}</span>
        </div>

        {/* Double border or bold for Grand Total */}
        <div className="border-t border-b border-zinc-900 py-1 my-1 flex justify-between font-bold text-[13px]">
          <span>TOTAL PAYABLE:</span>
          <span>{formatCurrency(receipt.grand_total)}</span>
        </div>

        {showAmountInWords && (
          <p className="text-[10px] italic text-zinc-600 capitalize text-center">
            ({receipt.amount_in_words})
          </p>
        )}
      </div>

      {/* 5. Payment Tender Breakdown */}
      <div className="border-t border-dashed border-zinc-800 mt-1.5 pt-1 space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span>Paid Via ({receipt.payment_method}):</span>
          <span className="font-semibold">{formatCurrency(receipt.grand_total)}</span>
        </div>

        {receipt.amount_received != null && receipt.amount_received > 0 && (
          <>
            <div className="flex justify-between text-zinc-700">
              <span>Cash Received:</span>
              <span>{formatCurrency(receipt.amount_received)}</span>
            </div>
            <div className="flex justify-between font-bold text-zinc-900">
              <span>Change Returned:</span>
              <span>{formatCurrency(receipt.change ?? (receipt.amount_received - receipt.grand_total))}</span>
            </div>
          </>
        )}
      </div>

      {/* 6. Barcode Line for POS Gun Scanners */}
      {showBarcode && (
        <div className="text-center pt-3 pb-1">
          <div className="inline-block tracking-[4px] font-mono text-[14px] font-bold border-y border-zinc-400 py-0.5 px-3">
            *{receipt.invoice_no}*
          </div>
          <p className="text-[8px] text-zinc-500 mt-0.5">Scan to verify or process returns</p>
        </div>
      )}

      {/* 7. Footer Policies & Attributions */}
      <div className="text-center text-[9px] text-zinc-600 space-y-0.5 pt-2 border-t border-dashed border-zinc-800">
        <p className="font-semibold text-zinc-800">{thankYouText}</p>
        {returnPolicyText && <p>{returnPolicyText}</p>}
        {receipt.footer_helpline && (
          <p className="text-zinc-700 font-medium">Helpline: {receipt.footer_helpline}</p>
        )}
        <p className="text-[8px] text-zinc-400 pt-1">
          {taglineText} · {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
