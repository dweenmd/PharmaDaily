import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAccessibleBranches } from "@/features/branches/queries";
import { ReportsCenterClient } from "@/features/reports/components/reports-center-client";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Reports Center — PharmaDaily",
  description: "Enterprise report navigation interface covering Sales, Inventory, Finance, and Operations.",
};

const CAN_VIEW_REPORTS = ["super_admin", "branch_manager", "stock_manager"];

export default async function ReportsPage() {
  const profile = await getCurrentProfile();
  if (!profile || !CAN_VIEW_REPORTS.includes(profile.role)) notFound();

  const branches = await getAccessibleBranches();

  return (
    <ReportsCenterClient
      branches={branches}
      currentBranchId={profile.branch_id}
      isSuperAdmin={isSuperAdmin(profile.role)}
    />
  );
}
