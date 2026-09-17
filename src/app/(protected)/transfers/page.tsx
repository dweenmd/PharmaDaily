import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftRight, ArrowRight, Plus } from "lucide-react";

import { getTransfers } from "@/features/transfers/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { formatDateTime } from "@/lib/format";
import { type TransferStatus } from "@/types";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "Transfers",
};

const CAN_REQUEST = ["super_admin", "branch_manager", "stock_manager"];

/**
 * "In transit" is the approved state, not a separate one.
 *
 * A transfer that has been approved has already had its stock deducted from
 * the sending branch and has not yet reached the receiving one — which is
 * exactly what in transit means. Giving it its own status would add a state
 * with no distinct meaning and another transition to get wrong.
 */
const TABS: { value: string; label: string; match: (s: TransferStatus) => boolean }[] = [
  { value: "pending", label: "Pending", match: (s) => s === "pending" },
  { value: "transit", label: "In transit", match: (s) => s === "approved" },
  { value: "completed", label: "Completed", match: (s) => s === "completed" },
  { value: "rejected", label: "Rejected", match: (s) => s === "rejected" },
  { value: "all", label: "All", match: () => true },
];

const STATUS_STYLE: Record<
  TransferStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  pending: { label: "Awaiting approval", variant: "secondary" },
  approved: { label: "In transit", variant: "default" },
  completed: { label: "Received", variant: "outline" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export default async function TransfersPage() {
  const [profile, transfers] = await Promise.all([getCurrentProfile(), getTransfers()]);

  const canRequest = profile ? CAN_REQUEST.includes(profile.role) : false;
  const myBranchId = profile?.branch_id ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock transfers"
        description="Moving stock between branches. Nothing moves until it is approved, and it only lands when someone counts it in."
        action={
          canRequest ? (
            <Button asChild>
              <Link href="/transfers/new">
                <Plus className="size-4" />
                New Transfer
              </Link>
            </Button>
          ) : undefined
        }
      />

      {transfers.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No transfers yet"
          description="Request one when a branch has stock another needs."
          action={
            canRequest ? (
              <Button asChild>
                <Link href="/transfers/new">
                  <Plus className="size-4" />
                  New Transfer
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Tabs defaultValue="pending">
          <TabsList>
            {TABS.map((tab) => {
              const count = transfers.filter((t) => tab.match(t.status)).length;
              return (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                  {count > 0 && (
                    <span className="text-muted-foreground ml-1.5 text-xs tabular-nums">
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {TABS.map((tab) => {
            const rows = transfers.filter((t) => tab.match(t.status));

            return (
              <TabsContent key={tab.value} value={tab.value} className="mt-4">
                {rows.length === 0 ? (
                  <EmptyState
                    icon={ArrowLeftRight}
                    title={`Nothing ${tab.label.toLowerCase()}`}
                    description="Transfers appear here as they move through approval and receipt."
                  />
                ) : (
                  <ul className="space-y-3">
                    {rows.map((transfer) => {
                      const style = STATUS_STYLE[transfer.status];
                      const outgoing = transfer.from_branch_id === myBranchId;
                      const incoming = transfer.to_branch_id === myBranchId;

                      return (
                        <li key={transfer.id}>
                          <Card className="p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link
                                    href={`/transfers/${transfer.id}`}
                                    className="font-mono text-sm font-medium hover:underline"
                                  >
                                    {transfer.reference_no}
                                  </Link>
                                  <Badge variant={style.variant}>{style.label}</Badge>
                                  {outgoing && <Badge variant="outline">Outgoing</Badge>}
                                  {incoming && <Badge variant="outline">Incoming</Badge>}
                                </div>

                                <p className="flex flex-wrap items-center gap-1.5 text-sm">
                                  <span className="font-medium">
                                    {transfer.from_branch?.name ?? "—"}
                                  </span>
                                  <ArrowRight className="text-muted-foreground size-3.5" />
                                  <span className="font-medium">
                                    {transfer.to_branch?.name ?? "—"}
                                  </span>
                                </p>

                                <p className="text-muted-foreground text-xs">
                                  {transfer.item_count} line
                                  {transfer.item_count === 1 ? "" : "s"} · {transfer.total_units}{" "}
                                  units · requested {formatDateTime(transfer.created_at)}
                                </p>

                                {transfer.rejection_reason && (
                                  <p className="text-xs text-red-600 dark:text-red-500">
                                    {transfer.rejection_reason}
                                  </p>
                                )}
                              </div>

                              <Button asChild variant="outline" size="sm">
                                <Link href={`/transfers/${transfer.id}`}>
                                  {transfer.status === "pending" && outgoing
                                    ? "Review"
                                    : transfer.status === "approved" && incoming
                                      ? "Receive"
                                      : "View"}
                                </Link>
                              </Button>
                            </div>
                          </Card>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
