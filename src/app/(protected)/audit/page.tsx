import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScrollText } from "lucide-react";

import { AuditFilters } from "@/features/audit/components/audit-filters";
import { AuditRow } from "@/features/audit/components/audit-row";
import { getAuditLog, getAuditActors } from "@/features/audit/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Audit log",
};

const CAN_VIEW = ["super_admin", "branch_manager"];

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await getCurrentProfile();
  if (!profile || !CAN_VIEW.includes(profile.role)) notFound();

  const params = await searchParams;
  const table = typeof params.table === "string" ? params.table : null;
  const action = typeof params.action === "string" ? params.action : null;
  const actor = typeof params.actor === "string" ? params.actor : null;
  const from = typeof params.from === "string" ? params.from : null;
  const to = typeof params.to === "string" ? params.to : null;

  const [entries, actors] = await Promise.all([
    getAuditLog({ table, action, actor, from, to }),
    getAuditActors(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description={
          isSuperAdmin(profile.role)
            ? "Every change to a record that can be edited, across all branches."
            : `Changes at ${profile.branch?.name ?? "your branch"}.`
        }
      />

      <AuditFilters actors={actors} />

      {entries.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Nothing recorded for these filters"
          description="Entries appear when a record is edited or removed. Creating a sale is not logged here — the sale, its lines and its ledger entries already say that."
        />
      ) : (
        <Card className="divide-y py-0">
          {entries.map((entry) => (
            <AuditRow key={entry.id} entry={entry} />
          ))}
        </Card>
      )}

      {entries.length >= 300 && (
        <p className="text-muted-foreground text-center text-xs">
          Showing the most recent 300 entries. Narrow the filters to see further back.
        </p>
      )}
    </div>
  );
}
