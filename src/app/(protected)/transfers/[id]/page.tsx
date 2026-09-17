import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { TransferActions } from "@/features/transfers/components/transfer-actions";
import { getTransferById } from "@/features/transfers/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";
import { formatDate, formatDateTime } from "@/lib/format";
import { type TransferStatus } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Transfer",
};

const STATUS_LABEL: Record<TransferStatus, string> = {
  pending: "Awaiting approval",
  approved: "In transit",
  completed: "Received",
  rejected: "Rejected",
};

const CAN_RECEIVE = ["super_admin", "branch_manager", "stock_manager"];

export default async function TransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [profile, transfer] = await Promise.all([getCurrentProfile(), getTransferById(id)]);
  if (!transfer || !profile) notFound();

  const superAdmin = isSuperAdmin(profile.role);
  const atSource = superAdmin || transfer.from_branch_id === profile.branch_id;
  const atDestination = superAdmin || transfer.to_branch_id === profile.branch_id;

  // Approval belongs to the sending branch — it is their stock leaving — and
  // to a manager, so that requesting and approving are never the same person's
  // decision alone.
  const canApprove =
    transfer.status === "pending" &&
    atSource &&
    ["super_admin", "branch_manager"].includes(profile.role);

  // Receipt belongs to the destination. The sender confirming arrival would
  // defeat the point of counting it in.
  const canReceive =
    transfer.status === "approved" && atDestination && CAN_RECEIVE.includes(profile.role);

  const totalSent = transfer.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalReceived = transfer.items.reduce((sum, i) => sum + (i.received_quantity ?? 0), 0);
  const anyShortfall = transfer.items.some(
    (i) => i.received_quantity !== null && i.received_quantity < i.quantity,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/transfers">
          <ArrowLeft className="size-4" />
          All transfers
        </Link>
      </Button>

      <PageHeader
        title={transfer.reference_no}
        description={`${transfer.from_branch?.name ?? "—"} → ${transfer.to_branch?.name ?? "—"}`}
        action={<Badge className="text-sm">{STATUS_LABEL[transfer.status]}</Badge>}
      />

      {transfer.status === "approved" && (
        <Alert>
          <AlertDescription>
            This stock has left {transfer.from_branch?.name ?? "the sending branch"} and has not yet
            been counted in at {transfer.to_branch?.name ?? "the destination"}. Neither branch can
            sell it until receipt is confirmed.
          </AlertDescription>
        </Alert>
      )}

      {transfer.status === "rejected" && transfer.rejection_reason && (
        <Alert variant="destructive">
          <AlertDescription>
            Rejected: {transfer.rejection_reason}. No stock was moved.
          </AlertDescription>
        </Alert>
      )}

      {anyShortfall && (
        <Alert>
          <AlertDescription>
            {totalSent - totalReceived} of {totalSent} units did not arrive. The reasons are on the
            lines below, and the shortfall is visible in both branches&apos; stock ledgers.
          </AlertDescription>
        </Alert>
      )}

      {(canApprove || canReceive) && (
        <TransferActions
          transferId={transfer.id}
          items={transfer.items.map((i) => ({
            id: i.id,
            batch_no: i.batch_no,
            quantity: i.quantity,
            medicine_name: i.medicine?.name ?? "Unknown medicine",
            strength: i.medicine?.strength ?? null,
          }))}
          canApprove={canApprove}
          canReceive={canReceive}
        />
      )}

      <Card className="overflow-hidden pb-0">
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
          <CardDescription>
            The destination inherits each batch&apos;s expiry and pricing, so the same physical
            batch behaves identically wherever it sits.
          </CardDescription>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead className="hidden sm:table-cell">Expiry</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Received</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {transfer.items.map((item) => {
                const short =
                  item.received_quantity !== null && item.received_quantity < item.quantity;

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {[item.medicine?.name, item.medicine?.strength].filter(Boolean).join(" ")}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.batch_no}</TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                      {item.source?.expiry_date ? formatDate(item.source.expiry_date) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {item.received_quantity === null ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span
                            className={`tabular-nums ${short ? "font-medium text-amber-700 dark:text-amber-500" : ""}`}
                          >
                            {item.received_quantity}
                          </span>
                          {short && item.shortfall_reason && (
                            <span className="text-muted-foreground max-w-40 truncate text-xs">
                              {item.shortfall_reason}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <CardContent className="grid gap-3 border-t pt-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-xs">Requested</p>
            <p>{transfer.requested_by?.name ?? "—"}</p>
            <p className="text-muted-foreground text-xs">{formatDateTime(transfer.created_at)}</p>
          </div>

          <div>
            <p className="text-muted-foreground text-xs">
              {transfer.status === "rejected" ? "Rejected by" : "Approved by"}
            </p>
            <p>{transfer.approved_by_profile?.name ?? "—"}</p>
            {transfer.approved_at && (
              <p className="text-muted-foreground text-xs">
                {formatDateTime(transfer.approved_at)}
              </p>
            )}
          </div>

          <div>
            <p className="text-muted-foreground text-xs">Received by</p>
            <p>{transfer.received_by_profile?.name ?? "—"}</p>
            {transfer.completed_at && (
              <p className="text-muted-foreground text-xs">
                {formatDateTime(transfer.completed_at)}
              </p>
            )}
          </div>
        </CardContent>

        {transfer.notes && (
          <CardContent className="border-t pt-4">
            <p className="text-muted-foreground text-sm">{transfer.notes}</p>
          </CardContent>
        )}
      </Card>

      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <span>{transfer.from_branch?.code}</span>
        <ArrowRight className="size-3" />
        <span>{transfer.to_branch?.code}</span>
        <span>· {totalSent} units dispatched</span>
        {transfer.status === "completed" && <span>· {totalReceived} received</span>}
      </div>
    </div>
  );
}
