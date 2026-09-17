import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SupplierForm } from "@/features/suppliers/components/supplier-form";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = {
  title: "Add supplier",
};

const CATALOGUE_EDITORS = ["super_admin", "branch_manager", "stock_manager"];

export default async function NewSupplierPage() {
  const profile = await getCurrentProfile();
  if (!profile || !CATALOGUE_EDITORS.includes(profile.role)) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Add supplier" description="A distributor the pharmacy buys stock from." />
      <SupplierForm />
    </div>
  );
}
