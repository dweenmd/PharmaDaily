import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScrollText, Users } from "lucide-react";

import { getAccessibleBranches } from "@/features/branches/queries";
import { getAuditLog } from "@/features/audit/queries";
import { AuditRow } from "@/features/audit/components/audit-row";
import { StaffDialog } from "@/features/staff/components/staff-dialog";
import { StaffTable } from "@/features/staff/components/staff-table";
import { getStaff, getStaffAuthMeta } from "@/features/staff/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Staff",
};

const CAN_MANAGE_STAFF = ["super_admin", "branch_manager"];

export default async function StaffPage() {
  const profile = await getCurrentProfile();
  if (!profile || !CAN_MANAGE_STAFF.includes(profile.role)) notFound();

  const superAdmin = isSuperAdmin(profile.role);

  const [staff, branches, authMeta, recentActivity] = await Promise.all([
    getStaff(),
    getAccessibleBranches(),
    getStaffAuthMeta(),
    getAuditLog({ table: "profiles" }),
  ]);

  const activeCount = staff.filter((s) => s.is_active).length;
  const superAdmins = staff.filter((s) => s.role === "super_admin" && s.is_active);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description={
          superAdmin
            ? "Everyone with an account, across every branch."
            : `Staff at ${profile.branch?.name ?? "your branch"}.`
        }
        action={
          <StaffDialog
            branches={branches}
            isSuperAdmin={superAdmin}
            ownBranchId={profile.branch_id}
          />
        }
      />

      {superAdmin && superAdmins.length === 1 && (
        <Alert>
          <AlertDescription>
            There is one active super admin. If that account is lost, the only way back in is the
            seed script and the service-role key — appointing a second one is worth doing.
          </AlertDescription>
        </Alert>
      )}

      {staff.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No staff yet"
          description="Accounts are created here. There is no public sign-up, by design."
        />
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            {activeCount} active
            {staff.length !== activeCount && ` · ${staff.length - activeCount} deactivated`}
          </p>

          <StaffTable
            staff={staff}
            authMeta={authMeta}
            branches={branches}
            isSuperAdmin={superAdmin}
            ownBranchId={profile.branch_id}
            currentProfileId={profile.id}
          />
        </>
      )}

      <p className="text-muted-foreground text-xs">
        A new account starts inactive with no branch and no meaningful role, and is provisioned in a
        separate step — which is why the signup trigger refuses to read a role from whatever the
        client sent.
      </p>

      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScrollText className="size-4" />
              Recent staff activity
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {recentActivity.slice(0, 10).map((entry) => (
              <AuditRow key={entry.id} entry={entry} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
