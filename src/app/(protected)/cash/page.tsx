import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Banknote } from "lucide-react";

import { TillPanel } from "@/features/cash/components/till-panel";
import {
  getExpectedCash,
  getOpenSession,
  getSessionBreakdown,
  getSessionHistory,
  getSessionMovements,
} from "@/features/cash/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Cash",
};

const CAN_OPERATE = ["super_admin", "branch_manager", "cashier", "pharmacist"];

export default async function CashPage() {
  const profile = await getCurrentProfile();
  if (!profile) notFound();

  // Cash lives in a physical drawer at a branch. A super admin without one
  // reviews reconciliations rather than counting a till.
  if (!profile.branch_id || !profile.branch) {
    const history = await getSessionHistory();

    return (
      <div className="space-y-6">
        <PageHeader title="Cash" description="Till reconciliations across every branch." />
        <SessionHistory sessions={history} showBranch />
      </div>
    );
  }

  const session = await getOpenSession();

  const [expected, movements, breakdown, history] = await Promise.all([
    session ? getExpectedCash(session.id) : Promise.resolve(0),
    session ? getSessionMovements(session.id) : Promise.resolve([]),
    session
      ? getSessionBreakdown(session)
      : Promise.resolve({ salesCash: 0, collections: 0, refunds: 0 }),
    getSessionHistory(),
  ]);

  const canOperate = CAN_OPERATE.includes(profile.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash"
        description={`${profile.branch.name} · the one place the system meets what is physically in the drawer.`}
      />

      <TillPanel
        branchId={profile.branch_id}
        branchName={profile.branch.name}
        session={session}
        expected={expected}
        movements={movements}
        breakdown={breakdown}
        canOperate={canOperate}
      />

      <SessionHistory sessions={history} />
    </div>
  );
}

function SessionHistory({
  sessions,
  showBranch = false,
}: {
  sessions: Awaited<ReturnType<typeof getSessionHistory>>;
  showBranch?: boolean;
}) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={Banknote}
        title="No closed shifts yet"
        description="Reconciliations appear here once a till has been opened and counted."
      />
    );
  }

  const short = sessions.filter((s) => Number(s.variance ?? 0) < -1);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Past shifts</h2>
        {short.length > 0 && (
          <span className="text-xs text-amber-700 dark:text-amber-500">
            {short.length} came up short
          </span>
        )}
      </div>

      <Card className="overflow-hidden py-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opened</TableHead>
                {showBranch && <TableHead className="hidden sm:table-cell">Branch</TableHead>}
                <TableHead className="hidden md:table-cell">Closed by</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Counted</TableHead>
                <TableHead className="text-right">Difference</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sessions.map((session) => {
                const variance = Number(session.variance ?? 0);
                const balanced = Math.abs(variance) <= 1;

                return (
                  <TableRow key={session.id}>
                    <TableCell className="whitespace-nowrap">
                      <div>
                        <p className="text-sm">{formatDateTime(session.opened_at)}</p>
                        {session.variance_reason && (
                          <p className="text-muted-foreground max-w-56 truncate text-xs">
                            {session.variance_reason}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {showBranch && (
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {session.branch?.code ?? "—"}
                        </Badge>
                      </TableCell>
                    )}

                    <TableCell className="text-muted-foreground hidden max-w-32 truncate text-sm md:table-cell">
                      {session.closed_by_profile?.name ?? "—"}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(session.expected_cash)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(session.counted_cash)}
                    </TableCell>
                    <TableCell className="text-right">
                      {balanced ? (
                        <span className="text-muted-foreground text-xs">Balanced</span>
                      ) : (
                        <span
                          className={`font-medium tabular-nums ${
                            variance < 0
                              ? "text-red-700 dark:text-red-500"
                              : "text-amber-700 dark:text-amber-500"
                          }`}
                        >
                          {variance > 0 ? "+" : "−"}
                          {formatCurrency(Math.abs(variance))}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
