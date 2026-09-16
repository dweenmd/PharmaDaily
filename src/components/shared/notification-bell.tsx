"use client";

import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type Props = {
  /**
   * Unread count. Phase 4 populates this from the `notifications` table
   * (low stock, near expiry, pending transfers); the shell renders the
   * affordance now so later phases only supply data.
   */
  unreadCount?: number;
};

export function NotificationBell({ unreadCount = 0 }: Props) {
  const hasUnread = unreadCount > 0;
  const label = hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={label}>
          <Bell className="size-4" />
          {hasUnread && (
            <span className="bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-medium tabular-nums">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="px-3 py-2.5">Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />

        <Empty className="py-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Bell />
            </EmptyMedia>
            <EmptyTitle>No notifications</EmptyTitle>
            <EmptyDescription>
              Low-stock and expiry alerts will appear here once stock tracking is live.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
