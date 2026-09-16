import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2, ShieldCheck, UserRound } from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, isSuperAdmin } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Phase 1 placeholder dashboard.
 *
 * It exists to prove the access model end to end: the identity, role and
 * branch shown here all came through RLS, and the branch list below is
 * whatever the database was willing to hand this particular user — not a
 * filtered-in-JavaScript view of everything.
 *
 * Phase 4 replaces the body with real KPIs.
 */
export default async function DashboardPage() {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name, code, phone, address")
    .is("deleted_at", null)
    .order("name");

  const visibleBranches = branches ?? [];
  const superAdmin = isSuperAdmin(profile.role);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {profile.name.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground text-sm">
          {superAdmin
            ? "You have access to every branch."
            : `You are signed in at ${profile.branch?.name ?? "an unassigned branch"}.`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1.5">
              <UserRound className="size-3.5" />
              Signed in as
            </CardDescription>
            <CardTitle className="text-lg">{profile.name}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" />
              Role
            </CardDescription>
            <CardTitle className="flex items-center gap-2 text-lg">
              {ROLE_LABELS[profile.role]}
              <Badge variant="secondary">{profile.role}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs">{ROLE_DESCRIPTIONS[profile.role]}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1.5">
              <Building2 className="size-3.5" />
              Branch
            </CardDescription>
            <CardTitle className="flex items-center gap-2 text-lg">
              {profile.branch?.name ?? (superAdmin ? "All branches" : "Not assigned")}
              {profile.branch && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  {profile.branch.code}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{superAdmin ? "All branches" : "Your branch"}</CardTitle>
          <CardDescription>
            This list comes straight from the database under Row Level Security — it contains
            exactly what your account is permitted to see.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {visibleBranches.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No branches yet"
              description={
                superAdmin
                  ? "Create your first branch to start adding stock and staff."
                  : "Your account is not linked to a branch yet. Ask an administrator to assign one."
              }
            />
          ) : (
            <ul className="divide-y">
              {visibleBranches.map((branch) => (
                <li key={branch.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{branch.name}</p>
                    {branch.address && (
                      <p className="text-muted-foreground truncate text-xs">{branch.address}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                    {branch.code}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
