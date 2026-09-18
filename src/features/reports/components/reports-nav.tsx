"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const TABS = [
  { href: "/reports", label: "Reports Center" },
  { href: "/reports/sales", label: "Sales" },
  { href: "/reports/profit", label: "Profit" },
  { href: "/reports/stock", label: "Stock" },
];

export function ReportsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 print:hidden" aria-label="Reports">
      {TABS.map((tab) => {
        const isActive =
          tab.href === "/reports"
            ? pathname === "/reports"
            : pathname.startsWith(tab.href);

        return (
          <Button
            key={tab.href}
            asChild
            variant={isActive ? "default" : "outline"}
            size="sm"
            className={cn(
              "text-xs font-semibold cursor-pointer",
              isActive && "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs",
            )}
          >
            <Link href={tab.href}>{tab.label}</Link>
          </Button>
        );
      })}
    </nav>
  );
}
