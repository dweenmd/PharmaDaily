import Link from "next/link";
import { ArrowLeftRight, PackagePlus, Pill, ShoppingCart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuickActionsCard() {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card p-4 sm:p-5 shadow-2xs space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center">
            <Zap className="size-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Quick Actions</h3>
            <p className="text-[11px] text-muted-foreground">High-frequency counter operations</p>
          </div>
        </div>
      </div>

      {/* Operational Actions Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Primary Action: New Sale (POS) */}
        <Button
          asChild
          size="default"
          className="col-span-2 h-11 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 font-bold rounded-lg justify-between px-3.5 shadow-2xs"
        >
          <Link href="/pos">
            <span className="flex items-center gap-2">
              <ShoppingCart className="size-4" />
              <span>New Sale (POS)</span>
            </span>
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 text-[10px] font-mono font-bold tracking-wider">
              F2
            </kbd>
          </Link>
        </Button>

        {/* Action 2: New Purchase */}
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-9 rounded-lg justify-start px-3 text-xs font-semibold border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <Link href="/purchases/new">
            <PackagePlus className="size-3.5 mr-1.5 text-muted-foreground" />
            <span>New Purchase</span>
          </Link>
        </Button>

        {/* Action 3: Add Medicine */}
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-9 rounded-lg justify-start px-3 text-xs font-semibold border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <Link href="/medicines/new">
            <Pill className="size-3.5 mr-1.5 text-muted-foreground" />
            <span>Add Medicine</span>
          </Link>
        </Button>

        {/* Action 4: Stock Transfer */}
        <Button
          asChild
          variant="outline"
          size="sm"
          className="col-span-2 h-9 rounded-lg justify-start px-3 text-xs font-semibold border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <Link href="/transfers/new">
            <ArrowLeftRight className="size-3.5 mr-1.5 text-muted-foreground" />
            <span>Stock Transfer (Branch Requisition)</span>
          </Link>
        </Button>
      </div>

      {/* Operational Status Footer */}
      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-foreground">Counter Till Active</span>
        </div>
        <span className="font-mono text-[10px]">IndexedDB Cache OK</span>
      </div>
    </div>
  );
}
