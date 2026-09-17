import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { MedicineForm } from "@/features/medicines/components/medicine-form";
import { getCategories, getMedicineById } from "@/features/medicines/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

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
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/medicines">
          <ArrowLeft className="size-4" />
          All medicines
        </Link>
      </Button>

      <PageHeader title={medicine.name} description="Edit catalogue details." />
      <MedicineForm categories={categories} medicine={medicine} />
    </div>
  );
}
