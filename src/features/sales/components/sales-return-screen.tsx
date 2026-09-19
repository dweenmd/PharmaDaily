"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  CornerDownLeft,
  HelpCircle,
  Package,
  Receipt,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  Undo2,
  User,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ReturnItemRow = {
  id: string;
  medicineName: string;
  strength: string;
  dosageForm: string;
  batchNo: string;
  originalQty: number;
  returnQty: number;
  unitPrice: number;
  selected: boolean;
};

export type ReturnSaleInfo = {
  invoiceNo: string;
  date: string;
  customerName: string;
  customerPhone: string;
  cashierName: string;
  originalTotal: number;
  paymentMethod: string;
};

const SAMPLE_SALE: ReturnSaleInfo = {
  invoiceNo: "BR-HQ-00231",
  date: "19 Sep 2026 · 10:15 AM",
  customerName: "Md. Rahim",
  customerPhone: "017XXXXXXXX",
  cashierName: "Tanvir Ahmed",
  originalTotal: 1250.0,
  paymentMethod: "Cash",
};

const SAMPLE_ITEMS: ReturnItemRow[] = [
  {
    id: "item-1",
    medicineName: "Paracetamol 500 mg",
    strength: "500 mg",
    dosageForm: "Tablet",
    batchNo: "B-NPA-2024",
    originalQty: 10,
    returnQty: 2,
    unitPrice: 12.0,
    selected: true,
  },
  {
    id: "item-2",
    medicineName: "Amoxicillin 500 mg",
    strength: "500 mg",
    dosageForm: "Capsule",
    batchNo: "B-AMX-8810",
    originalQty: 20,
    returnQty: 10,
    unitPrice: 15.0,
    selected: true,
  },
  {
    id: "item-3",
    medicineName: "Omeprazole 20 mg",
    strength: "20 mg",
    dosageForm: "Capsule",
    batchNo: "B-SEC-5512",
    originalQty: 14,
    returnQty: 1,
    unitPrice: 6.0,
    selected: false,
  },
  {
    id: "item-4",
    medicineName: "Azithromycin 200 mg/5 ml",
    strength: "200 mg/5 ml",
    dosageForm: "Syrup",
    batchNo: "B-AZI-2024",
    originalQty: 1,
    returnQty: 1,
    unitPrice: 150.0,
    selected: false,
  },
];

