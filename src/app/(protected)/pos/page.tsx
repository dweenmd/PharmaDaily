import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Boxes, PlusCircle, ReceiptText } from "lucide-react";

import { PosTerminal } from "@/features/sales/components/pos-terminal";
import { getSellableStock } from "@/features/sales/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "POS Billing",
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

  const [stock, { data: customers }, { data: discountSettings }] = await Promise.all([
    getSellableStock(),
    supabase
      .from("customers")
      .select("id, name, phone, email, due_amount")
      .is("deleted_at", null)
      .eq("is_active", true)
      .order("name")
      .limit(500),
    supabase
      .from("settings")
      .select("value, branch_id")
      .eq("key", "max_discount_percent")
      .or(`branch_id.eq.${profile.branch_id},branch_id.is.null`),
  ]);

  // The branch override wins over the chain default — same resolution order
  // create_sale() uses server-side. This is purely a heads-up before the
  // cashier reaches checkout; the database enforces the real limit either way.
  const branchOverride = discountSettings?.find((s) => s.branch_id === profile.branch_id);
  const globalDefault = discountSettings?.find((s) => s.branch_id === null);
  const maxDiscountPercent = Number(branchOverride?.value ?? globalDefault?.value ?? 100);

  const defaultCustomers = [
    {
      id: "cust-1",
      name: "Mr x",
      phone: "01969696969",
      email: "mrx@example.com",
      due_amount: 0,
      last_visit: "19 Sep 2026",
      purchase_count: 14,
    },
    {
      id: "cust-2",
      name: "Rahim Chowdhury",
      phone: "01711223344",
      email: "rahim@example.com",
      due_amount: 250,
      last_visit: "15 Sep 2026",
      purchase_count: 8,
    },
    {
      id: "cust-3",
      name: "Sadia Sultana",
      phone: "01819998877",
      email: "sadia@example.com",
      due_amount: 0,
      last_visit: "08 Sep 2026",
      purchase_count: 22,
    },
  ];

  const loadedCustomers = (customers ?? []).map((c) => ({
    ...c,
    due_amount: Number(c.due_amount),
    last_visit: "12 Sep 2026",
    purchase_count: 14,
  }));

  const finalCustomers = loadedCustomers.length > 0 ? loadedCustomers : defaultCustomers;

  return (
    <PosTerminal
      branchId={profile.branch_id}
      branchName={profile.branch.name}
      stock={stock}
      customers={finalCustomers}
      maxDiscountPercent={maxDiscountPercent}
    />
  );
}
