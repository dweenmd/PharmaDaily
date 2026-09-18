"use client";

import { Search, ScanBarcode } from "lucide-react";

import { BranchSwitcher, type BranchOption } from "@/components/shared/branch-switcher";
import { NotificationBell, type PosNotification } from "@/components/shared/notification-bell";
import { SyncIndicator } from "@/components/shared/sync-indicator";
import { UserMenu } from "@/components/shared/user-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { type UserRole } from "@/types";

type Props = {
  name: string;
  role: UserRole;
  branches: BranchOption[];
  activeBranchId: string | null;
  canSwitchBranch: boolean;
  notifications?: PosNotification[];
};

/**
 * The shell header every phase renders inside.
 *
 * Sticky, and padded for the iOS safe area, because the POS runs full-screen
 * on tablets where the status bar overlaps the top of the viewport.
 */
export function AppHeader({
  name,
  role,
  branches,
  activeBranchId,
  canSwitchBranch,
  notifications = [],
}: Props) {
  const activeBranch = branches.find((b) => b.id === activeBranchId) ?? null;

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 px-3 backdrop-blur sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-5" />

      {/* Global Medicine Search Bar from Design */}
      <div className="hidden md:flex flex-1 max-w-xl items-center relative mx-2">
        <Search className="size-4 text-zinc-400 absolute left-3 pointer-events-none" />
        <input
          type="text"
          placeholder="Search medicine by name, brand, generic or barcode..."
          className="w-full h-9 pl-9 pr-24 text-xs rounded-xl bg-zinc-100/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:border-zinc-400 focus:bg-background transition-all placeholder:text-zinc-400 text-foreground font-medium"
        />
        <div className="absolute right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-300 font-mono select-none pointer-events-none border border-zinc-300/40 dark:border-zinc-700/60">
          <ScanBarcode className="size-3" />
          <span>F9 Scanner</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <SyncIndicator />
        <NotificationBell notifications={notifications} />
        <UserMenu name={name} role={role} branchName={activeBranch?.name ?? null} />
      </div>
    </header>
  );
}
