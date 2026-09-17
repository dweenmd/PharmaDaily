import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { type MedicineCategoryRow, type MedicineRow } from "@/types";

export type MedicineWithCategory = MedicineRow & {
  category: Pick<MedicineCategoryRow, "id" | "name"> | null;
};

export type MedicineFilters = {
  search?: string;
  categoryId?: string;
  status?: "active" | "inactive" | "all";
};

/**
 * Medicine catalogue.
 *
 * Global to the chain — RLS lets every authenticated user read it, because a
 * cashier has to be able to find what they are selling. Filtering happens in
 * the database rather than in JavaScript so the list stays usable once a
 * pharmacy has a few thousand products.
 */
export const getMedicines = cache(
  async (filters: MedicineFilters = {}): Promise<MedicineWithCategory[]> => {
    const supabase = await createClient();

    let query = supabase
      .from("medicines")
      .select(
        `
          id, name, generic_name, brand_name, category_id, dosage_form, strength,
          unit, pack_size, barcode, manufacturer, prescription_required,
          controlled_drug, reorder_level, is_active, created_at, updated_at, deleted_at,
          category:medicine_categories ( id, name )
        `,
      )
      .is("deleted_at", null)
      .order("name");

    if (filters.categoryId) {
      query = query.eq("category_id", filters.categoryId);
    }

    if (filters.status === "active") query = query.eq("is_active", true);
    if (filters.status === "inactive") query = query.eq("is_active", false);

    if (filters.search) {
      // Escape the PostgREST or() separators before interpolating, so a comma
      // or parenthesis in a search term cannot break out of this filter and
      // rewrite the query.
      const term = filters.search.replace(/[,()]/g, " ").trim();
      if (term) {
        query = query.or(
          [
            `name.ilike.%${term}%`,
            `generic_name.ilike.%${term}%`,
            `brand_name.ilike.%${term}%`,
            `manufacturer.ilike.%${term}%`,
            `barcode.ilike.%${term}%`,
          ].join(","),
        );
      }
    }

    const { data, error } = await query.limit(500);
    if (error) return [];

    return (data ?? []).map((row) => ({
      ...row,
      category: Array.isArray(row.category) ? (row.category[0] ?? null) : row.category,
    })) as MedicineWithCategory[];
  },
);

export const getMedicineById = cache(async (id: string): Promise<MedicineWithCategory | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("medicines")
    .select(
      `
        id, name, generic_name, brand_name, category_id, dosage_form, strength,
        unit, pack_size, barcode, manufacturer, prescription_required,
        controlled_drug, reorder_level, is_active, created_at, updated_at, deleted_at,
        category:medicine_categories ( id, name )
      `,
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...data,
    category: Array.isArray(data.category) ? (data.category[0] ?? null) : data.category,
  } as MedicineWithCategory;
});

export const getCategories = cache(async (): Promise<MedicineCategoryRow[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("medicine_categories")
    .select("*")
    .eq("is_active", true)
    .order("name");

  return error ? [] : (data ?? []);
});
