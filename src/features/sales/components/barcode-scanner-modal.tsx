"use client";

import * as React from "react";
import {
  AlertCircle,
  Barcode,
  Check,
  CornerDownLeft,
  Package,
  Plus,
  Scan,
  ScanBarcode,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { type SellableBatch } from "@/features/sales/queries";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stock: SellableBatch[];
  onAddBatch: (batch: SellableBatch) => void;
};

export function BarcodeScannerModal({ open, onOpenChange, stock, onAddBatch }: Props) {
  const [barcodeInput, setBarcodeInput] = React.useState("");
  const [lastScanned, setLastScanned] = React.useState<string | null>(null);
  const [scannedBatches, setScannedBatches] = React.useState<SellableBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus the input whenever the modal opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setBarcodeInput("");
      setLastScanned(null);
      setScannedBatches([]);
      setSelectedBatchId(null);
    }
  }, [open]);

  // Handle barcode lookup
  const handleScanSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = barcodeInput.trim();
    if (!raw) return;

    setLastScanned(raw);

    // Look for matching batches in the catalog
    // Supports matching by exact barcode, medicine name, or batch no
    const matches = stock.filter(
      (b) =>
        b.barcode?.toLowerCase() === raw.toLowerCase() ||
        b.batch_no.toLowerCase() === raw.toLowerCase() ||
        b.medicine_name.toLowerCase().includes(raw.toLowerCase())
    );

    if (matches.length === 0) {
      setScannedBatches([]);
      setSelectedBatchId(null);
      toast.error(`No medicine found for barcode: "${raw}"`);
    } else {
      // Sort batches by FEFO (First-Expired, First-Out)
      const sorted = [...matches].sort(
        (a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
      );
      setScannedBatches(sorted);
      if (sorted[0]) {
        setSelectedBatchId(sorted[0].branch_stock_id); // Default to FEFO recommended batch

        if (sorted.length === 1) {
          toast.success(`Found ${sorted[0].medicine_name}`);
        } else {
          toast.info(`Found ${sorted.length} batches. FEFO batch pre-selected.`);
        }
      }
    }

    setBarcodeInput("");
  };

  const handleAddCurrent = () => {
    const batchToAdd =
      scannedBatches.find((b) => b.branch_stock_id === selectedBatchId) || scannedBatches[0];
    if (!batchToAdd) return;

    onAddBatch(batchToAdd);
    toast.success(`Added ${batchToAdd.medicine_name} to cart`);
    onOpenChange(false);
  };

  const currentBatch =
    scannedBatches.find((b) => b.branch_stock_id === selectedBatchId) || scannedBatches[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl border-zinc-200 dark:border-zinc-800 p-0 overflow-hidden bg-white dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
              <ScanBarcode className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Scan Barcode
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                Use hardware barcode gun or type barcode manually. Press Enter to submit.
              </DialogDescription>
            </div>
          </div>
          <Kbd className="font-mono text-[10px]">F9</Kbd>
        </div>

        <div className="p-6 space-y-6">
          {/* Large Centered Scanner Input Area */}
          <form onSubmit={handleScanSubmit} className="space-y-3">
            <div className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/50 hover:border-zinc-400 transition-colors">
              <div className="size-12 rounded-full bg-zinc-200/80 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 mb-2">
                <Scan className="size-6 animate-pulse" />
              </div>

              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Scan medicine barcode
              </span>
              <span className="text-xs text-zinc-500 mt-0.5">
                Laser scanner input automatically focused
              </span>

              {/* Centered Large Barcode Input */}
              <div className="w-full max-w-md mt-4 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="e.g. PARA500TAB or scan gun..."
                  className="w-full h-12 text-center text-base font-mono font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 tracking-wide"
                />
                <button
                  type="submit"
                  disabled={!barcodeInput.trim()}
                  className="absolute right-2 top-2 h-8 px-3 rounded-lg bg-zinc-900 text-zinc-50 text-xs font-medium disabled:opacity-30 transition-opacity flex items-center gap-1"
                >
                  <CornerDownLeft className="size-3" />
                  <span>Scan</span>
                </button>
              </div>
            </div>
          </form>

          {/* Results Area */}
          {lastScanned && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
                <span>Last scanned barcode:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                  {lastScanned}
                </span>
              </div>

              {scannedBatches.length > 0 && currentBatch ? (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4 shadow-sm">
                  {/* Medicine Information */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {currentBatch.medicine_name}
                      </h3>
                      <p className="text-xs text-zinc-500">
                        {currentBatch.generic_name} {currentBatch.strength && `· ${currentBatch.strength}`}{" "}
                        {currentBatch.manufacturer && `· ${currentBatch.manufacturer}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                        {formatCurrency(currentBatch.selling_price)}
                      </div>
                      <div className="text-xs text-zinc-500">
                        Stock: {currentBatch.available} {currentBatch.unit || "units"}
                      </div>
                    </div>
                  </div>

                  {/* Multiple Batches Selection if applicable */}
                  {scannedBatches.length > 1 ? (
                    <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          Select Batch ({scannedBatches.length} available)
                        </span>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          FEFO Order
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {scannedBatches.map((b, idx) => {
                          const isSelected = (selectedBatchId || scannedBatches[0]?.branch_stock_id) === b.branch_stock_id;
                          const isFefoRecommended = idx === 0;

                          return (
                            <div
                              key={b.branch_stock_id}
                              onClick={() => setSelectedBatchId(b.branch_stock_id)}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-all",
                                isSelected
                                  ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800/80 font-medium"
                                  : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    "size-4 rounded-full border flex items-center justify-center text-[10px]",
                                    isSelected
                                      ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900"
                                      : "border-zinc-300"
                                  )}
                                >
                                  {isSelected && <Check className="size-2.5" />}
                                </div>
                                <span className="font-mono">{b.batch_no}</span>
                                {isFefoRecommended && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                                    FEFO recommended batch
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-3 font-mono text-zinc-600 dark:text-zinc-400">
                                <span>Exp: {formatDate(b.expiry_date)}</span>
                                <span>·</span>
                                <span>Stock: {b.available}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Single Batch Meta */
                    <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-xs">
                      <div>
                        <span className="text-zinc-400 block text-[11px]">Batch</span>
                        <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                          {currentBatch.batch_no}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-[11px]">Expiry</span>
                        <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                          {formatDate(currentBatch.expiry_date)}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-[11px]">Recommendation</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="size-3" />
                          FEFO Valid
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Add to Sale Button */}
                  <Button
                    onClick={handleAddCurrent}
                    className="w-full h-10 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-semibold"
                  >
                    <Plus className="size-4 mr-2" />
                    Add to Sale
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-6 text-center space-y-2">
                  <Package className="size-8 text-zinc-400 mx-auto" />
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    No medicine found
                  </p>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    Barcode "{lastScanned}" is not linked to any available stock batch in this branch.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
