"use client";

import * as React from "react";
import {
  EmptyCustomers,
  EmptyMedicines,
  EmptyPurchases,
  EmptySalesToday,
  EmptyTransfers,
  TableSkeleton,
  DashboardSkeleton,
  PosMedicineLoading,
  CustomerLoading,
  ErrorFailedToLoad,
  ErrorNetworkUnavailable,
  ErrorPermissionDenied,
  ErrorSyncFailed,
  SuccessCustomerCreated,
  SuccessPurchaseReceived,
  SuccessSaleCompleted,
  SuccessStockAdjusted,
  SuccessTransferReceived,
} from "@/components/ui/states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TabKey = "empty" | "loading" | "error" | "success";

export default function UIStatesPage() {
  const [activeTab, setActiveTab] = React.useState<TabKey>("empty");

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              UI State Library
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 font-mono">
              Design System
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Complete minimal monochrome states: Empty, Loading, Error, and Success.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/70 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
          {(
            [
              { id: "empty", label: "Empty States" },
              { id: "loading", label: "Loading States" },
              { id: "error", label: "Error States" },
              { id: "success", label: "Success States" },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  active
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Empty States */}
      {activeTab === "empty" && (
        <div className="space-y-6">
          <div className="text-xs font-medium text-zinc-500">
            5 minimal empty states designed for inventory, CRM, sales, and purchases.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-4 border-zinc-200 dark:border-zinc-800">
              <EmptyMedicines />
            </Card>
            <Card className="p-4 border-zinc-200 dark:border-zinc-800">
              <EmptyCustomers />
            </Card>
            <Card className="p-4 border-zinc-200 dark:border-zinc-800">
              <EmptySalesToday />
            </Card>
            <Card className="p-4 border-zinc-200 dark:border-zinc-800">
              <EmptyPurchases />
            </Card>
            <Card className="p-4 border-zinc-200 dark:border-zinc-800">
              <EmptyTransfers />
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Loading States */}
      {activeTab === "loading" && (
        <div className="space-y-8">
          <div className="text-xs font-medium text-zinc-500">
            Pulsing skeleton loaders for tables, dashboards, and POS cards.
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Table Skeleton</h3>
            <TableSkeleton rows={4} columns={5} />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">POS Medicine Cards Loading</h3>
            <PosMedicineLoading count={4} />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Customer Records Loading</h3>
            <CustomerLoading count={2} />
          </div>
        </div>
      )}

      {/* Tab 3: Error States */}
      {activeTab === "error" && (
        <div className="space-y-6">
          <div className="text-xs font-medium text-zinc-500">
            Calm, non-hostile monochrome error states with clear recovery actions.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-4 border-zinc-200 dark:border-zinc-800">
              <ErrorFailedToLoad onRetry={() => alert("Retrying...")} />
            </Card>
            <Card className="p-4 border-zinc-200 dark:border-zinc-800">
              <ErrorNetworkUnavailable onRetry={() => alert("Checking connection...")} />
            </Card>
            <Card className="p-4 border-zinc-200 dark:border-zinc-800">
              <ErrorSyncFailed onRetry={() => alert("Retrying sync...")} />
            </Card>
            <Card className="p-4 border-zinc-200 dark:border-zinc-800">
              <ErrorPermissionDenied />
            </Card>
          </div>
        </div>
      )}

      {/* Tab 4: Success States */}
      {activeTab === "success" && (
        <div className="space-y-6">
          <div className="text-xs font-medium text-zinc-500">
            5 operational success states with reference numbers and dual primary/secondary actions.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-4 border-zinc-200 dark:border-zinc-800">
              <SuccessSaleCompleted />
            </Card>
            <Card className="p-4 border-zinc-200 dark:border-zinc-800">
              <SuccessCustomerCreated />
            </Card>
            <Card className="p-4 border-zinc-200 dark:border-zinc-800">
              <SuccessPurchaseReceived />
            </Card>
            <Card className="p-4 border-zinc-200 dark:border-zinc-800">
              <SuccessStockAdjusted />
            </Card>
            <Card className="p-4 border-zinc-200 dark:border-zinc-800">
              <SuccessTransferReceived />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
