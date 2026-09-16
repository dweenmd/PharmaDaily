import * as React from "react";
import { PackageOpen, SearchX, TriangleAlert, WifiOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type Props = {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Primary call to action, e.g. "Add Medicine". */
  action?: React.ReactNode;
  className?: string;
};

/**
 * One empty state for the whole app, so "nothing here yet" looks the same on
 * every list in every phase.
 *
 * Every list has three distinct empty cases and they must not be conflated —
 * "no medicines exist" needs an Add button, while "no medicines match your
 * search" needs a way to clear the filter. The variants below cover them.
 */
export function EmptyState({
  title,
  description,
  icon: Icon = PackageOpen,
  action,
  className,
}: Props) {
  return (
    <Empty className={cn("border-border/60 rounded-lg border border-dashed", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}

/** Nothing matched the current search or filters. */
export function NoResultsState({
  entity = "results",
  onClear,
  className,
}: {
  entity?: string;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={SearchX}
      title={`No ${entity} found`}
      description="Try a different search term, or clear the filters to see everything."
      action={
        onClear ? (
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        ) : undefined
      }
      className={className}
    />
  );
}

/** The request failed. Distinct from "empty" — something is wrong. */
export function ErrorState({
  title = "Something went wrong",
  description = "We could not load this. Please try again.",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={TriangleAlert}
      title={title}
      description={description}
      action={
        onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : undefined
      }
      className={className}
    />
  );
}

/** This screen needs the network and there is none. */
export function OfflineState({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={WifiOff}
      title="You are offline"
      description="This screen needs a connection. Billing still works offline and syncs when you reconnect."
      className={className}
    />
  );
}
