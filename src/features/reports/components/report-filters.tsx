"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/features/sales/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

export type FilterOption = { id: string; name: string };

type Props = {
  branches?: FilterOption[];
  cashiers?: FilterOption[];
  showPaymentMethod?: boolean;
  showDateRange?: boolean;
};

/** Presets first — a date picker is a last resort, not the primary control. */
const PRESETS = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 6 },
  { label: "Last 30 days", days: 29 },
  { label: "Last 90 days", days: 89 },
];

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * One filter row above the report.
 *
 * State lives in the URL, so a filtered report is shareable, survives the back
 * button, and stays server-rendered — the aggregation runs in the database
 * either way.
 */
export function ReportFilters({
  branches,
  cashiers,
  showPaymentMethod = false,
  showDateRange = true,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const from = searchParams.get("from") ?? isoDaysAgo(29);
  const to = searchParams.get("to") ?? today();
  const branch = searchParams.get("branch") ?? ALL;
  const cashier = searchParams.get("cashier") ?? ALL;
  const method = searchParams.get("method") ?? ALL;

  const apply = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === ALL) params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
    },
    [pathname, router, searchParams],
  );

  const hasFilters = searchParams.toString().length > 0;

  return (
    <div className="space-y-3 print:hidden">
      {showDateRange && (
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const presetFrom = isoDaysAgo(preset.days);
            const active = from === presetFrom && to === today();
            return (
              <Button
                key={preset.label}
                variant={active ? "default" : "outline"}
                size="sm"
                disabled={isPending}
                onClick={() => apply({ from: presetFrom, to: today() })}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        {showDateRange && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="from" className="text-xs">
                From
              </Label>
              <Input
                id="from"
                type="date"
                value={from}
                max={to}
                onChange={(e) => apply({ from: e.target.value })}
                className="w-40"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="to" className="text-xs">
                To
              </Label>
              <Input
                id="to"
                type="date"
                value={to}
                min={from}
                max={today()}
                onChange={(e) => apply({ to: e.target.value })}
                className="w-40"
              />
            </div>
          </>
        )}

        {branches && branches.length > 1 && (
          <div className="space-y-1.5">
            <Label htmlFor="branch-filter" className="text-xs">
              Branch
            </Label>
            <Select value={branch} onValueChange={(v) => apply({ branch: v })}>
              <SelectTrigger id="branch-filter" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {cashiers && cashiers.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="cashier-filter" className="text-xs">
              Cashier
            </Label>
            <Select value={cashier} onValueChange={(v) => apply({ cashier: v })}>
              <SelectTrigger id="cashier-filter" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Everyone</SelectItem>
                {cashiers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showPaymentMethod && (
          <div className="space-y-1.5">
            <Label htmlFor="method-filter" className="text-xs">
              Payment
            </Label>
            <Select value={method} onValueChange={(v) => apply({ method: v })}>
              <SelectTrigger id="method-filter" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any method</SelectItem>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}
          >
            <X className="size-4" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
