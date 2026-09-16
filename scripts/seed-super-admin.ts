/**
 * Creates the first super admin.
 *
 *     npm run seed:admin
 *
 * Chicken-and-egg problem this solves: profiles can only be promoted by a
 * super admin or the service role, and handle_new_user() deliberately refuses
 * to read a role from signup metadata. So the very first privileged account
 * has to be minted out of band, by something holding the service-role key.
 *
 * Deliberately NOT an API route or an admin page — a "create the first super
 * admin" endpoint that exists in production is a backdoor waiting to be found.
 *
 * Every later "add employee" flow follows the same two steps as this script:
 * create the auth user via the admin API, then set role/branch with the
 * service-role client.
 */
import { config } from "dotenv";

import { adminClient } from "./_env";

config({ path: ".env.local", quiet: true });

const email = process.env.SEED_SUPER_ADMIN_EMAIL;
const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
const name = process.env.SEED_SUPER_ADMIN_NAME ?? "System Administrator";

async function main() {
  if (!email || !password) {
    console.error(
      "\n  Set SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD in .env.local first.\n",
    );
    process.exit(1);
  }

  if (password.length < 12) {
    console.error("\n  Use a password of at least 12 characters for the super admin account.\n");
    process.exit(1);
  }

  const supabase = adminClient();

  console.log(`\n  Creating super admin: ${email}`);

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    // No inbox to confirm from on a local or internal deployment, and the
    // account is being created by an administrator who already trusts it.
    email_confirm: true,
    user_metadata: { name },
  });

  let authId = created?.user?.id;

  if (createError) {
    // Re-running the script should promote the existing account rather than
    // failing, so it stays usable for recovering a locked-out admin.
    if (!/already been registered|already exists/i.test(createError.message)) {
      console.error(`\n  Could not create the auth user: ${createError.message}\n`);
      process.exit(1);
    }

    console.log("  Auth user already exists — promoting the existing account.");

    const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listError) {
      console.error(`\n  Could not look up the existing user: ${listError.message}\n`);
      process.exit(1);
    }

    authId = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
  }

  if (!authId) {
    console.error("\n  Could not determine the auth user id.\n");
    process.exit(1);
  }

  // handle_new_user() has already inserted an inactive, branchless profile.
  // Promote it. This passes the escalation guard because the request carries
  // the service_role JWT.
  const { data: profile, error: updateError } = await supabase
    .from("profiles")
    .update({ role: "super_admin", branch_id: null, is_active: true, name, deleted_at: null })
    .eq("auth_id", authId)
    .select("id, name, role, is_active")
    .single();

  if (updateError) {
    console.error(`\n  Could not promote the profile: ${updateError.message}\n`);
    process.exit(1);
  }

  console.log(`
  Super admin ready.

    email    ${email}
    name     ${profile.name}
    role     ${profile.role}
    active   ${profile.is_active}

  Sign in at /login, then change this password and clear
  SEED_SUPER_ADMIN_PASSWORD from .env.local.
`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
