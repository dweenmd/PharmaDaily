import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScrollText, Users } from "lucide-react";

import { getAccessibleBranches } from "@/features/branches/queries";
import { getAuditLog } from "@/features/audit/queries";
import { AuditRow } from "@/features/audit/components/audit-row";
import { StaffManagementClient } from "@/features/staff/components/staff-management-client";
import { getStaff, getStaffAuthMeta } from "@/features/staff/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Staff Management · Enterprise Administration",
  description: "Enterprise staff directory, role-based access control (RBAC), and branch security administration.",
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

  const superAdmins = staff.filter((s) => s.role === "super_admin" && s.is_active);

  return (
    <div className="space-y-6">
      {superAdmin && superAdmins.length === 1 && (
        <Alert className="border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30">
          <AlertDescription className="text-amber-900 dark:text-amber-300 text-xs">
            There is currently only one active super administrator. Appointing a secondary super administrator
            ensures continuous administrative continuity in case of credential loss.
          </AlertDescription>
        </Alert>
      )}

      {/* Primary Staff Management Client (Header, Filters, Table, Drawer) */}
      <StaffManagementClient
        initialStaff={staff}
        authMeta={authMeta}
        branches={branches}
        isSuperAdmin={superAdmin}
        ownBranchId={profile.branch_id}
        currentProfileId={profile.id}
      />

      {/* Enterprise Security Audit Log */}
      {recentActivity.length > 0 && (
        <Card className="border-border/70 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                <ScrollText className="size-4 text-muted-foreground" />
                <span>Recent Staff Administrative Activity</span>
              </CardTitle>
              <span className="text-[11px] font-mono text-muted-foreground">
                Immutable System Trail
              </span>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-border/40 p-0">
            {recentActivity.slice(0, 8).map((entry) => (
              <AuditRow key={entry.id} entry={entry} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
