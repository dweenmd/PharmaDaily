"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** 1. Table skeleton */
export function TableSkeleton({
  rows = 5,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden", className)}>
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        <div className="bg-zinc-50/50 dark:bg-zinc-800/30 p-3 grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>

        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-3.5 grid gap-4 items-center" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn(
                  "h-4",
                  c === 0 ? "w-32" : c === columns - 1 ? "w-16 ml-auto" : "w-20"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 2. Dashboard skeleton */
export function DashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Skeleton */}
      <div className="flex justify-between items-center pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-3 w-44" />
          </Card>
        ))}
      </div>

      {/* Chart and Table Skeleton Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </Card>
        <Card className="border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/** 3. POS medicine loading skeleton */
export function PosMedicineLoading({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2.5"
        >
          <div className="flex items-start justify-between">
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="h-4 w-12 rounded" />
          </div>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
          <div className="flex justify-between items-center pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 4. Customer loading skeleton */
export function CustomerLoading({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <div className="space-y-1 text-right">
            <Skeleton className="h-4 w-20 ml-auto" />
            <Skeleton className="h-3 w-16 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}
