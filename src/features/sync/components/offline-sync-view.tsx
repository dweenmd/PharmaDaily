"use client";

import * as React from "react";
import {
  AlertCircle,
  ArrowDownUp,
  Check,
  Clock,
  Cloud,
  CloudOff,
  Database,
  HardDrive,
  Info,
  Layers,
  RefreshCw,
  Server,
  ShieldCheck,
  TriangleAlert,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

import { useOnlineStatus } from "@/hooks/use-online-status";
import { useOfflineQueue, notifyQueueChanged } from "@/hooks/use-offline-queue";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type SyncHistoryItem = {
  id: string;
  time: string;
  changes: string;
  category: "Sale" | "Stock Adjustment" | "Customer" | "Audit";
  status: "synced" | "syncing" | "offline" | "error";
  details?: string;
};

const INITIAL_HISTORY: SyncHistoryItem[] = [
  {
    id: "sync-101",
    time: "19 Sep 2026 · 10:42 AM",
    changes: "4 sales transactions (INV-2026-0891 to 0894)",
    category: "Sale",
    status: "synced",
    details: "All ledger records verified & batches deducted",
  },
  {
    id: "sync-102",
    time: "19 Sep 2026 · 10:35 AM",
    changes: "Stock count reconciliation (18 batches)",
    category: "Stock Adjustment",
    status: "synced",
    details: "Shelf B4 physical inventory sync",
  },
  {
    id: "sync-103",
    time: "19 Sep 2026 · 10:14 AM",
    changes: "Customer profile update (Md. Rahim)",
    category: "Customer",
    status: "synced",
    details: "Credit limit revision updated",
  },
  {
    id: "sync-104",
    time: "19 Sep 2026 · 09:58 AM",
    changes: "3 sales transactions queued during network fluctuation",
    category: "Sale",
    status: "synced",
    details: "Auto-synced upon reconnect",
  },
  {
    id: "sync-105",
    time: "19 Sep 2026 · 09:20 AM",
    changes: "Batch expiry status sync",
    category: "Audit",
    status: "synced",
    details: "FEFO priority updated across terminals",
  },
  {
    id: "sync-106",
    time: "19 Sep 2026 · 08:45 AM",
    changes: "Day opening register sync",
    category: "Audit",
    status: "synced",
    details: "Shift opened by Cashier 01",
  },
];

export function OfflineSyncView() {
  const browserOnline = useOnlineStatus();
  const [simulateOffline, setSimulateOffline] = React.useState(false);
  const isOnline = browserOnline && !simulateOffline;

  const { queue, pendingCount } = useOfflineQueue();
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [history, setHistory] = React.useState<SyncHistoryItem[]>(INITIAL_HISTORY);
  const [lastSyncTime, setLastSyncTime] = React.useState("19 Sep 2026 · 10:42 AM");
  const [lastSyncRelative, setLastSyncRelative] = React.useState("2 minutes ago");

  // Synthetic pending changes count as requested by user prompt ("12 pending changes")
  const displayPendingCount = Math.max(12, pendingCount);

  const handleSyncNow = async () => {
    if (!isOnline) {
      toast.error("Cannot sync while offline", {
        description: "Please check your network connection before initiating sync.",
      });
      return;
    }

    setIsSyncing(true);
    toast.info("Syncing offline ledger with central database...");

    await new Promise((res) => setTimeout(res, 1400));

    const now = new Date();
    const formatted = "19 Sep 2026 · " + now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setLastSyncTime(formatted);
    setLastSyncRelative("Just now");

    const newSyncEntry: SyncHistoryItem = {
      id: "sync-" + Date.now(),
      time: formatted,
      changes: `${displayPendingCount} pending ledger items synced`,
      category: "Sale",
      status: "synced",
      details: "Central database synchronized successfully",
    };

    setHistory((prev) => [newSyncEntry, ...prev]);
    setIsSyncing(false);
    toast.success("Sync completed successfully", {
      description: `${displayPendingCount} changes committed to central database.`,
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header with Title and Calm Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Offline & Sync
            </h1>
            <div
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border transition-all",
                isOnline
                  ? "border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                  : "border-zinc-400 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  isOnline ? "bg-emerald-600 dark:bg-emerald-400" : "bg-amber-600 dark:bg-amber-400"
                )}
              />
              <span>{isOnline ? "● Online" : "● Offline"}</span>
            </div>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Resilient local storage ledger with automatic reconciliation and conflict resolution.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSimulateOffline(!simulateOffline)}
            className="text-xs font-medium border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
          >
            {simulateOffline ? <Wifi className="size-3.5 mr-1.5" /> : <WifiOff className="size-3.5 mr-1.5" />}
            {simulateOffline ? "Simulate Online" : "Simulate Offline"}
          </Button>

          <Button
            onClick={handleSyncNow}
            disabled={!isOnline || isSyncing}
            className="bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-sm"
          >
            <RefreshCw className={cn("size-4 mr-2", isSyncing && "animate-spin")} />
            {isSyncing ? "Syncing…" : "Sync Now"}
          </Button>
        </div>
      </div>

      {/* Offline Callout Banner */}
      {!isOnline && (
        <div className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/70 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0">
              <CloudOff className="size-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                You're offline
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Sales can continue and will sync automatically when connection is restored. All stock deductions are buffered locally inside secure IndexedDB storage.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Connection Status */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Connection Status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {isOnline ? "Online" : "Offline"}
              </span>
              <span
                className={cn(
                  "size-2.5 rounded-full inline-block",
                  isOnline ? "bg-emerald-500" : "bg-amber-500"
                )}
              />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {isOnline ? "Direct low-latency link" : "Buffered locally in IndexedDB"}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Pending Changes */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Pending Changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-100">
                {displayPendingCount}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                Queue
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              12 pending changes in queue
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Last Sync */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Last Sync
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {lastSyncRelative}
              </span>
              <Clock className="size-4 text-zinc-400" />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 tabular-nums">
              {lastSyncTime}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Local Storage Health */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Local Cache
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Healthy
              </span>
              <ShieldCheck className="size-4 text-zinc-400" />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              IndexedDB v1 · 1,420 items cached
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sync Queue Inspection Panel */}
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Sync Queue
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                Transactions and stock adjustments waiting for cloud verification.
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit font-mono text-xs border-zinc-300 dark:border-zinc-700">
              {displayPendingCount} pending items
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
            <div className="p-4 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    POS Sales Batch #1098
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                    8 invoices
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Total: ৳14,280.00 · Created 4 mins ago · Cashier: Md. Tanvir
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                  Ready to replay
                </span>
                <Badge variant="outline" className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                  Queue #1
                </Badge>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Customer Balance Reconciliation
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                    3 updates
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Partial dues collected on offline receipts · Created 7 mins ago
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                  Ready to replay
                </span>
                <Badge variant="outline" className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                  Queue #2
                </Badge>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Damage Stock Flagging
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                    1 item
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  1 strip Amoxicillin 500mg marked expired/broken
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                  Ready to replay
                </span>
                <Badge variant="outline" className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                  Queue #3
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync History Table */}
      <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Sync History
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                Audit log of recent data exchanges between this counter and central servers.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-100 dark:border-zinc-800">
                <TableHead className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Time</TableHead>
                <TableHead className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Changes</TableHead>
                <TableHead className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Details</TableHead>
                <TableHead className="text-xs font-medium text-zinc-500 dark:text-zinc-400 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Sample demonstration of states as requested */}
              <TableRow className="border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                <TableCell className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                  19 Sep 2026 · 10:48 AM
                </TableCell>
                <TableCell className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  12 pending changes
                </TableCell>
                <TableCell className="text-xs text-zinc-500 dark:text-zinc-400">
                  Sales ledger reconciliation in progress
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                    <RefreshCw className="size-3 animate-spin" />
                    ↻ Syncing
                  </span>
                </TableCell>
              </TableRow>

              <TableRow className="border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                <TableCell className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                  19 Sep 2026 · 10:42 AM
                </TableCell>
                <TableCell className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  4 sales transactions
                </TableCell>
                <TableCell className="text-xs text-zinc-500 dark:text-zinc-400">
                  INV-2026-0891 to INV-2026-0894
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
                    <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                    ✓ Synced
                  </span>
                </TableCell>
              </TableRow>

              <TableRow className="border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                <TableCell className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                  19 Sep 2026 · 10:15 AM
                </TableCell>
                <TableCell className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Terminal 2 offline disconnect
                </TableCell>
                <TableCell className="text-xs text-zinc-500 dark:text-zinc-400">
                  Network connection dropped, switched to local database
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    <span className="size-1.5 rounded-full bg-zinc-400" />
                    ● Offline
                  </span>
                </TableCell>
              </TableRow>

              <TableRow className="border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                <TableCell className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                  19 Sep 2026 · 09:40 AM
                </TableCell>
                <TableCell className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Stock batch transfer TRX-091
                </TableCell>
                <TableCell className="text-xs text-zinc-500 dark:text-zinc-400">
                  Conflict detected: batch quantity modified on server
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                    <TriangleAlert className="size-3 text-amber-600 dark:text-amber-400" />
                    ⚠ Sync Error
                  </span>
                </TableCell>
              </TableRow>

              {history.slice(1).map((item) => (
                <TableRow key={item.id} className="border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                  <TableCell className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {item.time}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {item.changes}
                  </TableCell>
                  <TableCell className="text-xs text-zinc-500 dark:text-zinc-400">
                    {item.details || "Ledger record verified"}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                      ✓ Synced
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
