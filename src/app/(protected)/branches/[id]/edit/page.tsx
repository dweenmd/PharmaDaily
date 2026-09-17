import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { BranchForm } from "@/features/branches/components/branch-form";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canManageBranches } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Edit branch",
};

export default async function EditBranchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const profile = await getCurrentProfile();
  if (!profile || !canManageBranches(profile.role)) notFound();

  const supabase = await createClient();
  const { data: branch } = await supabase
    .from("branches")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!branch) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/branches">
          <ArrowLeft className="size-4" />
          All branches
        </Link>
      </Button>

      <PageHeader title={branch.name} description={`Invoice prefix ${branch.code}`} />

      <BranchForm branch={branch} />
    </div>
  );
}
