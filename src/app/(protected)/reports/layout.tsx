import { notFound } from "next/navigation";

import { ReportsNav } from "@/features/reports/components/reports-nav";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

const CAN_VIEW_REPORTS = ["super_admin", "branch_manager", "stock_manager"];

/**
 * Reports are for managers and authorized operations personnel.
 */
export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile || !CAN_VIEW_REPORTS.includes(profile.role)) notFound();

  return (
    <div className="space-y-6">
      <ReportsNav />
      {children}
    </div>
  );
}

