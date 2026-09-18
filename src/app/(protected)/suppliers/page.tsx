import type { Metadata } from "next";

import { SuppliersClient } from "@/features/suppliers/components/suppliers-client";
import { getSuppliersWithStats } from "@/features/suppliers/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export const metadata: Metadata = {
  title: "Suppliers — PharmaDaily",
  description: "Distributors, manufacturer accounts, and procurement payables.",
};

const CATALOGUE_EDITORS = ["super_admin", "branch_manager", "stock_manager"];

export default async function SuppliersPage() {
  const [profile, suppliers] = await Promise.all([
    getCurrentProfile(),
    getSuppliersWithStats({ includeInactive: true }),
  ]);

  const canEdit = profile ? CATALOGUE_EDITORS.includes(profile.role) : false;

  // Paying a supplier is a management decision, and it has to be booked
  // against a branch — so a super admin without one reviews rather than pays.
  const canPay =
    profile !== null &&
    ["super_admin", "branch_manager"].includes(profile.role) &&
    profile.branch_id !== null;

  return (
    <SuppliersClient
      suppliers={suppliers}
      canEdit={canEdit}
      canPay={canPay}
      branchId={profile?.branch_id ?? null}
    />
  );
}
