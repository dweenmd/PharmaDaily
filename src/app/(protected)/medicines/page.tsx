import type { Metadata } from "next";
import Link from "next/link";
import { FileWarning, Pill, Plus, ShieldAlert } from "lucide-react";

import { MedicineFilters } from "@/features/medicines/components/medicine-filters";
import { getCategories, getMedicines } from "@/features/medicines/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { EmptyState, NoResultsState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "Medicines",
};

const CATALOGUE_EDITORS = ["super_admin", "branch_manager", "stock_manager"] as const;

export default async function MedicinesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : undefined;
  const categoryId = typeof params.category === "string" ? params.category : undefined;
  const statusParam = typeof params.status === "string" ? params.status : "active";
  const status = statusParam === "inactive" || statusParam === "all" ? statusParam : "active";

  const [profile, categories, medicines] = await Promise.all([
    getCurrentProfile(),
    getCategories(),
    getMedicines({ search, categoryId, status }),
  ]);

  // Presentation only — the RLS policy on medicines is what actually decides
  // whether an insert or update is allowed.
  const canEdit = profile ? (CATALOGUE_EDITORS as readonly string[]).includes(profile.role) : false;

  const isFiltered = Boolean(search || categoryId) || status !== "active";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medicines"
        description="The product catalogue, shared across every branch."
        action={
          canEdit ? (
            <Button asChild>
              <Link href="/medicines/new">
                <Plus className="size-4" />
                Add Medicine
              </Link>
            </Button>
          ) : undefined
        }
      />

      <MedicineFilters categories={categories} />

      {medicines.length === 0 ? (
        isFiltered ? (
          <NoResultsState entity="medicines" />
        ) : (
          <EmptyState
            icon={Pill}
            title="No medicines found"
            description="Add your first medicine to start recording purchases and selling at the counter."
            action={
              canEdit ? (
                <Button asChild>
                  <Link href="/medicines/new">
                    <Plus className="size-4" />
                    Add Medicine
                  </Link>
                </Button>
              ) : undefined
            }
          />
        )
      ) : (
        <Card className="overflow-hidden py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="hidden lg:table-cell">Manufacturer</TableHead>
                  <TableHead className="hidden sm:table-cell">Pack</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="w-16" />}
                </TableRow>
              </TableHeader>

              <TableBody>
                {medicines.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-medium">{m.name}</span>
                            {m.strength && (
                              <span className="text-muted-foreground text-xs">{m.strength}</span>
                            )}
                          </div>
                          {m.generic_name && (
                            <p className="text-muted-foreground truncate text-xs">
                              {m.generic_name}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 gap-1">
                          {m.prescription_required && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-amber-600 dark:text-amber-500">
                                  <FileWarning className="size-3.5" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Prescription required</TooltipContent>
                            </Tooltip>
                          )}
                          {m.controlled_drug && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-red-600 dark:text-red-500">
                                  <ShieldAlert className="size-3.5" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Controlled drug</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                      {m.category ? (
                        <Badge variant="secondary">{m.category.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-muted-foreground hidden truncate text-sm lg:table-cell">
                      {m.manufacturer ?? "—"}
                    </TableCell>

                    <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                      {[m.dosage_form, m.pack_size].filter(Boolean).join(" · ") || "—"}
                    </TableCell>

                    <TableCell>
                      <Badge variant={m.is_active ? "default" : "outline"}>
                        {m.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>

                    {canEdit && (
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/medicines/${m.id}/edit`}>Edit</Link>
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {medicines.length >= 500 && (
        <p className="text-muted-foreground text-center text-xs">
          Showing the first 500 matches. Narrow the search to see more.
        </p>
      )}
    </div>
  );
}
