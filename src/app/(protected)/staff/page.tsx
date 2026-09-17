import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";

import { getAccessibleBranches } from "@/features/branches/queries";
import { ResetPasswordDialog, StaffDialog } from "@/features/staff/components/staff-dialog";
import { getStaff, getStaffEmails } from "@/features/staff/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { ROLE_LABELS, isSuperAdmin } from "@/lib/auth/roles";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  title: "Staff",
};

const CAN_MANAGE_STAFF = ["super_admin", "branch_manager"];

export default async function StaffPage() {
  const profile = await getCurrentProfile();
  if (!profile || !CAN_MANAGE_STAFF.includes(profile.role)) notFound();

  const superAdmin = isSuperAdmin(profile.role);

  const [staff, branches, emails] = await Promise.all([
    getStaff(),
    getAccessibleBranches(),
    getStaffEmails(),
  ]);

  const activeCount = staff.filter((s) => s.is_active).length;
  const superAdmins = staff.filter((s) => s.role === "super_admin" && s.is_active);

  // A branch manager cannot act on their own level or above, so those rows are
  // shown but not editable. Saying so beats an Edit button that always fails.
  function canEdit(target: (typeof staff)[number]) {
    if (superAdmin) return true;
    return target.role !== "super_admin" && target.role !== "branch_manager";
  }

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

          <Card className="overflow-hidden py-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead>Role</TableHead>
                    {superAdmin && <TableHead className="hidden md:table-cell">Branch</TableHead>}
                    <TableHead className="hidden lg:table-cell">Since</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-28 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {staff.map((member) => {
                    const editable = canEdit(member);
                    const isSelf = member.id === profile.id;

                    return (
                      <TableRow key={member.id} className={member.is_active ? "" : "opacity-60"}>
                        <TableCell className="font-medium">
                          {member.name}
                          {isSelf && (
                            <span className="text-muted-foreground ml-1.5 text-xs">(you)</span>
                          )}
                        </TableCell>

                        <TableCell className="text-muted-foreground hidden max-w-48 truncate text-sm sm:table-cell">
                          {emails[member.auth_id] ?? "—"}
                        </TableCell>

                        <TableCell>
                          <Badge variant={member.role === "super_admin" ? "default" : "secondary"}>
                            {ROLE_LABELS[member.role]}
                          </Badge>
                        </TableCell>

                        {superAdmin && (
                          <TableCell className="hidden md:table-cell">
                            {member.branch ? (
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {member.branch.code}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">All branches</span>
                            )}
                          </TableCell>
                        )}

                        <TableCell className="text-muted-foreground hidden text-sm lg:table-cell">
                          {formatDate(member.created_at)}
                        </TableCell>

                        <TableCell>
                          <Badge variant={member.is_active ? "default" : "outline"}>
                            {member.is_active ? "Active" : "Deactivated"}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {editable ? (
                            <div className="flex items-center justify-end gap-0.5">
                              <ResetPasswordDialog staff={member} />
                              <StaffDialog
                                branches={branches}
                                isSuperAdmin={superAdmin}
                                ownBranchId={profile.branch_id}
                                staff={member}
                              />
                            </div>
                          ) : (
                            <span className="text-muted-foreground block text-right text-xs">
                              —
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
        </>
      )}

      <p className="text-muted-foreground text-xs">
        A new account starts inactive with no branch and no meaningful role, and is provisioned in a
        separate step — which is why the signup trigger refuses to read a role from whatever the
        client sent.
      </p>
    </div>
  );
}
