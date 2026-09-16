import { redirect } from "next/navigation";

import { getAccessibleBranches } from "@/features/branches/queries";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canSwitchBranch } from "@/lib/auth/roles";
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

  const branches = await getAccessibleBranches();

  return (
    <SidebarProvider>
      {/* Keyboard users land here first and can jump past the whole nav. */}
      <a
        href="#main-content"
        className="bg-background focus:ring-ring sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:border focus:px-3 focus:py-2 focus:text-sm focus:ring-2"
      >
        Skip to content
      </a>

      <AppSidebar role={profile.role} />

      <SidebarInset>
        <AppHeader
          name={profile.name}
          role={profile.role}
          branches={branches}
          activeBranchId={profile.branch_id}
          canSwitchBranch={canSwitchBranch(profile.role)}
        />

        <main id="main-content" className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