export function SalesReturnScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("BR-HQ-00231");
  const [saleLoaded, setSaleLoaded] = React.useState<ReturnSaleInfo | null>(SAMPLE_SALE);
  const [items, setItems] = React.useState<ReturnItemRow[]>(SAMPLE_ITEMS);

  // Return Reason: Damaged, Wrong Medicine, Customer Return, Other
  const [reason, setReason] = React.useState<string>("Customer Return");
  const [reasonDetail, setReasonDetail] = React.useState("");

  // Refund Method: Cash, Original Payment Method, Other
  const [refundMethod, setRefundMethod] = React.useState<string>("Cash");

  // Confirmation Modal
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error("Please enter an Invoice Number, Customer, or Phone.");
      return;
    }

    toast.info(`Fetching sale details for "${searchQuery}"...`);
    // Simulated fetch
    setSaleLoaded(SAMPLE_SALE);
    setItems(SAMPLE_ITEMS);
  };

  const toggleItemSelect = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i))
    );
  };

  const setItemReturnQty = (id: string, qty: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, returnQty: Math.max(1, Math.min(qty, i.originalQty)) }
          : i
      )
    );
  };

  // Calculations
  const selectedItems = items.filter((i) => i.selected && i.returnQty > 0);
  const returnAmount = selectedItems.reduce(
    (sum, i) => sum + i.returnQty * i.unitPrice,
    0
  );
  const originalTotal = saleLoaded?.originalTotal || 0;
  const finalAmount = Math.max(0, originalTotal - returnAmount);

  const handleProcessRefund = async () => {
    setIsProcessing(true);
    await new Promise((res) => setTimeout(res, 1000));
    setIsProcessing(false);
    setConfirmOpen(false);

    toast.success("Sales Return processed successfully", {
      description: `Refund of ${formatCurrency(returnAmount)} issued via ${refundMethod}. Restocked ${selectedItems.length} items.`,
    });

    // Reset or navigate
    setItems(items.map((i) => ({ ...i, selected: false })));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Sales Return
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono">
              POS / Refund
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Search invoices, record returned medications back into branch inventory, and process customer refunds.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/sales")}
          className="text-xs font-medium"
        >
          <ArrowLeft className="size-3.5 mr-1.5" />
          Back to Sales
        </Button>
      </div>

      {/* Search Section: Invoice Number / Customer / Phone */}
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Search Sale
          </CardTitle>
          <CardDescription className="text-xs text-zinc-500">
            Find original transaction using Invoice Number, Customer Name, or Mobile Number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="size-4 text-zinc-400 absolute left-3 top-3" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Invoice Number / Customer / Phone..."
                className="pl-9 h-11 text-sm bg-zinc-50/50 dark:bg-zinc-950 font-medium"
              />
            </div>
            <Button
              type="submit"
              className="h-11 px-6 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold"
            >
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {saleLoaded && (
        <div className="space-y-6">
          {/* Sale Information Overview Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div>
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Invoice
              </span>
              <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {saleLoaded.invoiceNo}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Date & Time
              </span>
              <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300">
                {saleLoaded.date}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Customer
              </span>
              <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                {saleLoaded.customerName} ({saleLoaded.customerPhone})
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Cashier
              </span>
              <span className="text-xs text-zinc-700 dark:text-zinc-300">
                {saleLoaded.cashierName}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Return Items
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    Check the items to return and specify the quantities being returned.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {selectedItems.length} selected
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50/70 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">Return</th>
                      <th className="py-3 px-4">Medicine</th>
                      <th className="py-3 px-4 text-center">Original Qty</th>
                      <th className="py-3 px-4 text-center">Return Qty</th>
                      <th className="py-3 px-4 text-right">Unit Price</th>
                      <th className="py-3 px-4 text-right">Refund</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {items.map((item) => {
                      const itemRefund = item.selected ? item.returnQty * item.unitPrice : 0;

                      return (
                        <tr
                          key={item.id}
                          className={cn(
                            "transition-colors",
                            item.selected
                              ? "bg-zinc-50/60 dark:bg-zinc-800/30"
                              : "hover:bg-zinc-50/30 dark:hover:bg-zinc-800/20"
                          )}
                        >
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => toggleItemSelect(item.id)}
                              className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                            />
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {item.medicineName}
                            </div>
                            <div className="text-xs text-zinc-500 font-mono">
                              Batch: {item.batchNo} · {item.dosageForm}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center font-mono text-zinc-600 dark:text-zinc-400">
                            {item.originalQty}
                          </td>

                          <td className="py-3 px-4 text-center">
                            {item.selected ? (
                              <div className="inline-flex items-center gap-1">
                                <Input
                                  type="number"
                                  min={1}
                                  max={item.originalQty}
                                  value={item.returnQty}
                                  onChange={(e) =>
                                    setItemReturnQty(item.id, parseInt(e.target.value) || 1)
                                  }
                                  className="w-16 h-8 text-center font-mono font-semibold text-xs"
                                />
                                <span className="text-[11px] text-zinc-400">/ {item.originalQty}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-400 font-mono">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-zinc-700 dark:text-zinc-300">
                            {formatCurrency(item.unitPrice)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                            {item.selected ? formatCurrency(itemRefund) : "৳0.00"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Reason & Refund Method Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Reason Card */}
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Return Reason
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Select the underlying reason for returning stock.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Damaged">Damaged</SelectItem>
                    <SelectItem value="Wrong Medicine">Wrong Medicine</SelectItem>
                    <SelectItem value="Customer Return">Customer Return</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>

                {reason === "Other" && (
                  <Input
                    placeholder="Describe reason detail..."
                    value={reasonDetail}
                    onChange={(e) => setReasonDetail(e.target.value)}
                    className="text-xs h-9"
                  />
                )}
              </CardContent>
            </Card>

            {/* Refund Method Card */}
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Refund Method
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Tender used to reimburse the customer.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={refundMethod} onValueChange={setRefundMethod}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Select refund method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Original Payment Method">
                      Original Payment Method ({saleLoaded.paymentMethod})
                    </SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* Refund Summary Card */}
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Refund Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Original Total</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">
                  {formatCurrency(originalTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Return Amount</span>
                <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                  -{formatCurrency(returnAmount)}
                </span>
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 flex items-center justify-between text-base font-bold">
                <span className="text-zinc-900 dark:text-zinc-100">Final Amount</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(finalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(true)}
              disabled={selectedItems.length === 0}
              className="text-xs font-semibold h-10 px-5"
            >
              Review Return
            </Button>

            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={selectedItems.length === 0}
              className="text-xs font-semibold h-10 px-6 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-sm"
            >
              Process Refund ({formatCurrency(returnAmount)})
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Before Finalizing */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md border-zinc-200 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-950">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Confirm Sales Return & Refund
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 mt-1">
              Please verify the items and refund amount before recording this transaction.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-500">Invoice:</span>
                <span className="font-semibold">{saleLoaded?.invoiceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Items to Restock:</span>
                <span className="font-semibold">{selectedItems.length} lines</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Return Reason:</span>
                <span className="font-semibold">{reason}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Refund Method:</span>
                <span className="font-semibold">{refundMethod}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-1 text-sm font-bold">
                <span>Refund Due:</span>
                <span className="text-zinc-900 dark:text-zinc-100">{formatCurrency(returnAmount)}</span>
              </div>
            </div>

            <p className="text-zinc-500 text-[11px] leading-relaxed">
              Once approved, stock will be added back to the designated batches and a refund voucher will be printed.
            </p>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              disabled={isProcessing}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleProcessRefund}
              disabled={isProcessing}
              className="text-xs bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {isProcessing ? "Processing..." : "Confirm & Process Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
