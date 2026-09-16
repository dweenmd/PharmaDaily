/**
 * Proves branch isolation is enforced by the DATABASE, not by the UI.
 *
 *     npm run verify:rls
 *
 * This is a regression test, not a one-off. Re-run it after every migration
 * that adds a table or touches a policy — including in Phases 2-6, extended
 * with the new tables. If it ever fails, one branch can read another branch's
 * data, which for a pharmacy chain means leaked sales figures and customer
 * records.
 *
 * It talks to PostgREST over the ANON key with a real signed-in session, so
 * what it exercises is precisely what a browser (or a hand-rolled curl
 * request) would get. Nothing is mocked.
 *
 * Run it against a LOCAL or STAGING database — it creates and deletes test
 * users and branches.
 */
import { adminClient, anonClient } from "./_env";

const PREFIX = "rlstest";
const PASSWORD = "rls-verify-password-2026";

let failures = 0;
let checks = 0;

function check(description: string, passed: boolean, detail?: string) {
  checks += 1;
  if (passed) {
    console.log(`  PASS  ${description}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${description}${detail ? `\n          ${detail}` : ""}`);
  }
}

async function createStaff(
  email: string,
  name: string,
  role: "branch_manager" | "super_admin",
  branchId: string | null,
) {
  const admin = adminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name },
  });

  if (error || !data.user) throw new Error(`createUser(${email}): ${error?.message}`);

  // Same two-step provisioning the real admin flow uses: the trigger makes an
  // inert profile, then a service-role update assigns role and branch.
  const { error: promoteError } = await admin
    .from("profiles")
    .update({ role, branch_id: branchId, is_active: true })
    .eq("auth_id", data.user.id);

  if (promoteError) throw new Error(`promote(${email}): ${promoteError.message}`);

  return data.user.id;
}

async function signIn(email: string) {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`signIn(${email}): ${error.message}`);
  return client;
}

async function cleanup() {
  const admin = adminClient();

  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const user of list?.users ?? []) {
    if (user.email?.startsWith(PREFIX)) {
      await admin.auth.admin.deleteUser(user.id);
    }
  }

  await admin.from("branches").delete().like("code", "RLS%");
}

async function main() {
  const admin = adminClient();

  console.log("\n  Setting up fixtures…");
  await cleanup();

  const { data: branches, error: branchError } = await admin
    .from("branches")
    .insert([
      { name: "RLS Test Branch A", code: "RLSA" },
      { name: "RLS Test Branch B", code: "RLSB" },
    ])
    .select("id, code");

  if (branchError || !branches || branches.length !== 2) {
    throw new Error(`branch fixture failed: ${branchError?.message}`);
  }

  const branchA = branches.find((b) => b.code === "RLSA")!;
  const branchB = branches.find((b) => b.code === "RLSB")!;

  const managerAEmail = `${PREFIX}-manager-a@example.com`;
  const managerBEmail = `${PREFIX}-manager-b@example.com`;
  const adminEmail = `${PREFIX}-super@example.com`;

  await createStaff(managerAEmail, "Manager A", "branch_manager", branchA.id);
  const managerBId = await createStaff(managerBEmail, "Manager B", "branch_manager", branchB.id);
  await createStaff(adminEmail, "Test Super Admin", "super_admin", null);

  // =========================================================================
  console.log("\n  Branch manager A (scoped to branch A)");
  // =========================================================================
  const a = await signIn(managerAEmail);

  const { data: aBranches } = await a.from("branches").select("id, code");
  check(
    "sees only their own branch",
    aBranches?.length === 1 && aBranches[0]?.code === "RLSA",
    `got: ${JSON.stringify(aBranches?.map((b) => b.code))}`,
  );

  const { data: aProfiles } = await a.from("profiles").select("id, auth_id, name, branch_id");
  check(
    "cannot see staff from another branch",
    !aProfiles?.some((p) => p.auth_id === managerBId),
    `got ${aProfiles?.length ?? 0} profile rows`,
  );

  const { error: escalationError } = await a
    .from("profiles")
    .update({ role: "super_admin" })
    .eq("auth_id", (await a.auth.getUser()).data.user!.id);

  check(
    "cannot promote themselves to super admin",
    escalationError !== null,
    escalationError ? undefined : "the update succeeded — privilege escalation is possible",
  );

  const { error: insertBranchError } = await a
    .from("branches")
    .insert({ name: "Rogue Branch", code: "RLSX" });

  check(
    "cannot create a branch",
    insertBranchError !== null,
    insertBranchError ? undefined : "the insert succeeded",
  );

  const { data: crossBranchRead } = await a.from("branches").select("id").eq("id", branchB.id);
  check(
    "cannot read another branch by guessing its id",
    (crossBranchRead?.length ?? 0) === 0,
    `got ${crossBranchRead?.length ?? 0} rows`,
  );

  const { error: crossBranchWrite } = await a
    .from("branches")
    .update({ name: "Hijacked" })
    .eq("id", branchB.id);
  const { data: branchBAfter } = await admin
    .from("branches")
    .select("name")
    .eq("id", branchB.id)
    .single();

  check(
    "cannot rename another branch",
    branchBAfter?.name === "RLS Test Branch B",
    `name is now ${branchBAfter?.name}, error was ${crossBranchWrite?.message ?? "none"}`,
  );

  // =========================================================================
  console.log("\n  Super admin");
  // =========================================================================
  const sa = await signIn(adminEmail);

  const { data: saBranches } = await sa.from("branches").select("code");
  const saCodes = (saBranches ?? []).map((b) => b.code);
  check(
    "sees every branch",
    saCodes.includes("RLSA") && saCodes.includes("RLSB"),
    `got: ${JSON.stringify(saCodes)}`,
  );

  const { error: saInsertError } = await sa
    .from("branches")
    .insert({ name: "Admin Created", code: "RLSC" });
  check("can create a branch", saInsertError === null, saInsertError?.message);

  // =========================================================================
  console.log("\n  Anonymous (no session)");
  // =========================================================================
  const anon = anonClient();

  const { data: anonBranches } = await anon.from("branches").select("id");
  check(
    "reads no branches at all",
    (anonBranches?.length ?? 0) === 0,
    `got ${anonBranches?.length ?? 0} rows`,
  );

  const { data: anonProfiles } = await anon.from("profiles").select("id");
  check(
    "reads no profiles at all",
    (anonProfiles?.length ?? 0) === 0,
    `got ${anonProfiles?.length ?? 0} rows`,
  );

  // =========================================================================
  console.log("\n  Deactivated account");
  // =========================================================================
  const deactivatedEmail = `${PREFIX}-deactivated@example.com`;
  await createStaff(deactivatedEmail, "Deactivated User", "branch_manager", branchA.id);
  const deactivated = await signIn(deactivatedEmail);

  await admin.from("profiles").update({ is_active: false }).eq("name", "Deactivated User");

  const { data: deactivatedBranches } = await deactivated.from("branches").select("id");
  check(
    "loses all access once deactivated, even with a live session",
    (deactivatedBranches?.length ?? 0) === 0,
    `got ${deactivatedBranches?.length ?? 0} rows`,
  );

  console.log("\n  Cleaning up…");
  await cleanup();

  console.log(`\n  ${checks - failures}/${checks} checks passed.\n`);

  if (failures > 0) {
    console.error("  RLS IS NOT WATERTIGHT — do not deploy until these pass.\n");
    process.exit(1);
  }
}

main().catch(async (error) => {
  console.error(`\n  ${error instanceof Error ? error.message : error}\n`);
  await cleanup().catch(() => {});
  process.exit(1);
});
