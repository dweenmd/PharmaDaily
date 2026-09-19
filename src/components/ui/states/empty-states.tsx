"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  Boxes,
  CalendarX,
  PackageSearch,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  className?: string;
  onAction?: () => void;
  actionHref?: string;
  actionLabel?: string;
};

/**
 * Reusable minimal monochrome empty state base container.
 * Zero cartoon illustrations — crisp icons and clear operational copy.
 */
export function EmptyStateBase({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 max-w-md mx-auto",
        className
      )}
    >
      <div className="size-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center text-zinc-700 dark:text-zinc-300 mb-3.5 shadow-2xs">
        <Icon className="size-6" />
      </div>
      <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs leading-relaxed">
        {description}
      </p>

      {(actionLabel && (actionHref || onAction)) && (
        <div className="mt-4">
          {actionHref ? (
            <Button asChild size="sm" className="text-xs font-semibold h-9 px-4 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900">
              <Link href={actionHref}>
                <Plus className="size-3.5 mr-1.5" />
                {actionLabel}
              </Link>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onAction}
              className="text-xs font-semibold h-9 px-4 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
            >
              <Plus className="size-3.5 mr-1.5" />
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** 1. No medicines found */
export function EmptyMedicines({ className, onAction, actionHref = "/medicines/new", actionLabel = "Add Medicine" }: EmptyStateProps) {
  return (
    <EmptyStateBase
      icon={PackageSearch}
      title="No medicines found"
      description="No medicines match your current query or catalog filters. Verify spelling or register a new medicine."
      actionLabel={actionLabel}
      actionHref={actionHref}
      onAction={onAction}
      className={className}
    />
  );
}

/** 2. No customers found */
export function EmptyCustomers({ className, onAction, actionHref = "/customers/new", actionLabel = "New Customer" }: EmptyStateProps) {
  return (
    <EmptyStateBase
      icon={Users}
      title="No customers found"
      description="No customer records match this search. Register a new patient account to track purchase history and credit."
      actionLabel={actionLabel}
      actionHref={actionHref}
      onAction={onAction}
      className={className}
    />
  );
}

/** 3. No sales today */
export function EmptySalesToday({ className, onAction, actionHref = "/sales/pos", actionLabel = "Open POS Terminal" }: EmptyStateProps) {
  return (
    <EmptyStateBase
      icon={Receipt}
      title="No sales today"
      description="No transactions have been recorded in this branch yet today. Open the counter terminal to begin billing."
      actionLabel={actionLabel}
      actionHref={actionHref}
      onAction={onAction}
      className={className}
    />
  );
}

/** 4. No purchases */
export function EmptyPurchases({ className, onAction, actionHref = "/purchases/new", actionLabel = "Create Purchase Order" }: EmptyStateProps) {
  return (
    <EmptyStateBase
      icon={Truck}
      title="No purchases"
      description="There are no purchase orders recorded for this branch. Create a purchase order to stock inventory from suppliers."
      actionLabel={actionLabel}
      actionHref={actionHref}
      onAction={onAction}
      className={className}
    />
  );
}

/** 5. No stock transfers */
export function EmptyTransfers({ className, onAction, actionHref = "/transfers/new", actionLabel = "Initiate Transfer" }: EmptyStateProps) {
  return (
    <EmptyStateBase
      icon={ArrowUpDown}
      title="No stock transfers"
      description="No inter-branch inventory transfers are in progress. Request or dispatch stock to balance branch levels."
      actionLabel={actionLabel}
      actionHref={actionHref}
      onAction={onAction}
      className={className}
    />
  );
}
