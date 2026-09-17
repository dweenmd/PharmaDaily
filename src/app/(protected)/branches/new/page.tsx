import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { BranchForm } from "@/features/branches/components/branch-form";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canManageBranches } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Add branch",
};

export default async function NewBranchPage() {
  const profile = await getCurrentProfile();
  if (!profile || !canManageBranches(profile.role)) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/branches">
          <ArrowLeft className="size-4" />
          All branches
        </Link>
      </Button>

      <PageHeader
        title="Add branch"
        description="Stock, sales and staff are all scoped to a branch, so this is the first thing a new outlet needs."
      />

      <BranchForm />
    </div>
  );
}
