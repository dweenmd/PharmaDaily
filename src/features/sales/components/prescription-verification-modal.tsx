"use client";

import * as React from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  FileCheck,
  FileText,
  FileX,
  Hospital,
  Pill,
  ShieldAlert,
  Trash2,
  User,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PrescriptionVerificationStatus = "Pending" | "Verified" | "Rejected";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName?: string;
  medicineName?: string;
  onVerified?: () => void;
  onCancelItem?: () => void;
};

export function PrescriptionVerificationModal({
  open,
  onOpenChange,
  customerName = "Md. Rahim",
  medicineName = "Amoxicillin 500 mg",
  onVerified,
  onCancelItem,
}: Props) {
  const [doctorName, setDoctorName] = React.useState("Dr. Shamsul Huda, MBBS, FCPS");
  const [rxNumber, setRxNumber] = React.useState("RX-2026-9041");
  const [prescriptionDate, setPrescriptionDate] = React.useState("2026-09-18");
  const [validUntil, setValidUntil] = React.useState("2026-10-18");
  const [verificationStatus, setVerificationStatus] =
    React.useState<PrescriptionVerificationStatus>("Pending");
  const [showDocumentPreview, setShowDocumentPreview] = React.useState(false);

  const handleVerify = () => {
    setVerificationStatus("Verified");
    toast.success("Prescription verified successfully", {
      description: `${medicineName} unlocked for dispensing to ${customerName}.`,
    });
    if (onVerified) onVerified();
    setTimeout(() => {
      onOpenChange(false);
    }, 600);
  };

  const handleReject = () => {
    setVerificationStatus("Rejected");
    toast.error("Prescription rejected", {
      description: "Dispensing denied according to DGDA regulatory compliance.",
    });
  };

  const handleCancelItem = () => {
    toast.info("Item removed from sale");
    if (onCancelItem) onCancelItem();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-zinc-200 dark:border-zinc-800 p-0 overflow-hidden bg-white dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Prescription Required
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                Schedule H / Antibiotic dispensing compliance verification
              </DialogDescription>
            </div>
          </div>

          <Badge
            variant="outline"
            className={cn(
              "font-mono text-xs px-2.5 py-0.5 tracking-wide",
              verificationStatus === "Verified"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : verificationStatus === "Rejected"
                  ? "border-zinc-400 bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  : "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            )}
          >
            {verificationStatus === "Pending" && "● Verification Pending"}
            {verificationStatus === "Verified" && "✓ Prescription Verified"}
            {verificationStatus === "Rejected" && "✕ Prescription Rejected"}
          </Badge>
        </div>

        <div className="p-6 space-y-5">
          {/* Calm Clinical Warning Banner (Medically appropriate, avoiding harsh red) */}
          <div className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 p-3.5 flex items-start gap-3">
            <div className="size-7 rounded-md bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5">
              <FileCheck className="size-4" />
            </div>
            <div className="text-xs space-y-0.5">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                Clinical Dispensing Warning
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Under the National Drug Policy and DGDA guidelines, dispensing prescription-grade antibiotics or controlled formulations requires a valid registered physician's order.
              </p>
            </div>
          </div>

          {/* Patient & Medicine Card */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
                Customer
              </span>
              <div className="flex items-center gap-1.5 font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                <User className="size-3.5 text-zinc-400" />
                <span>{customerName}</span>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">ID: CUST-0198</span>
            </div>

            <div className="space-y-1 border-l border-zinc-100 dark:border-zinc-800 pl-3">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
                Medicine
              </span>
              <div className="flex items-center gap-1.5 font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                <Pill className="size-3.5 text-zinc-400" />
                <span>{medicineName}</span>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">Status: Required</span>
            </div>
          </div>

          {/* Form Fields: Doctor Name, Prescription Number, Date, Valid Until */}
          <div className="space-y-3.5">
            <div>
              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Doctor Name & Credentials
              </Label>
              <div className="relative mt-1">
                <Hospital className="size-4 text-zinc-400 absolute left-3 top-2.5" />
                <Input
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Shamsul Huda, MBBS, FCPS"
                  className="pl-9 text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Prescription Number
                </Label>
                <Input
                  value={rxNumber}
                  onChange={(e) => setRxNumber(e.target.value)}
                  placeholder="RX-0000"
                  className="mt-1 font-mono text-xs h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Prescription Date
                </Label>
                <Input
                  type="date"
                  value={prescriptionDate}
                  onChange={(e) => setPrescriptionDate(e.target.value)}
                  className="mt-1 font-mono text-xs h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Valid Until
                </Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="mt-1 font-mono text-xs h-9"
                />
              </div>
            </div>
          </div>

          {/* Optional Document Attachment Preview Box */}
          {showDocumentPreview && (
            <div className="p-3 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-900 text-center space-y-1">
              <FileText className="size-6 text-zinc-500 mx-auto" />
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Scanned Prescription Document #{rxNumber}.pdf
              </p>
              <p className="text-[11px] text-zinc-500">
                Signed by Dr. Shamsul Huda · BMDC Reg #A-48192 · Verified Clinic Seal
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-6 py-3.5 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancelItem}
            className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <Trash2 className="size-3.5 mr-1.5" />
            Cancel Item
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDocumentPreview(!showDocumentPreview)}
              className="text-xs"
            >
              <FileText className="size-3.5 mr-1.5" />
              {showDocumentPreview ? "Hide Document" : "View Prescription"}
            </Button>

            <Button
              type="button"
              onClick={handleVerify}
              disabled={verificationStatus === "Verified"}
              className="text-xs bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-sm font-semibold"
            >
              <CheckCircle2 className="size-3.5 mr-1.5 text-emerald-400" />
              Verify Prescription
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
