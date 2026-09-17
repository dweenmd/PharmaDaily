"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CustomerFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = React.useState(searchParams.get("q") ?? "");
  const [isPending, startTransition] = React.useTransition();

  const owingOnly = searchParams.get("owing") === "1";
  const hasFilters = Boolean(searchParams.get("q")) || owingOnly;

  const apply = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
    },
    [pathname, router, searchParams],
  );

  React.useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (search === current) return;
    const timer = setTimeout(() => apply({ q: search || null }), 300);
    return () => clearTimeout(timer);
  }, [search, searchParams, apply]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone or email…"
          className="pl-9"
          aria-label="Search customers"
        />
      </div>

      <Button
        variant={owingOnly ? "default" : "outline"}
        size="sm"
        disabled={isPending}
        onClick={() => apply({ owing: owingOnly ? null : "1" })}
      >
        Owing only
      </Button>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => {
            setSearch("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
        >
          <X className="size-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
