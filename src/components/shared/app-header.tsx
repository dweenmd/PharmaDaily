"use client";

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
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-3 backdrop-blur sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-5" />

      <BranchSwitcher
        branches={branches}
        activeBranchId={activeBranchId}
        canSwitch={canSwitchBranch}
      />

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <SyncIndicator />
        <NotificationBell notifications={notifications} />
        <UserMenu name={name} role={role} branchName={activeBranch?.name ?? null} />
      </div>
    </header>
  );
}
