"use client";

import * as React from "react";
import { Table2 } from "lucide-react";

import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type TrendPoint = {
  day: string;
  revenue: number;
  profit: number;
};

type Props = {
  points: TrendPoint[];
  className?: string;
};

const PAD = { top: 16, right: 16, bottom: 28, left: 56 };
const HEIGHT = 240;

/**
 * Revenue and profit over time.
 *
 * A line chart because the question is how the numbers are MOVING — bars would
 * invite reading each day as a separate quantity to compare, which is not what
 * anyone asks of a sales trend.
 *
 * Both series are money, so they share one axis. A second y-scale for profit
 * would let the two lines be positioned to tell any story you like, which is
 * why dual axes are never used here.
 *
 * Colours come from the validated pair in globals.css, and identity is never
 * carried by colour alone: the legend names both series, the tooltip labels
 * them, and a table view is one click away.
 */
export function TrendChart({ points, className }: Props) {
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const [showTable, setShowTable] = React.useState(false);
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const [width, setWidth] = React.useState(640);

  // The SVG scales to its container; the geometry needs the real pixel width.
  React.useEffect(() => {
    const element = svgRef.current?.parentElement;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(320, entry.contentRect.width));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (points.length === 0) {
    return (
      <div
        className={cn(
          "text-muted-foreground flex h-60 items-center justify-center text-sm",
          className,
        )}
      >
        No sales in this period.
      </div>
    );
  }

  const innerWidth = width - PAD.left - PAD.right;
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;

  const maxValue = Math.max(1, ...points.map((p) => Math.max(p.revenue, p.profit)));

  // Profit CAN be negative — selling below cost is allowed, deliberately, for
  // clearing near-expiry stock. A scale that started at zero would draw those
  // days below the baseline and outside the plot, which is the kind of silent
  // overflow that makes a chart lie rather than fail.
  const minValue = Math.min(0, ...points.map((p) => Math.min(p.revenue, p.profit)));

  // Round the bounds so the gridline labels are readable numbers rather than
  // whatever the extremes happened to be.
  const roundTo = (value: number, mode: "up" | "down") => {
    if (value === 0) return 0;
    const magnitude = 10 ** Math.floor(Math.log10(Math.abs(value)));
    const scaled = value / magnitude;
    return (mode === "up" ? Math.ceil(scaled) : Math.floor(scaled)) * magnitude;
  };

  const ceiling = roundTo(maxValue, "up");
  const floor = roundTo(minValue, "down");
  const span = ceiling - floor || 1;

  const x = (i: number) =>
    PAD.left + (points.length === 1 ? innerWidth / 2 : (i / (points.length - 1)) * innerWidth);
  const y = (value: number) => PAD.top + innerHeight - ((value - floor) / span) * innerHeight;

  const path = (key: "revenue" | "profit") =>
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p[key])}`).join(" ");

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => floor + t * span);

  // Label the ends and nothing between — a number on every point is noise.
  const labelledIndices = new Set([0, points.length - 1]);

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * width;
    const ratio = (px - PAD.left) / innerWidth;
    const index = Math.round(ratio * (points.length - 1));
    setHoverIndex(Math.max(0, Math.min(points.length - 1, index)));
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className={cn("viz-root", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {/* Legend. Always present for two or more series, so identity never
            depends on telling two colours apart. */}
        <ul className="flex items-center gap-4 text-xs">
          <li className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ background: "var(--viz-series-1)" }}
              aria-hidden
            />
            <span className="text-muted-foreground">Revenue</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ background: "var(--viz-series-2)" }}
              aria-hidden
            />
            <span className="text-muted-foreground">Profit</span>
          </li>
        </ul>

        <Button variant="ghost" size="sm" onClick={() => setShowTable((v) => !v)}>
          <Table2 className="size-3.5" />
          {showTable ? "Show chart" : "Show table"}
        </Button>
      </div>

      {showTable ? (
        <div className="max-h-60 overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <caption className="sr-only">Revenue and profit by day</caption>
            <thead className="bg-muted/50 sticky top-0">
              <tr className="text-left">
                <th scope="col" className="text-muted-foreground px-3 py-2 text-xs font-medium">
                  Day
                </th>
                <th
                  scope="col"
                  className="text-muted-foreground px-3 py-2 text-right text-xs font-medium"
                >
                  Revenue
                </th>
                <th
                  scope="col"
                  className="text-muted-foreground px-3 py-2 text-right text-xs font-medium"
                >
                  Profit
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.day} className="border-t">
                  <td className="px-3 py-1.5">{formatDate(p.day)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {formatCurrency(p.revenue)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {formatCurrency(p.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            width="100%"
            height={HEIGHT}
            role="img"
            aria-label={`Revenue and profit over ${points.length} days. Use the table view for exact figures.`}
            onPointerMove={onPointerMove}
            onPointerLeave={() => setHoverIndex(null)}
            className="touch-none"
          >
            {/* Gridlines, recessive — they orient, they do not compete. */}
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke="var(--viz-grid)"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 8}
                  y={y(tick) + 3}
                  textAnchor="end"
                  fontSize={10}
                  fill="var(--viz-ink-muted)"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {Math.abs(tick) >= 1000 ? `${Math.round(tick / 1000)}k` : Math.round(tick)}
                </text>
              </g>
            ))}

            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(0)}
              y2={y(0)}
              stroke="var(--viz-axis)"
              strokeWidth={1}
            />

            {hoverIndex !== null && (
              <line
                x1={x(hoverIndex)}
                x2={x(hoverIndex)}
                y1={PAD.top}
                y2={PAD.top + innerHeight}
                stroke="var(--viz-axis)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            )}

            <path
              d={path("revenue")}
              fill="none"
              stroke="var(--viz-series-1)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              d={path("profit")}
              fill="none"
              stroke="var(--viz-series-2)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Markers on the ends and the hovered point only. A dot on every
                day turns a trend into a rash. */}
            {points.map((p, i) =>
              labelledIndices.has(i) || i === hoverIndex ? (
                <g key={p.day}>
                  {/* The surface ring keeps overlapping marks legible. */}
                  <circle
                    cx={x(i)}
                    cy={y(p.revenue)}
                    r={4}
                    fill="var(--viz-series-1)"
                    stroke="var(--viz-surface)"
                    strokeWidth={2}
                  />
                  <circle
                    cx={x(i)}
                    cy={y(p.profit)}
                    r={4}
                    fill="var(--viz-series-2)"
                    stroke="var(--viz-surface)"
                    strokeWidth={2}
                  />
                </g>
              ) : null,
            )}

            {points.map((p, i) =>
              labelledIndices.has(i) ? (
                <text
                  key={`label-${p.day}`}
                  x={x(i)}
                  y={HEIGHT - 8}
                  textAnchor={i === 0 ? "start" : "end"}
                  fontSize={10}
                  fill="var(--viz-ink-muted)"
                >
                  {formatDate(p.day)}
                </text>
              ) : null,
            )}
          </svg>

          {hovered && hoverIndex !== null && (
            <div
              role="status"
              className="bg-popover text-popover-foreground pointer-events-none absolute top-2 rounded-lg border px-3 py-2 text-xs shadow-md"
              style={{
                left: `${Math.min(Math.max((x(hoverIndex) / width) * 100, 8), 78)}%`,
              }}
            >
              <p className="mb-1 font-medium">{formatDate(hovered.day)}</p>
              <p className="flex items-center gap-1.5">
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ background: "var(--viz-series-1)" }}
                  aria-hidden
                />
                Revenue
                <span className="ml-auto pl-3 font-medium tabular-nums">
                  {formatCurrency(hovered.revenue)}
                </span>
              </p>
              <p className="flex items-center gap-1.5">
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ background: "var(--viz-series-2)" }}
                  aria-hidden
                />
                Profit
                <span className="ml-auto pl-3 font-medium tabular-nums">
                  {formatCurrency(hovered.profit)}
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
