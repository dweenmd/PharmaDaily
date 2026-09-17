import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileNameForm } from "@/features/profile/components/profile-name-form";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { createClient } from "@/lib/supabase/server";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/auth/roles";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordButton } from "@/features/profile/components/change-password-button";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Your profile" description="What the rest of the app knows about you." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <ProfileNameForm name={profile.name} />

          <div>
            <p className="text-muted-foreground text-xs">Email</p>
            <p className="text-sm">{user?.email ?? "—"}</p>
          </div>

          <div>
            <p className="text-muted-foreground text-xs">Role</p>
            <div className="flex items-center gap-2">
              <Badge variant={profile.role === "super_admin" ? "default" : "secondary"}>
                {ROLE_LABELS[profile.role]}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {ROLE_DESCRIPTIONS[profile.role]}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Set by an administrator — not something you can change yourself.
            </p>
          </div>

          <div>
            <p className="text-muted-foreground text-xs">Branch</p>
            <p className="text-sm">{profile.branch?.name ?? "All branches"}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground text-xs">Member since</p>
              <p className="text-sm">{formatDateTime(profile.created_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Last signed in</p>
              <p className="text-sm">
                {user?.last_sign_in_at ? formatDateTime(user.last_sign_in_at) : "This session"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Security</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordButton />
        </CardContent>
      </Card>
    </div>
  );
}
