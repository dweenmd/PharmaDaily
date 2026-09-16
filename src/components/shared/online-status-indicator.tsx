"use client";

import { Cloud, CloudOff } from "lucide-react";

import { useOnlineStatus } from "@/hooks/use-online-status";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  /**
   * Number of transactions waiting to sync. Phase 6 feeds this from the
   * IndexedDB queue; until then it stays 0 and the badge never shows.
   */
  pendingSyncCount?: number;
  className?: string;
};

/**
 * Header connectivity pill.
 *
 * At a counter this is the difference between "the system is broken" and
 * "keep selling, it will catch up", so it states plainly that billing
 * continues offline rather than just showing a red dot.
 */
export function OnlineStatusIndicator({ pendingSyncCount = 0, className }: Props) {
  const isOnline = useOnlineStatus();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="status"
          aria-live="polite"
          aria-label={isOnline ? "Online" : "Offline mode"}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
            isOnline
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
            className,
          )}
        >
          {isOnline ? <Cloud className="size-3.5" /> : <CloudOff className="size-3.5" />}
          <span className="hidden sm:inline">{isOnline ? "Online" : "Offline"}</span>

          {pendingSyncCount > 0 && (
            <span className="bg-background/70 ml-0.5 rounded-full px-1.5 py-px text-[10px] tabular-nums">
              {pendingSyncCount}
            </span>
          )}
        </div>
      </TooltipTrigger>

      <TooltipContent side="bottom" className="max-w-56">
        {isOnline ? (
          <p>Connected. Everything saves straight to the server.</p>
        ) : (
          <p>Offline mode — billing continues using local data and syncs when you reconnect.</p>
        )}
        {pendingSyncCount > 0 && (
          <p className="mt-1">
            {pendingSyncCount} transaction{pendingSyncCount === 1 ? "" : "s"} waiting to sync.
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
