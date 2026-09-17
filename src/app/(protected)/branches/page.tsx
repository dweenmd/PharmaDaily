import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Plus } from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canManageBranches } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
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

export const metadata: Metadata = {
  title: "Branches",
};

export default async function BranchesPage() {
  const profile = await getCurrentProfile();
  if (!profile || !canManageBranches(profile.role)) notFound();

  // Includes inactive ones, which the shared getAccessibleBranches() filters
  // out — this is the screen where reactivating one has to be possible.
  const supabase = await createClient();
  const { data: branches } = await supabase
    .from("branches")
    .select("*")
    .is("deleted_at", null)
    .order("name");

  const rows = branches ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches"
        description="Every outlet in the chain. The code becomes each branch's invoice prefix."
        action={
          <Button asChild>
            <Link href="/branches/new">
              <Plus className="size-4" />
              Add Branch
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No branches yet"
          description="Add the first branch to start recording stock and sales against it."
          action={
            <Button asChild>
              <Link href="/branches/new">
                <Plus className="size-4" />
                Add Branch
              </Link>
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="hidden lg:table-cell">Address</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="hidden md:table-cell">Opened</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {branch.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden max-w-xs truncate text-sm lg:table-cell">
                      {branch.address ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                      {branch.phone ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                      {formatDate(branch.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={branch.is_active ? "default" : "outline"}>
                        {branch.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/branches/${branch.id}/edit`}>Edit</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
