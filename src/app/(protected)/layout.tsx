import { redirect } from "next/navigation";

import { getAccessibleBranches } from "@/features/branches/queries";
import { getNotifications } from "@/features/notifications/queries";
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

  // An invited account has a session but no password of its own yet — every
  // other page assumes a fully set-up account, so there is nowhere useful to
  // send them until this is done.
  if (!profile.password_set) redirect("/set-password");

  // Alerts are regenerated here rather than on a schedule: refresh_stock_alerts()
  // is idempotent, so calling it per page load is safe and needs no extra
  // infrastructure. A cron job can call the same function later.
  const [branches, notifications] = await Promise.all([
    getAccessibleBranches(),
    getNotifications(profile.branch_id),
  ]);

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
          notifications={notifications.map((n) => ({
            id: n.id,
            type: n.type,
            message: n.message,
            created_at: n.created_at,
          }))}
        />

        <main id="main-content" className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
