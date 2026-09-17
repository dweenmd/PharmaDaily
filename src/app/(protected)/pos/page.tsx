import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Boxes } from "lucide-react";

import { PosTerminal } from "@/features/sales/components/pos-terminal";
import { getSellableStock } from "@/features/sales/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "POS",
};

const CAN_SELL = ["super_admin", "branch_manager", "cashier", "pharmacist"];

export default async function PosPage() {
  const profile = await getCurrentProfile();
  if (!profile || !CAN_SELL.includes(profile.role)) notFound();

  // A super admin has no branch of their own, so there is no till to stand at.
  // They review sales rather than take them.
  if (!profile.branch_id || !profile.branch) {
    return (
      <div className="space-y-6">
        <PageHeader title="Point of sale" />
        <EmptyState
          title="No branch assigned"
          description="Selling happens at a branch. Your account is not assigned to one, so there is no till to open."
          action={
            <Button asChild variant="outline">
              <Link href="/sales">View sales</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const supabase = await createClient();

  const [stock, { data: customers }] = await Promise.all([
    getSellableStock(),
    supabase
      .from("customers")
      .select("id, name, phone, email, due_amount")
      .is("deleted_at", null)
      .eq("is_active", true)
      .order("name")
      .limit(500),
  ]);

  if (stock.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Point of sale" description={profile.branch.name} />
        <EmptyState
          icon={Boxes}
          title="Nothing to sell"
          description="There is no unexpired stock at this branch. Record a purchase to put items on the shelf."
          action={
            <Button asChild>
              <Link href="/purchases/new">New Purchase</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Point of sale"
        description={`${profile.branch.name} · ${stock.length} batches available`}
      />
      <PosTerminal
        branchId={profile.branch_id}
        branchName={profile.branch.name}
        stock={stock}
        customers={(customers ?? []).map((c) => ({ ...c, due_amount: Number(c.due_amount) }))}
      />
    </div>
  );
}
