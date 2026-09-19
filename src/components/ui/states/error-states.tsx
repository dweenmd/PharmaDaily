"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertOctagon,
  CloudAlert,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  WifiOff,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  className?: string;
  onRetry?: () => void;
  message?: string;
};

/** Base error state container — calm, monochrome, non-hostile */
export function ErrorStateBase({
  icon: Icon,
  title,
  description,
  onRetry,
  retryLabel = "Try Again",
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 max-w-md mx-auto",
        className
      )}
    >
      <div className="size-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 mb-3.5 shadow-2xs">
        <Icon className="size-6" />
      </div>
      <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs leading-relaxed">
        {description}
      </p>

      {onRetry && (
        <div className="mt-4">
          <Button
            size="sm"
            onClick={onRetry}
            className="text-xs font-semibold h-9 px-4 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
          >
            <RefreshCw className="size-3.5 mr-1.5" />
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

/** 1. Failed to load data */
export function ErrorFailedToLoad({ className, onRetry, message }: ErrorStateProps) {
  return (
    <ErrorStateBase
      icon={AlertOctagon}
      title="Failed to load data"
      description={message || "The application encountered an unexpected error while retrieving this dataset from the database."}
      onRetry={onRetry}
      retryLabel="Reload Data"
      className={className}
    />
  );
}

/** 2. Network unavailable */
export function ErrorNetworkUnavailable({ className, onRetry }: ErrorStateProps) {
  return (
    <ErrorStateBase
      icon={WifiOff}
      title="Network unavailable"
      description="You're currently working offline. POS transactions will continue locally and sync when connection returns."
      onRetry={onRetry}
      retryLabel="Check Connection"
      className={className}
    />
  );
}

/** 3. Sync failed */
export function ErrorSyncFailed({ className, onRetry, message }: ErrorStateProps) {
  return (
    <ErrorStateBase
      icon={CloudAlert}
      title="Sync failed"
      description={message || "A data conflict or timeout prevented offline queue items from being acknowledged by the central server."}
      onRetry={onRetry}
      retryLabel="Retry Synchronization"
      className={className}
    />
  );
}

/** 4. Permission denied */
export function ErrorPermissionDenied({ className }: { className?: string }) {
  return (
    <ErrorStateBase
      icon={Lock}
      title="Permission denied"
      description="Your staff role does not have authorization to view or modify this ledger section. Contact your pharmacy manager."
      className={className}
    />
  );
}
