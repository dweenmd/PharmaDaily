import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { SettingsWorkspace } from "@/features/settings/components/settings-workspace";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "POS Settings",
  description: "Point of Sale terminal parameters, billing rules, hardware barcode scanner, and keyboard shortcuts",
};

const CAN_EDIT_SETTINGS = ["super_admin", "branch_manager"];

export default async function PosSettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  if (!CAN_EDIT_SETTINGS.includes(profile.role)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: rows } = await supabase.from("settings").select("key, value, branch_id");

  const superAdmin = isSuperAdmin(profile.role);
  const scopeBranchId = superAdmin ? null : profile.branch_id;

  const values: Record<string, { value: string; scope: "branch" | "global" }> = {};

  for (const row of rows ?? []) {
    if (row.branch_id === null) {
      values[row.key] ??= { value: row.value, scope: "global" };
    }
  }

  for (const row of rows ?? []) {
    if (scopeBranchId && row.branch_id === scopeBranchId) {
      values[row.key] = { value: row.value, scope: "branch" };
    }
  }

  return (
    <div className="space-y-6">
      <SettingsWorkspace
        initialValues={values}
        branchId={scopeBranchId}
        branchName={superAdmin ? null : (profile.branch?.name ?? null)}
        isSuperAdmin={superAdmin}
        initialTab="pos"
      />
    </div>
  );
}
