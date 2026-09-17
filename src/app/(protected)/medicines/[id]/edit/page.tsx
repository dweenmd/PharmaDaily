import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MedicineForm } from "@/features/medicines/components/medicine-form";
import { getCategories, getMedicineById } from "@/features/medicines/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = {
  title: "Edit medicine",
};

const CATALOGUE_EDITORS = ["super_admin", "branch_manager", "stock_manager"];

export default async function EditMedicinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();

  if (!profile || !CATALOGUE_EDITORS.includes(profile.role)) notFound();

  const [medicine, categories] = await Promise.all([getMedicineById(id), getCategories()]);

  if (!medicine) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={medicine.name} description="Edit catalogue details." />
      <MedicineForm categories={categories} medicine={medicine} />
    </div>
  );
}
