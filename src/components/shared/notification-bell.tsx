"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CalendarClock, CircleAlert, PackageX, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { markNotificationsReadAction } from "@/features/notifications/actions";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { type NotificationType } from "@/types";
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
import { ScrollArea } from "@/components/ui/scroll-area";

export type PosNotification = {
  id: string;
  type: NotificationType;
  message: string;
  created_at: string;
};

/**
 * Grouped by what the alert is about, because the actions differ: expired stock
 * comes off the shelf today, near-expiry gets discounted or returned, low stock
 * gets reordered. One flat list would make a cashier read all of them to find
 * the one that needs doing now.
 */
const GROUPS: {
  type: NotificationType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}[] = [
  { type: "expired", label: "Expired", icon: PackageX, tone: "text-[var(--viz-critical)]" },
  {
    type: "near_expiry",
    label: "Expiring soon",
    icon: CalendarClock,
    tone: "text-[var(--viz-serious)]",
  },
  { type: "low_stock", label: "Low stock", icon: TriangleAlert, tone: "text-[var(--viz-warning)]" },
  { type: "transfer", label: "Transfers", icon: CircleAlert, tone: "text-muted-foreground" },
  { type: "sales", label: "Sales", icon: CircleAlert, tone: "text-muted-foreground" },
  { type: "system", label: "System", icon: CircleAlert, tone: "text-muted-foreground" },
];

export function NotificationBell({ notifications = [] }: { notifications?: PosNotification[] }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const unreadCount = notifications.length;
  const hasUnread = unreadCount > 0;
  const label = hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications";

  const grouped = GROUPS.map((group) => ({
    ...group,
    items: notifications.filter((n) => n.type === group.type),
  })).filter((group) => group.items.length > 0);

  function markAllRead() {
    startTransition(async () => {
      const result = await markNotificationsReadAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="viz-root relative" aria-label={label}>
          <Bell className="size-4" />
          {hasUnread && (
            <span className="bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-medium tabular-nums">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="viz-root w-96 p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {hasUnread && (
            <Button variant="ghost" size="sm" onClick={markAllRead} disabled={isPending}>
              Mark all read
            </Button>
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />

        {!hasUnread ? (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bell />
              </EmptyMedia>
              <EmptyTitle>Nothing needs attention</EmptyTitle>
              <EmptyDescription>
                Low-stock and expiry alerts appear here as soon as they arise.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="divide-y">
              {grouped.map((group) => (
                <section key={group.type}>
                  <h3
                    className={cn(
                      "bg-muted/40 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium",
                      group.tone,
                    )}
                  >
                    <group.icon className="size-3.5" />
                    {group.label}
                    <span className="text-muted-foreground ml-auto tabular-nums">
                      {group.items.length}
                    </span>
                  </h3>

                  <ul>
                    {group.items.slice(0, 15).map((item) => (
                      <li key={item.id} className="px-3 py-2">
                        <p className="text-sm leading-snug">{item.message}</p>
                        <p className="text-muted-foreground mt-0.5 text-[10px]">
                          {formatDateTime(item.created_at)}
                        </p>
                      </li>
                    ))}
                    {group.items.length > 15 && (
                      <li className="text-muted-foreground px-3 py-2 text-xs">
                        and {group.items.length - 15} more
                      </li>
                    )}
                  </ul>
                </section>
              ))}
            </div>
          </ScrollArea>
        )}

        <DropdownMenuSeparator className="m-0" />

        <div className="p-2 space-y-1.5">
          <Button asChild variant="default" size="sm" className="w-full text-xs">
            <Link href="/notifications">Open Notification Center</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="w-full text-xs">
            <Link href="/stock/low">Review low stock</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
