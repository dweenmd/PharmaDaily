"use client";

import * as React from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type SalesOverviewPoint = {
  day: string;
  revenue: number;
  profit: number;
  sales_count?: number;
};

type Props = {
  points: SalesOverviewPoint[];
  className?: string;
};

const PAD = { top: 20, right: 20, bottom: 32, left: 56 };
const HEIGHT = 260;

export function SalesOverviewChart({ points, className }: Props) {
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const [activeSeries, setActiveSeries] = React.useState<"all" | "revenue" | "profit">("all");
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const [width, setWidth] = React.useState(680);

  React.useEffect(() => {
    const element = svgRef.current?.parentElement;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(320, Math.floor(entry.contentRect.width)));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const totalRevenue = points.reduce((acc, p) => acc + p.revenue, 0);
  const totalProfit = points.reduce((acc, p) => acc + p.profit, 0);
  const peakPoint = points.reduce((prev, curr) => (curr.revenue > prev.revenue ? curr : prev), points[0] || { revenue: 0, day: "" });
  const avgDaily = points.length > 0 ? totalRevenue / points.length : 0;

  if (points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-muted-foreground border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
        No sales records available for this period.
      </div>
    );
  }

  const innerWidth = Math.max(10, width - PAD.left - PAD.right);
  const innerHeight = Math.max(10, HEIGHT - PAD.top - PAD.bottom);

  const maxVal = Math.max(100, ...points.map((p) => Math.max(p.revenue, p.profit)));
  const minVal = Math.min(0, ...points.map((p) => Math.min(p.revenue, p.profit)));

  // Nice scale bounds
  const roundTo = (val: number) => {
    if (val === 0) return 0;
    const mag = 10 ** Math.floor(Math.log10(Math.abs(val)));
    return Math.ceil(val / mag) * mag;
  };

  const ceiling = roundTo(maxVal);
  const floor = minVal < 0 ? -roundTo(Math.abs(minVal)) : 0;
  const span = ceiling - floor || 1;

  const getX = (i: number) =>
    PAD.left + (points.length === 1 ? innerWidth / 2 : (i / (points.length - 1)) * innerWidth);
  const getY = (val: number) => PAD.top + innerHeight - ((val - floor) / span) * innerHeight;

  // Path generators with smooth line
  const linePath = (key: "revenue" | "profit") =>
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(p[key]).toFixed(1)}`).join(" ");

  const areaPath = (key: "revenue" | "profit") => {
    if (points.length === 0) return "";
    const firstX = getX(0).toFixed(1);
    const lastX = getX(points.length - 1).toFixed(1);
    const zeroY = getY(0).toFixed(1);
    const line = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(p[key]).toFixed(1)}`)
      .join(" ");
    return `${line} L ${lastX} ${zeroY} L ${firstX} ${zeroY} Z`;
  };

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(floor + t * span));

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * width;
    const ratio = (px - PAD.left) / innerWidth;
    const index = Math.round(ratio * (points.length - 1));
    setHoverIndex(Math.max(0, Math.min(points.length - 1, index)));
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Metrics Row & Series Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-4 sm:gap-6 text-xs">
          <div>
            <span className="text-[11px] text-muted-foreground block">Period Total</span>
            <span className="font-bold text-foreground font-mono">{formatCurrency(totalRevenue)}</span>
          </div>
          <div className="hidden sm:block border-l border-zinc-200 dark:border-zinc-800 pl-4">
            <span className="text-[11px] text-muted-foreground block">Gross Profit</span>
            <span className="font-semibold text-zinc-700 dark:text-zinc-300 font-mono">{formatCurrency(totalProfit)}</span>
          </div>
          <div className="hidden md:block border-l border-zinc-200 dark:border-zinc-800 pl-4">
            <span className="text-[11px] text-muted-foreground block">Peak Day</span>
            <span className="font-medium text-foreground">{peakPoint.day ? formatDate(peakPoint.day) : "—"}</span>
          </div>
        </div>

        {/* Minimal Monochrome Series Toggle */}
        <div className="inline-flex items-center gap-1 text-[11px]">
          <button
            type="button"
            onClick={() => setActiveSeries("all")}
            className={cn(
              "px-2 py-1 rounded transition-colors flex items-center gap-1.5",
              activeSeries === "all"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveSeries("revenue")}
            className={cn(
              "px-2 py-1 rounded transition-colors flex items-center gap-1.5",
              activeSeries === "revenue"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="size-2 rounded-full bg-zinc-900 dark:bg-white" />
            Revenue
          </button>
          <button
            type="button"
            onClick={() => setActiveSeries("profit")}
            className={cn(
              "px-2 py-1 rounded transition-colors flex items-center gap-1.5",
              activeSeries === "profit"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="size-2 rounded-full bg-zinc-400" />
            Profit
          </button>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          width="100%"
          height={HEIGHT}
          role="img"
          aria-label="Sales and profit trends"
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHoverIndex(null)}
          className="touch-none select-none overflow-visible"
        >
          <defs>
            {/* Minimal monochrome area gradients */}
            <linearGradient id="revenue-monochrome-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" className="text-zinc-900 dark:text-zinc-100" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" className="text-zinc-900 dark:text-zinc-100" />
            </linearGradient>
            <linearGradient id="profit-monochrome-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.08" className="text-zinc-500" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" className="text-zinc-500" />
            </linearGradient>
          </defs>

          {/* Recessive Gridlines */}
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={getY(tick)}
                y2={getY(tick)}
                stroke="currentColor"
                strokeWidth={1}
                className="text-zinc-100 dark:text-zinc-800/80"
              />
              <text
                x={PAD.left - 8}
                y={getY(tick) + 3}
                textAnchor="end"
                fontSize={10}
                fill="currentColor"
                className="text-zinc-400 dark:text-zinc-500 font-mono"
              >
                {Math.abs(tick) >= 1000 ? `${Math.round(tick / 1000)}k` : tick}
              </text>
            </g>
          ))}

          {/* Baseline (0) */}
          <line
            x1={PAD.left}
            x2={width - PAD.right}
            y1={getY(0)}
            y2={getY(0)}
            stroke="currentColor"
            strokeWidth={1}
            className="text-zinc-200 dark:text-zinc-800"
          />

          {/* Area Fills */}
          {(activeSeries === "all" || activeSeries === "revenue") && (
            <path d={areaPath("revenue")} fill="url(#revenue-monochrome-gradient)" />
          )}
          {(activeSeries === "all" || activeSeries === "profit") && (
            <path d={areaPath("profit")} fill="url(#profit-monochrome-gradient)" />
          )}

          {/* Lines */}
          {(activeSeries === "all" || activeSeries === "profit") && (
            <path
              d={linePath("profit")}
              fill="none"
              stroke="#71717a"
              strokeWidth={1.75}
              strokeDasharray={activeSeries === "all" ? "4 3" : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {(activeSeries === "all" || activeSeries === "revenue") && (
            <path
              d={linePath("revenue")}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.25}
              strokeLinejoin="round"
              strokeLinecap="round"
              className="text-zinc-900 dark:text-zinc-100"
            />
          )}

          {/* Hover Crosshair */}
          {hoverIndex !== null && hovered && (
            <g>
              <line
                x1={getX(hoverIndex)}
                x2={getX(hoverIndex)}
                y1={PAD.top}
                y2={PAD.top + innerHeight}
                stroke="currentColor"
                strokeWidth={1}
                strokeDasharray="2 2"
                className="text-zinc-400 dark:text-zinc-600"
              />
              {/* Highlight points */}
              {(activeSeries === "all" || activeSeries === "revenue") && (
                <circle
                  cx={getX(hoverIndex)}
                  cy={getY(hovered.revenue)}
                  r={4.5}
                  className="fill-zinc-900 dark:fill-white stroke-background stroke-2"
                />
              )}
              {(activeSeries === "all" || activeSeries === "profit") && (
                <circle
                  cx={getX(hoverIndex)}
                  cy={getY(hovered.profit)}
                  r={3.5}
                  className="fill-zinc-500 stroke-background stroke-2"
                />
              )}
            </g>
          )}

          {/* X Axis Labels */}
          {points.map((p, i) => {
            // Label every Nth point depending on count to avoid cramming
            const stride = Math.max(1, Math.floor(points.length / 7));
            const isLabelled = i === 0 || i === points.length - 1 || i % stride === 0;
            if (!isLabelled) return null;

            return (
              <text
                key={`lbl-${p.day}-${i}`}
                x={getX(i)}
                y={HEIGHT - 10}
                textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
                fontSize={10}
                fill="currentColor"
                className="text-zinc-400 dark:text-zinc-500 font-sans"
              >
                {formatDate(p.day)}
              </text>
            );
          })}
        </svg>

        {/* Minimal Monochrome Floating Tooltip */}
        {hovered && hoverIndex !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-1 z-30 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-background/95 backdrop-blur-xs p-2.5 text-xs shadow-md space-y-1.5 min-w-[150px]"
            style={{
              left: `${Math.min(Math.max((getX(hoverIndex) / width) * 100, 10), 75)}%`,
            }}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-1">
              <span className="font-semibold text-foreground">{formatDate(hovered.day)}</span>
              {hovered.sales_count !== undefined && (
                <span className="text-[10px] text-muted-foreground">{hovered.sales_count} bills</span>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                  <span className="size-1.5 rounded-full bg-zinc-900 dark:bg-white" />
                  Revenue
                </span>
                <span className="font-bold text-foreground font-mono">{formatCurrency(hovered.revenue)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                  <span className="size-1.5 rounded-full bg-zinc-400" />
                  Profit
                </span>
                <span className="font-semibold text-zinc-600 dark:text-zinc-300 font-mono">
                  {formatCurrency(hovered.profit)}
                </span>
              </div>
              {hovered.revenue > 0 && (
                <div className="pt-0.5 border-t border-dashed border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Margin:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {Math.round((hovered.profit / hovered.revenue) * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
