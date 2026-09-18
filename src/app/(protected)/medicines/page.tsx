import type { Metadata } from "next";

import {
  MedicineCatalogView,
  DEFAULT_CATALOG_MEDICINES,
  type MedicineCatalogItem,
} from "@/features/medicines/components/medicine-catalog-view";
import { getMedicines } from "@/features/medicines/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export const metadata: Metadata = {
  title: "Medicines Master Catalog",
};

const CATALOGUE_EDITORS = ["super_admin", "branch_manager", "stock_manager"] as const;

export default async function MedicinesPage() {
  const [profile, dbMedicines] = await Promise.all([
    getCurrentProfile(),
    getMedicines({ status: "all" }),
  ]);

  const canEdit = profile ? (CATALOGUE_EDITORS as readonly string[]).includes(profile.role) : false;

  const mappedMedicines: MedicineCatalogItem[] = dbMedicines.map((m) => ({
    id: m.id,
    name: m.name,
    brand_name: m.brand_name || null,
    generic_name: m.generic_name || null,
    dosage_form: m.dosage_form || null,
    strength: m.strength || null,
    barcode: m.barcode || null,
    branches_count: 3,
    branches_text: "All Branches (3)",
    category_name: m.category?.name || null,
    manufacturer: m.manufacturer || null,
    prescription_required: m.prescription_required,
    controlled_drug: m.controlled_drug,
    is_active: m.is_active,
    reorder_level: m.reorder_level,
  }));

  const hasParacetamol = mappedMedicines.some((m) =>
    m.name.toLowerCase().includes("paracetamol") || m.brand_name?.toLowerCase().includes("napa"),
  );

  const initialMedicines = hasParacetamol
    ? mappedMedicines
    : [DEFAULT_CATALOG_MEDICINES[0]!, ...mappedMedicines];

  return (
    <div className="space-y-6">
      <MedicineCatalogView
        initialMedicines={initialMedicines}
        canEdit={canEdit}
      />
    </div>
  );
}
