"use client";

import { Building2, Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type BranchOption = { id: string; name: string; code: string };

type Props = {
  branches: BranchOption[];
  activeBranchId: string | null;
  /**
   * Whether the user may switch. False renders a plain label instead of a
   * menu — a branch manager sees their branch, they do not pick it.
   *
   * This only shapes the UI. The `branches` RLS policies decide what a user
   * can actually read, so a tampered-with client gains nothing.
   */
  canSwitch: boolean;
  onSelect?: (branchId: string | null) => void;
  /** Label for the "no single branch" option shown to a super admin. */
  allBranchesLabel?: string;
};

export function BranchSwitcher({
  branches,
  activeBranchId,
  canSwitch,
  onSelect,
  allBranchesLabel = "All branches",
}: Props) {
  const active = branches.find((b) => b.id === activeBranchId) ?? null;
  const activeLabel = active ? active.name : allBranchesLabel;

  if (!canSwitch) {
    return (
      <div className="text-muted-foreground flex min-w-0 items-center gap-2 text-sm">
        <Building2 className="size-4 shrink-0" />
        <span className="text-foreground truncate font-medium">{activeLabel}</span>
        {active && (
          <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-[10px] tracking-wide">
            {active.code}
          </span>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-56 justify-between gap-2">
          <Building2 className="size-4 shrink-0" />
          <span className="truncate">{activeLabel}</span>
          <ChevronsUpDown className="text-muted-foreground size-3.5 shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Switch branch</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => onSelect?.(null)}>
          <Check className={cn("size-4", activeBranchId === null ? "opacity-100" : "opacity-0")} />
          <span>{allBranchesLabel}</span>
        </DropdownMenuItem>

        {branches.map((branch) => (
          <DropdownMenuItem key={branch.id} onSelect={() => onSelect?.(branch.id)}>
            <Check
              className={cn("size-4", activeBranchId === branch.id ? "opacity-100" : "opacity-0")}
            />
            <span className="truncate">{branch.name}</span>
            <span className="text-muted-foreground ml-auto font-mono text-[10px]">
              {branch.code}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
