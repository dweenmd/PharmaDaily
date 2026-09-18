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
      {/* Modern POS Counter Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-3.5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              POS Billing Terminal
            </h1>
            <Badge
              variant="outline"
              className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs px-2.5 py-0.5"
            >
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Counter Ready
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
            <span className="font-semibold text-foreground/85">{profile.branch.name}</span>
            <span>•</span>
            <span className="text-primary font-medium">{stock.length} batches available in stock</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Link href="/sales">
              <ReceiptText className="size-3.5 text-muted-foreground" />
              Sales History
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Link href="/stock">
              <Boxes className="size-3.5 text-muted-foreground" />
              Inventory Stock
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="hidden md:inline-flex h-8 gap-1.5 text-xs">
            <Link href="/purchases/new">
              <PlusCircle className="size-3.5 text-muted-foreground" />
              New Consignment
            </Link>
          </Button>
        </div>
      </div>

      <PosTerminal
        branchId={profile.branch_id}
        branchName={profile.branch.name}
        stock={stock}
        customers={(customers ?? []).map((c) => ({ ...c, due_amount: Number(c.due_amount) }))}
        maxDiscountPercent={maxDiscountPercent}
      />
    </div>
  );
}
