"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Bell,
  CalendarClock,
  Check,
  CheckCheck,
  CircleDot,
  Clock,
  CreditCard,
  Database,
  Filter,
  TriangleAlert,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type NotificationCategory = "all" | "unread" | "inventory" | "sales" | "system";

export type CenterNotificationItem = {
  id: string;
  category: "inventory" | "sales" | "system";
  type: "low_stock" | "expiry" | "transfer" | "cash" | "system";
  title: string;
  description: string;
  time: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
};

const INITIAL_NOTIFICATIONS: CenterNotificationItem[] = [
  {
    id: "notif-1",
    category: "inventory",
    type: "low_stock",
    title: "Low Inventory Alert",
    description: "Paracetamol 500 mg is below minimum stock.",
    time: "10 mins ago",
    timestamp: "19 Sep 2026 · 10:35 AM",
    read: false,
    actionUrl: "/stock/low",
    actionLabel: "Reorder Stock",
  },
  {
    id: "notif-2",
    category: "inventory",
    type: "expiry",
    title: "Near Expiry Alert",
    description: "12 medicine batches expire within 30 days.",
    time: "25 mins ago",
    timestamp: "19 Sep 2026 · 10:20 AM",
    read: false,
    actionUrl: "/stock/expiring",
    actionLabel: "Review Batches",
  },
  {
    id: "notif-3",
    category: "inventory",
    type: "transfer",
    title: "Stock Transfer Pending",
    description: "Transfer TR-00231 is waiting for approval.",
    time: "42 mins ago",
    timestamp: "19 Sep 2026 · 10:03 AM",
    read: false,
    actionUrl: "/transfers",
    actionLabel: "Review Transfer",
  },
  {
    id: "notif-4",
    category: "sales",
    type: "cash",
    title: "Cash Register Closing",
    description: "Main Branch register requires closing.",
    time: "1 hour ago",
    timestamp: "19 Sep 2026 · 09:45 AM",
    read: false,
    actionUrl: "/sales",
    actionLabel: "Close Register",
  },
  {
    id: "notif-5",
    category: "system",
    type: "system",
    title: "Sync Queue Pending",
    description: "12 offline changes are waiting to sync.",
    time: "2 hours ago",
    timestamp: "19 Sep 2026 · 08:42 AM",
    read: true,
    actionUrl: "/sync",
    actionLabel: "Sync Now",
  },
  {
    id: "notif-6",
    category: "inventory",
    type: "low_stock",
    title: "Reorder Recommendation",
    description: "Azithromycin 500mg batch balance is down to 4 strips.",
    time: "Yesterday · 04:15 PM",
    timestamp: "18 Sep 2026 · 04:15 PM",
    read: true,
    actionUrl: "/purchases/new",
    actionLabel: "Create PO",
  },
  {
    id: "notif-7",
    category: "sales",
    type: "cash",
    title: "Daily Target Met",
    description: "Main branch gross counter receipts crossed ৳150,000.",
    time: "Yesterday · 06:00 PM",
    timestamp: "18 Sep 2026 · 06:00 PM",
    read: true,
  },
];

export function NotificationCenter() {
  const [items, setItems] = React.useState<CenterNotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = React.useState<NotificationCategory>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const unreadCount = items.filter((item) => !item.read).length;

  const filteredItems = items.filter((item) => {
    // Filter match
    if (activeFilter === "unread" && item.read) return false;
    if (activeFilter === "inventory" && item.category !== "inventory") return false;
    if (activeFilter === "sales" && item.category !== "sales") return false;
    if (activeFilter === "system" && item.category !== "system") return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const markAllAsRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    toast.success("All notifications marked as read");
  };

  const toggleReadStatus = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: !item.read } : item))
    );
  };

  const deleteNotification = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    toast.info("Notification dismissed");
  };

  const getItemIcon = (type: CenterNotificationItem["type"]) => {
    switch (type) {
      case "low_stock":
        return <TriangleAlert className="size-4 text-zinc-700 dark:text-zinc-300" />;
      case "expiry":
        return <CalendarClock className="size-4 text-zinc-700 dark:text-zinc-300" />;
      case "transfer":
        return <ArrowUpDown className="size-4 text-zinc-700 dark:text-zinc-300" />;
      case "cash":
        return <Wallet className="size-4 text-zinc-700 dark:text-zinc-300" />;
      case "system":
        return <Database className="size-4 text-zinc-700 dark:text-zinc-300" />;
      default:
        return <Bell className="size-4 text-zinc-700 dark:text-zinc-300" />;
    }
  };

  const getCategoryBadge = (category: CenterNotificationItem["category"]) => {
    switch (category) {
      case "inventory":
        return "Inventory";
      case "sales":
        return "Sales";
      case "system":
        return "System";
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Notification Center
            </h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 tabular-nums">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Operational alerts, inventory thresholds, transfer requests, and system synchronization events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs font-medium border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <CheckCheck className="size-3.5 mr-1.5" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Monochrome Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {(
            [
              { key: "all", label: "All" },
              { key: "unread", label: "Unread", count: unreadCount },
              { key: "inventory", label: "Inventory" },
              { key: "sales", label: "Sales" },
              { key: "system", label: "System" },
            ] as const
          ).map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFilter(tab.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none whitespace-nowrap",
                  isActive
                    ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/60"
                )}
              >
                <span>{tab.label}</span>
                {"count" in tab && tab.count > 0 && (
                  <span
                    className={cn(
                      "size-4 rounded-full flex items-center justify-center text-[10px] font-mono",
                      isActive
                        ? "bg-zinc-700 text-zinc-100 dark:bg-zinc-300 dark:text-zinc-900"
                        : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="size-3.5 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Filter notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:border-zinc-400 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* Notifications List */}
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardContent className="p-0">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center">
              <div className="size-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-3">
                <Bell className="size-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                No notifications found
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? "Try searching for a different keyword or switch the category filter."
                  : "All clear. There are no pending alerts in this category."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "p-4 transition-colors flex items-start gap-3.5 group",
                    !item.read
                      ? "bg-zinc-50/70 dark:bg-zinc-800/30 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/50"
                      : "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20"
                  )}
                >
                  {/* Icon Indicator */}
                  <div
                    className={cn(
                      "size-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors",
                      !item.read
                        ? "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xs"
                        : "border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-800/40 text-zinc-400"
                    )}
                  >
                    {getItemIcon(item.type)}
                  </div>

                  {/* Main Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {getCategoryBadge(item.category)}
                      </span>
                      <h4
                        className={cn(
                          "text-sm tracking-tight",
                          !item.read
                            ? "font-semibold text-zinc-900 dark:text-zinc-100"
                            : "font-medium text-zinc-700 dark:text-zinc-300"
                        )}
                      >
                        {item.title}
                      </h4>
                      {!item.read && (
                        <span className="size-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                      )}
                    </div>

                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-snug">
                      {item.description}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-xs text-zinc-400 dark:text-zinc-500 font-mono">
                      <span>{item.time}</span>
                      <span>·</span>
                      <span>{item.timestamp}</span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.actionUrl && (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <Link href={item.actionUrl}>
                          <span>{item.actionLabel || "View"}</span>
                          <ArrowRight className="size-3 ml-1" />
                        </Link>
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                      onClick={() => toggleReadStatus(item.id)}
                      title={item.read ? "Mark unread" : "Mark read"}
                    >
                      {item.read ? <CircleDot className="size-3.5" /> : <Check className="size-3.5" />}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-zinc-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteNotification(item.id)}
                      title="Dismiss notification"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
