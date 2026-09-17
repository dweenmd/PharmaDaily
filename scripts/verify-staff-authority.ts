/**
 * Proves the staff-management rules.
 *
 *     npm run verify:staff
 *
 * These rules matter more than any other authorisation code in the project,
 * because the actions that use them run with the SERVICE ROLE. Row Level
 * Security — which catches every other mistake by returning fewer rows than
 * intended — is switched off for them. Nothing else is checking.
 *
 * Pure functions, so no database is needed: this runs in a second and can be
 * run on every change.
 */
import { canActOn, canAssign, checkLockout, type Authority } from "../src/features/staff/authority";
import { type UserRole } from "../src/types";

let failures = 0;
let checks = 0;

function check(description: string, passed: boolean, detail?: string) {
  checks += 1;
  if (passed) {
    console.log(`  PASS  ${description}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${description}${detail ? ` (${detail})` : ""}`);
  }
}

const BRANCH_A = "11111111-1111-1111-1111-111111111111";
const BRANCH_B = "22222222-2222-2222-2222-222222222222";

const superAdmin: Authority = { actorId: "sa", isSuperAdmin: true, branchId: null };
const manager: Authority = { actorId: "mgr", isSuperAdmin: false, branchId: BRANCH_A };

function target(id: string, role: UserRole, branch: string | null, active = true) {
  return { id, role, branch_id: branch, is_active: active };
}

console.log("\n  What a branch manager may grant");

const escalations: UserRole[] = ["super_admin", "branch_manager"];
for (const role of escalations) {
  check(
    `cannot grant ${role}`,
    canAssign(manager, role, BRANCH_A) !== null,
    "a manager could mint an account above their own level",
  );
}

for (const role of ["cashier", "stock_manager", "pharmacist"] as UserRole[]) {
  check(`can grant ${role} at their own branch`, canAssign(manager, role, BRANCH_A) === null);
}

check("cannot grant any role at another branch", canAssign(manager, "cashier", BRANCH_B) !== null);

check("cannot create a branchless account", canAssign(manager, "cashier", null) !== null);

console.log("\n  What a super admin may grant");

check("can grant super_admin", canAssign(superAdmin, "super_admin", null) === null);
check("can grant any role at any branch", canAssign(superAdmin, "cashier", BRANCH_B) === null);
check(
  "still cannot leave a non-super-admin branchless",
  canAssign(superAdmin, "cashier", null) !== null,
  "branch-scoped RLS would match nothing and the account would see an empty system",
);

console.log("\n  Which accounts a branch manager may touch");

check("cannot act on a super admin", canActOn(manager, target("x", "super_admin", null)) !== null);
check(
  "cannot act on another branch manager",
  canActOn(manager, target("x", "branch_manager", BRANCH_A)) !== null,
);
check(
  "cannot act on staff at another branch",
  canActOn(manager, target("x", "cashier", BRANCH_B)) !== null,
);
check(
  "can act on a cashier at their own branch",
  canActOn(manager, target("x", "cashier", BRANCH_A)) === null,
);
check(
  "a super admin may act on anyone",
  canActOn(superAdmin, target("x", "super_admin", null)) === null,
);

console.log("\n  Lockout protection");

check(
  "nobody can deactivate their own account",
  checkLockout(
    manager,
    target("mgr", "branch_manager", BRANCH_A),
    { role: "branch_manager", isActive: false },
    5,
  ) !== null,
);

check(
  "a super admin cannot remove their own super admin role",
  checkLockout(
    superAdmin,
    target("sa", "super_admin", null),
    { role: "cashier", isActive: true },
    5,
  ) !== null,
);

check(
  "the last active super admin cannot be demoted",
  checkLockout(
    superAdmin,
    target("other", "super_admin", null),
    { role: "cashier", isActive: true },
    0,
  ) !== null,
  "there would be nobody left able to restore one",
);

check(
  "the last active super admin cannot be deactivated",
  checkLockout(
    superAdmin,
    target("other", "super_admin", null),
    { role: "super_admin", isActive: false },
    0,
  ) !== null,
);

check(
  "a super admin CAN be demoted while another remains",
  checkLockout(
    superAdmin,
    target("other", "super_admin", null),
    { role: "cashier", isActive: true },
    1,
  ) === null,
);

check(
  "an already-inactive super admin does not count as the last one",
  checkLockout(
    superAdmin,
    target("other", "super_admin", null, false),
    { role: "cashier", isActive: false },
    0,
  ) === null,
);

console.log(`\n  ${checks - failures}/${checks} checks passed.\n`);

if (failures > 0) {
  console.error("  STAFF AUTHORISATION IS NOT SOUND — do not deploy until these pass.\n");
  process.exit(1);
}
