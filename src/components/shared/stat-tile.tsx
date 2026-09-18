import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type Status = "neutral" | "good" | "warning" | "serious" | "critical";

type Props = {
  label: string;
  value: string;
  /** Short context line: what the number is measured against. */
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  /**
   * Severity. Status colours are reserved and always ship with a label, never
   * carrying the meaning on their own — two of them sit below 3:1 on a light
   * surface by design, so hue alone is not readable for everyone.
   */
  status?: Status;
  href?: string;
  className?: string;
};

const STATUS_BADGE: Record<Status, string> = {
  neutral: "",
  good: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:text-amber-400",
  serious: "bg-orange-500/10 text-orange-700 border border-orange-500/20 dark:text-orange-400",
  critical: "bg-rose-500/10 text-rose-700 border border-rose-500/20 dark:text-rose-400",
};

const ICON_BG: Record<Status, string> = {
  neutral: "bg-primary/10 text-primary",
  good: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  serious: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  critical: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

const STATUS_LABEL: Record<Status, string> = {
  neutral: "",
  good: "Healthy",
  warning: "Attention",
  serious: "Action needed",
  critical: "Urgent",
};

/**
 * Modern headline metric tile.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  status = "neutral",
  href,
  className,
}: Props) {
  const body = (
    <CardContent className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && (
            <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform group-hover/tile:scale-105", ICON_BG[status])}>
              <Icon className="size-4" />
            </div>
          )}
          <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        {href && (
          <ArrowRight className="size-4 shrink-0 text-muted-foreground/60 transition-all duration-200 group-hover/tile:translate-x-0.5 group-hover/tile:text-primary" />
        )}
      </div>

      <div className="mt-3">
        <p className="text-2xl font-bold tracking-tight tabular-nums sm:text-3xl text-foreground">
          {value}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 min-h-[1.25rem]">
        {status !== "neutral" && (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_BADGE[status])}>
            {STATUS_LABEL[status]}
          </span>
        )}
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </div>
    </CardContent>
  );

  if (href) {
    return (
      <Card
        className={cn(
          "group/tile rounded-xl border border-border/80 bg-card shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
          className,
        )}
      >
        <Link href={href} className="block focus-visible:ring-ring rounded-xl focus-visible:ring-2 focus-visible:outline-none">
          {body}
        </Link>
      </Card>
    );
  }

  return (
    <Card className={cn("rounded-xl border border-border/80 bg-card shadow-xs", className)}>
      {body}
    </Card>
  );
}
