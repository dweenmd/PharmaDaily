"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export type RangeKey = "today" | "7d" | "30d" | "custom";

const RANGE_OPTIONS: { id: RangeKey; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "custom", label: "Custom" },
];

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentRange = (searchParams.get("range") as RangeKey) || "today";

  function handleSelect(id: RangeKey) {
    if (id === "custom") {
      const from = window.prompt("Enter start date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
      if (!from) return;
      const to = window.prompt("Enter end date (YYYY-MM-DD):", from);
      if (!to) return;

      const params = new URLSearchParams(searchParams.toString());
      params.set("range", "custom");
      params.set("from", from);
      params.set("to", to);
      router.push(`${pathname}?${params.toString()}`);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("range", id);
    params.delete("from");
    params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex overflow-x-auto max-w-full items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900/80 p-0.5 text-xs select-none no-scrollbar">
      {RANGE_OPTIONS.map((opt) => {
        const isActive = currentRange === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => handleSelect(opt.id)}
            className={cn(
              "px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5",
              isActive
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs font-semibold"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
            )}
          >
            {opt.id === "custom" && <Calendar className="size-3 opacity-70" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
