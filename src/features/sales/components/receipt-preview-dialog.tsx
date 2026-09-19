"use client";

import * as React from "react";
import {
  Check,
  Download,
  ExternalLink,
  FileText,
  Printer,
  Receipt,
  RotateCw,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PosThermalReceipt, type PosReceiptData } from "@/features/sales/components/pos-thermal-receipt";
import { printThermalReceipt } from "@/features/sales/lib/print-thermal-receipt";
import { cn } from "@/lib/utils";

type PaperFormat = "80mm" | "58mm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptData: PosReceiptData;
};

export function ReceiptPreviewDialog({ open, onOpenChange, receiptData }: Props) {
  const [paperFormat, setPaperFormat] = React.useState<PaperFormat>("80mm");

  const handlePrint = () => {
    printThermalReceipt(receiptData, paperFormat);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg border-zinc-200 dark:border-zinc-800 p-0 overflow-hidden bg-zinc-100 dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
              <Receipt className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                POS Receipt #{receiptData.invoice_no}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-zinc-500">
                Thermal POS printer preview
              </DialogDescription>
            </div>
          </div>

          {/* Paper Format Switcher */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs">
            <button
              type="button"
              onClick={() => setPaperFormat("80mm")}
              className={cn(
                "px-2 py-0.5 rounded font-mono text-[11px] font-medium transition-colors",
                paperFormat === "80mm"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-bold"
                  : "text-zinc-500 hover:text-zinc-800"
              )}
            >
              80mm
            </button>
            <button
              type="button"
              onClick={() => setPaperFormat("58mm")}
              className={cn(
                "px-2 py-0.5 rounded font-mono text-[11px] font-medium transition-colors",
                paperFormat === "58mm"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-bold"
                  : "text-zinc-500 hover:text-zinc-800"
              )}
            >
              58mm
            </button>
          </div>
        </div>

        {/* Realistic POS Receipt Canvas (Scrollable) */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[65vh] flex justify-center bg-zinc-200/60 dark:bg-zinc-950">
          <div className="shadow-xl rounded-sm overflow-hidden bg-white">
            <PosThermalReceipt receipt={receiptData} paperWidth={paperFormat} />
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-5 py-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-zinc-500"
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handlePrint}
              className="text-xs font-semibold h-9 px-5 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
            >
              <Printer className="size-3.5 mr-1.5" />
              Print to POS Machine
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
