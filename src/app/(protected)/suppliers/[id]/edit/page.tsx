import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { SupplierForm } from "@/features/suppliers/components/supplier-form";
import { getSupplierById } from "@/features/suppliers/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Edit supplier",
};

const CATALOGUE_EDITORS = ["super_admin", "branch_manager", "stock_manager"];

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile || !CATALOGUE_EDITORS.includes(profile.role)) notFound();

  const supplier = await getSupplierById(id);
  if (!supplier) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/suppliers">
          <ArrowLeft className="size-4" />
          All suppliers
        </Link>
      </Button>

      <PageHeader
        title={supplier.name}
        description={`Outstanding balance: ${formatCurrency(supplier.due_amount)}`}
      />
      <SupplierForm supplier={supplier} />
    </div>
  );
}
