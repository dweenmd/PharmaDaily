"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  Boxes,
  Check,
  CheckCircle2,
  PackageCheck,
  Plus,
  Printer,
  Receipt,
  Truck,
  UserCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SuccessStateProps = {
  className?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  primaryHref?: string;
  secondaryHref?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  referenceId?: string;
};

/** Base success state container */
export function SuccessStateBase({
  icon: Icon,
  title,
  description,
  referenceId,
  primaryLabel,
  primaryHref,
  onPrimary,
  secondaryLabel,
  secondaryHref,
  onSecondary,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  referenceId?: string;
  primaryLabel?: string;
  primaryHref?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
  onSecondary?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 max-w-md mx-auto",
        className
      )}
    >
      <div className="size-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3.5 shadow-2xs">
        <Icon className="size-6" />
      </div>
      <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>
      {referenceId && (
        <span className="font-mono text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">
          {referenceId}
        </span>
      )}
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs leading-relaxed">
        {description}
      </p>

      <div className="flex items-center gap-2.5 mt-5">
        {secondaryLabel && (
          secondaryHref ? (
            <Button asChild variant="outline" size="sm" className="text-xs font-medium h-9">
              <Link href={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onSecondary} className="text-xs font-medium h-9">
              {secondaryLabel}
            </Button>
          )
        )}

        {primaryLabel && (
          primaryHref ? (
            <Button asChild size="sm" className="text-xs font-semibold h-9 px-4 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900">
              <Link href={primaryHref}>{primaryLabel}</Link>
            </Button>
          ) : (
            <Button size="sm" onClick={onPrimary} className="text-xs font-semibold h-9 px-4 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900">
              {primaryLabel}
            </Button>
          )
        )}
      </div>
    </div>
  );
}

/** 1. Sale completed */
export function SuccessSaleCompleted({
  className,
  referenceId = "INV-2026-0901",
  onPrimary,
  onSecondary,
}: SuccessStateProps) {
  return (
    <SuccessStateBase
      icon={CheckCircle2}
      title="Sale completed"
      referenceId={referenceId}
      description="Payment tender successfully reconciled and inventory deducted from active batches."
      primaryLabel="New Sale"
      onPrimary={onPrimary}
      secondaryLabel="Print Receipt"
      onSecondary={onSecondary}
      className={className}
    />
  );
}

/** 2. Customer created */
export function SuccessCustomerCreated({
  className,
  referenceId = "CUST-0092",
  primaryHref = "/sales/pos",
  secondaryHref = "/customers",
}: SuccessStateProps) {
  return (
    <SuccessStateBase
      icon={UserCheck}
      title="Customer created"
      referenceId={referenceId}
      description="Patient profile and contact information registered in the central customer database."
      primaryLabel="Start Sale"
      primaryHref={primaryHref}
      secondaryLabel="View Profile"
      secondaryHref={secondaryHref}
      className={className}
    />
  );
}

/** 3. Purchase received */
export function SuccessPurchaseReceived({
  className,
  referenceId = "PO-2026-088",
  primaryHref = "/stock",
  secondaryHref = "/purchases",
}: SuccessStateProps) {
  return (
    <SuccessStateBase
      icon={Truck}
      title="Purchase received"
      referenceId={referenceId}
      description="Supplier delivery verified, batch numbers recorded, and shelf stock quantities updated."
      primaryLabel="View Inventory"
      primaryHref={primaryHref}
      secondaryLabel="Purchase Orders"
      secondaryHref={secondaryHref}
      className={className}
    />
  );
}

/** 4. Stock adjusted */
export function SuccessStockAdjusted({
  className,
  referenceId = "ADJ-2026-042",
  primaryHref = "/stock",
  secondaryHref = "/stock/adjust",
}: SuccessStateProps) {
  return (
    <SuccessStateBase
      icon={Boxes}
      title="Stock adjusted"
      referenceId={referenceId}
      description="Physical count discrepancy balanced and ledger audit entry committed."
      primaryLabel="Inventory List"
      primaryHref={primaryHref}
      secondaryLabel="Adjust Another"
      secondaryHref={secondaryHref}
      className={className}
    />
  );
}

/** 5. Transfer received */
export function SuccessTransferReceived({
  className,
  referenceId = "TR-00231",
  primaryHref = "/transfers",
  secondaryHref = "/stock",
}: SuccessStateProps) {
  return (
    <SuccessStateBase
      icon={PackageCheck}
      title="Transfer received"
      referenceId={referenceId}
      description="Inter-branch transfer verified and items successfully merged into receiving branch stock."
      primaryLabel="All Transfers"
      primaryHref={primaryHref}
      secondaryLabel="Check Stock"
      secondaryHref={secondaryHref}
      className={className}
    />
  );
}
