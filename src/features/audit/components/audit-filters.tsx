"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import { AUDITED_TABLES } from "@/features/audit/constants";
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

export function AuditFilters({ actors }: { actors: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const table = searchParams.get("table") ?? ALL;
  const action = searchParams.get("action") ?? ALL;
  const actor = searchParams.get("actor") ?? ALL;
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const apply = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === ALL) params.delete(key);
      else params.set(key, value);
    }
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="audit-table" className="text-xs">
          Module
        </Label>
        <Select value={table} onValueChange={(v) => apply({ table: v })}>
          <SelectTrigger id="audit-table" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Everything</SelectItem>
            {Object.entries(AUDITED_TABLES).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="audit-action" className="text-xs">
          Action
        </Label>
        <Select value={action} onValueChange={(v) => apply({ action: v })}>
          <SelectTrigger id="audit-action" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any</SelectItem>
            <SelectItem value="INSERT">Created</SelectItem>
            <SelectItem value="UPDATE">Changed</SelectItem>
            <SelectItem value="DELETE">Removed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="audit-actor" className="text-xs">
          Who
        </Label>
        <Select value={actor} onValueChange={(v) => apply({ actor: v })}>
          <SelectTrigger id="audit-actor" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Anyone</SelectItem>
            {actors.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="audit-from" className="text-xs">
          From
        </Label>
        <Input
          id="audit-from"
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => apply({ from: e.target.value })}
          className="w-40"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="audit-to" className="text-xs">
          To
        </Label>
        <Input
          id="audit-to"
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => apply({ to: e.target.value })}
          className="w-40"
        />
      </div>

      {searchParams.toString().length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}
        >
          <X className="size-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
