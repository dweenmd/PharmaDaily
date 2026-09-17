import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MedicineForm } from "@/features/medicines/components/medicine-form";
import { getCategories } from "@/features/medicines/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = {
  title: "Add medicine",
};

const CATALOGUE_EDITORS = ["super_admin", "branch_manager", "stock_manager"];

export default async function NewMedicinePage() {
  const profile = await getCurrentProfile();

  // Second line of defence. The medicines RLS policy would reject the insert
  // anyway; this just avoids showing a form that could never be submitted.
  if (!profile || !CATALOGUE_EDITORS.includes(profile.role)) notFound();

  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Add medicine"
        description="Catalogue details only — batches, quantities and prices are recorded when stock is purchased."
      />
      <MedicineForm categories={categories} />
    </div>
  );
}
