import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canSwitchBranch } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/shared/app-header";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/**
 * Shell for every authenticated route.
 *
 * The redirect here backs up the middleware check rather than replacing it:
 * middleware catches the common case cheaply at the edge, while this catches
 * the cases middleware cannot see — a session whose profile was deactivated
 * or soft-deleted after the cookie was issued.
 *
 * Neither is the security boundary. Row Level Security is: a request that
 * somehow slipped past both still reads nothing it should not.
 */
export default async function ProtectedLayout({ children }: LayoutProps<"/">) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");

  // RLS decides what comes back: a super admin sees every live branch, anyone
  // else sees exactly their own. No role check is needed in this query — that
  // is the point of enforcing isolation in the database.
  const supabase = await createClient();
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name, code")
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("name");

  return (
    <SidebarProvider>
      <AppSidebar role={profile.role} />

      <SidebarInset>
        <AppHeader
          name={profile.name}
          role={profile.role}
          branches={branches ?? []}
          activeBranchId={profile.branch_id}
          canSwitchBranch={canSwitchBranch(profile.role)}
        />

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
