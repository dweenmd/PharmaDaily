import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";

import { getAccessibleBranches } from "@/features/branches/queries";
import { getStock } from "@/features/stock/queries";
import { TransferForm } from "@/features/transfers/components/transfer-form";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isSuperAdmin } from "@/lib/auth/roles";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "New transfer",
};

const CAN_REQUEST = ["super_admin", "branch_manager", "stock_manager"];

export default async function NewTransferPage() {
  const profile = await getCurrentProfile();
  if (!profile || !CAN_REQUEST.includes(profile.role)) notFound();

  const superAdmin = isSuperAdmin(profile.role);

  const [branches, stock] = await Promise.all([getAccessibleBranches(), getStock()]);

  // A transfer needs somewhere to send stock to. With one branch there is
  // nothing to say beyond that.
  if (branches.length < 2) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader title="New transfer" />
        <EmptyState
          icon={Building2}
          title="Only one branch"
          description="Transfers move stock between branches. Add a second one first."
          action={
            superAdmin ? (
              <Button asChild>
                <Link href="/branches/new">Add branch</Link>
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  const fromBranchId = profile.branch_id ?? branches[0]!.id;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/transfers">
          <ArrowLeft className="size-4" />
          All transfers
        </Link>
      </Button>

      <PageHeader
        title="New transfer"
        description="Request stock to move to another branch. It stays where it is until a manager approves."
      />

      <TransferForm
        branches={branches}
        stock={stock}
        fromBranchId={fromBranchId}
        canChooseSource={superAdmin}
      />
    </div>
  );
}
