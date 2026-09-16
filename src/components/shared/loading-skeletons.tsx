import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared loading placeholders.
 *
 * Skeletons rather than spinners on purpose: they hold the layout at the size
 * the real content will be, so the page does not jump when data lands. Each
 * one is aria-hidden and wrapped in a live region that announces "Loading"
 * once, instead of a screen reader reading out a wall of empty boxes.
 */

function LoadingRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="contents">
        {children}
      </div>
    </div>
  );
}

/** Rows for a data table. Matches the table layout used across the app. */
export function TableSkeleton({
  rows = 6,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <LoadingRegion label="Loading table" className={cn("w-full space-y-3", className)}>
      <div className="flex gap-4 border-b pb-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-1">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className={cn("h-5 flex-1", c === 0 && "max-w-[40%]")} />
          ))}
        </div>
      ))}
    </LoadingRegion>
  );
}

/** KPI cards — the Phase 4 dashboard grid. */
export function StatCardsSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <LoadingRegion
      label="Loading statistics"
      className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-28" />
          </CardContent>
        </Card>
      ))}
    </LoadingRegion>
  );
}

/** A form while its data loads. */
export function FormSkeleton({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <LoadingRegion label="Loading form" className={cn("space-y-5", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="h-9 w-28" />
    </LoadingRegion>
  );
}

/** Whole-page fallback for a route-level Suspense boundary. */
export function PageSkeleton({ className }: { className?: string }) {
  return (
    <LoadingRegion label="Loading page" className={cn("space-y-6 p-4 sm:p-6", className)}>
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <StatCardsSkeleton />
      <TableSkeleton />
    </LoadingRegion>
  );
}
