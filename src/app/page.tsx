import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/get-current-profile";

/**
 * Entry point. Middleware already bounces anonymous visitors to /login, so
 * this mainly handles the signed-in case — and the edge case of a valid
 * session whose profile has since been deactivated.
 */
export default async function RootPage() {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  redirect("/dashboard");
}
