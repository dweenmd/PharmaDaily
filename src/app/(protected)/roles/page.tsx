import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";
import { RolePermissionsClient } from "@/features/roles/components/role-permissions-client";

export const metadata: Metadata = {
  title: "Role & Permissions",
  description: "Enterprise role hierarchy and multi-branch permissions matrix",
};

/** Roles permitted to view and manage role permissions */
const CAN_MANAGE_ROLES = ["super_admin", "branch_manager"];

export default async function RolePermissionsPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  if (!CAN_MANAGE_ROLES.includes(profile.role)) {
    notFound();
  }

  const superAdmin = isSuperAdmin(profile.role);

  return (
    <div className="space-y-6">
      <RolePermissionsClient
        initialRole={superAdmin ? "super_admin" : "branch_manager"}
        isSuperAdmin={superAdmin}
      />
    </div>
  );
}
