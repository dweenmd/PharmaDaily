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

const STATUS_TEXT: Record<Status, string> = {
  neutral: "",
  good: "text-[var(--viz-good)]",
  warning: "text-[var(--viz-warning)]",
  serious: "text-[var(--viz-serious)]",
  critical: "text-[var(--viz-critical)]",
};

const STATUS_LABEL: Record<Status, string> = {
  neutral: "",
  good: "Healthy",
  warning: "Attention",
  serious: "Action needed",
  critical: "Urgent",
};

/**
 * A single headline number.
 *
 * Deliberately not a chart: one value over one period has no shape to show, and
 * a one-bar bar chart is the classic way to make a number harder to read than
 * it needs to be.
 *
 * The value uses the font's default proportional figures. tabular-nums gives
 * every digit the width of a zero, which looks loose at display sizes — it is
 * for columns that must line up, not for a headline.
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
    <CardContent className="space-y-1 px-4 pt-4 pb-4 sm:px-6 sm:pt-5">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        {Icon && <Icon className="size-3.5 shrink-0" />}
        <span className="min-w-0 truncate">{label}</span>
        {href && (
          <ArrowRight className="ml-auto size-3.5 shrink-0 opacity-0 transition-opacity group-hover/tile:opacity-100" />
        )}
      </div>

      {/* Steps down a size on phones: two tiles side by side at 360px leave
          about 150px each, and "BDT 12,500.00" at text-2xl does not fit in
          that without wrapping mid-number. */}
      <p className="text-xl leading-tight font-semibold sm:text-2xl">{value}</p>

      <div className="flex items-center gap-1.5">
        {status !== "neutral" && (
          <span className={cn("text-xs font-medium", STATUS_TEXT[status])}>
            {STATUS_LABEL[status]}
          </span>
        )}
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </div>
    </CardContent>
  );

  // A number that names a problem — "5 low on stock" — should be the way to
  // the list of those five, not a dead end the reader has to go find in the
  // nav. The arrow only appears on hover so a tile that leads nowhere and a
  // tile that leads somewhere still look the same at rest.
  if (href) {
    return (
      <Card
        className={cn(
          "viz-root group/tile hover:border-primary/40 transition-colors hover:shadow-sm",
          className,
        )}
      >
        <Link href={href} className="focus-visible:ring-ring rounded-xl focus-visible:ring-2 focus-visible:outline-none">
          {body}
        </Link>
      </Card>
    );
  }

  return <Card className={cn("viz-root", className)}>{body}</Card>;
}
