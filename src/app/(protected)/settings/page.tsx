import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SettingsForm } from "@/features/settings/components/settings-form";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = {
  title: "Settings",
};

const CAN_EDIT_SETTINGS = ["super_admin", "branch_manager"];

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile || !CAN_EDIT_SETTINGS.includes(profile.role)) notFound();

  const supabase = await createClient();
  const { data: rows } = await supabase.from("settings").select("key, value, branch_id");

  const superAdmin = isSuperAdmin(profile.role);

  // A super admin edits the chain default; a branch manager edits their own
  // branch's override. Which one is in effect is shown per setting, because
  // "why is my alert threshold different from head office's" is otherwise an
  // unanswerable question from inside the app.
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
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Settings"
        description={
          superAdmin
            ? "Chain-wide defaults. A branch manager can tighten these for their own branch."
            : `Overrides for ${profile.branch?.name ?? "your branch"}. Leaving one unchanged keeps the chain default.`
        }
      />

      <SettingsForm
        values={values}
        branchId={scopeBranchId}
        branchName={superAdmin ? null : (profile.branch?.name ?? null)}
      />
    </div>
  );
}
