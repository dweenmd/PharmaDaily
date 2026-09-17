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

  // Deleted child-first: foreign keys are ON DELETE RESTRICT precisely so that
  // production cannot orphan stock or ledger rows, which means the test
  // fixtures have to be unwound in dependency order too.
  const { data: testBranches } = await admin.from("branches").select("id").like("code", "RLS%");
  const branchIds = (testBranches ?? []).map((b) => b.id);

  if (branchIds.length > 0) {
    await admin.from("stock_movements").delete().in("branch_id", branchIds);
    await admin.from("stock_adjustments").delete().in("branch_id", branchIds);

    const { data: testPurchases } = await admin
      .from("purchases")
      .select("id")
      .in("branch_id", branchIds);
    const purchaseIds = (testPurchases ?? []).map((p) => p.id);
    if (purchaseIds.length > 0) {
      await admin.from("purchase_items").delete().in("purchase_id", purchaseIds);
      await admin.from("purchases").delete().in("id", purchaseIds);
    }

    await admin.from("branch_stocks").delete().in("branch_id", branchIds);
  }

  await admin.from("medicines").delete().like("name", "RLSTest%");
  await admin.from("suppliers").delete().like("name", "RLSTest%");
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
  // Phase 2 — inventory.
  //
  // These are the rows that actually matter commercially: cost prices, stock
  // levels and supplier invoices. If branch isolation leaks anywhere, it leaks
  // here.
  // =========================================================================
  console.log("\n  Phase 2 — catalogue and stock");

  const { data: medicine } = await admin
    .from("medicines")
    .insert({ name: "RLSTest Paracetamol", strength: "500mg", reorder_level: 10 })
    .select("id")
    .single();

  const { data: supplier } = await admin
    .from("suppliers")
    .insert({ name: "RLSTest Distributors" })
    .select("id")
    .single();

  if (!medicine || !supplier) throw new Error("catalogue fixture failed");

  // Stock at BOTH branches, so a leak shows up as branch A seeing B's row.
  const { data: stockRows } = await admin
    .from("branch_stocks")
    .insert([
      {
        branch_id: branchA.id,
        medicine_id: medicine.id,
        batch_no: "RLSBATCH-A",
        expiry_date: "2030-01-31",
        quantity: 50,
        purchase_price: 5,
        selling_price: 8,
        mrp: 10,
        supplier_id: supplier.id,
      },
      {
        branch_id: branchB.id,
        medicine_id: medicine.id,
        batch_no: "RLSBATCH-B",
        expiry_date: "2030-02-28",
        quantity: 70,
        purchase_price: 5,
        selling_price: 8,
        mrp: 10,
        supplier_id: supplier.id,
      },
    ])
    .select("id, branch_id, batch_no");

  if (!stockRows || stockRows.length !== 2) throw new Error("stock fixture failed");

  // A purchase at branch B, to prove the indirect (parent-scoped) policy on
  // purchase_items holds. That policy is the easiest one to get wrong, and
  // getting it wrong exposes every branch's cost prices chain-wide.
  const { data: purchaseB } = await admin
    .from("purchases")
    .insert({
      supplier_id: supplier.id,
      branch_id: branchB.id,
      invoice_no: "RLS-INV-B",
      total_amount: 350,
      paid_amount: 0,
      due_amount: 350,
    })
    .select("id")
    .single();

  if (!purchaseB) throw new Error("purchase fixture failed");

  await admin.from("purchase_items").insert({
    purchase_id: purchaseB.id,
    medicine_id: medicine.id,
    batch_no: "RLSBATCH-B",
    expiry_date: "2030-02-28",
    quantity: 70,
    cost_price: 5,
    selling_price: 8,
    mrp: 10,
  });

  // --- Branch manager A, looking at inventory -------------------------------
  const { data: aStock } = await a.from("branch_stocks").select("batch_no");
  check(
    "sees only their own branch's stock",
    aStock?.length === 1 && aStock[0]?.batch_no === "RLSBATCH-A",
    `got: ${JSON.stringify(aStock?.map((s) => s.batch_no))}`,
  );

  const { data: aPurchases } = await a.from("purchases").select("invoice_no");
  check(
    "cannot see another branch's purchases",
    !(aPurchases ?? []).some((p) => p.invoice_no === "RLS-INV-B"),
    `got: ${JSON.stringify(aPurchases?.map((p) => p.invoice_no))}`,
  );

  const { data: aPurchaseItems } = await a.from("purchase_items").select("id, cost_price");
  check(
    "cannot see another branch's cost prices via purchase_items",
    (aPurchaseItems?.length ?? 0) === 0,
    `got ${aPurchaseItems?.length ?? 0} line items`,
  );

  const { data: aMedicines } = await a.from("medicines").select("id").eq("id", medicine.id);
  check(
    "can read the shared medicine catalogue",
    (aMedicines?.length ?? 0) === 1,
    `got ${aMedicines?.length ?? 0} rows`,
  );

  // --- Branch manager A, trying to write across the boundary ----------------
  const otherBranchStockId = stockRows.find((s) => s.branch_id === branchB.id)!.id;

  const { error: crossStockWrite } = await a
    .from("branch_stocks")
    .update({ quantity: 9999 })
    .eq("id", otherBranchStockId);

  const { data: stockBAfter } = await admin
    .from("branch_stocks")
    .select("quantity")
    .eq("id", otherBranchStockId)
    .single();

  check(
    "cannot alter another branch's stock quantity",
    stockBAfter?.quantity === 70,
    `quantity is now ${stockBAfter?.quantity}, error was ${crossStockWrite?.message ?? "none"}`,
  );

  const { error: crossBranchPurchase } = await a.rpc("create_purchase", {
    p_branch_id: branchB.id,
    p_supplier_id: supplier.id,
    p_purchase_date: "2026-09-17",
    p_invoice_no: "RLS-INV-SMUGGLED",
    p_paid_amount: 0,
    p_items: [
      {
        medicine_id: medicine.id,
        batch_no: "RLSBATCH-X",
        expiry_date: "2030-06-30",
        quantity: 10,
        cost_price: 5,
        selling_price: 8,
        mrp: 10,
      },
    ],
  });

  check(
    "cannot record a purchase into another branch",
    crossBranchPurchase !== null,
    crossBranchPurchase ? undefined : "the RPC succeeded — branch isolation is broken",
  );

  // --- The ledger must be append-only ---------------------------------------
  const { data: movementFixture } = await admin
    .from("stock_movements")
    .insert({
      branch_id: branchA.id,
      medicine_id: medicine.id,
      batch_no: "RLSBATCH-A",
      type: "purchase",
      quantity: 50,
    })
    .select("id")
    .single();

  if (movementFixture) {
    const { error: ledgerUpdate } = await a
      .from("stock_movements")
      .update({ quantity: 1 })
      .eq("id", movementFixture.id);

    const { data: movementAfter } = await admin
      .from("stock_movements")
      .select("quantity")
      .eq("id", movementFixture.id)
      .single();

    check(
      "cannot rewrite a stock ledger entry",
      movementAfter?.quantity === 50,
      `quantity is now ${movementAfter?.quantity}, error was ${ledgerUpdate?.message ?? "none"}`,
    );

    const { error: ledgerDelete } = await a
      .from("stock_movements")
      .delete()
      .eq("id", movementFixture.id);

    const { count: movementCount } = await admin
      .from("stock_movements")
      .select("id", { count: "exact", head: true })
      .eq("id", movementFixture.id);

    check(
      "cannot delete a stock ledger entry",
      movementCount === 1,
      `row count is ${movementCount}, error was ${ledgerDelete?.message ?? "none"}`,
    );
  }

  // --- Stock cannot be driven negative --------------------------------------
  const { error: overRemove } = await a.rpc("create_stock_adjustment", {
    p_branch_id: branchA.id,
    p_medicine_id: medicine.id,
    p_batch_no: "RLSBATCH-A",
    p_type: "decrease",
    p_quantity: 999,
    p_reason: "RLS test over-removal",
  });

  check(
    "cannot remove more stock than exists",
    overRemove !== null,
    overRemove ? undefined : "the adjustment succeeded — stock could go negative",
  );

  // --- A cashier may read the catalogue but not edit it ---------------------
  const cashierEmail = `${PREFIX}-cashier@example.com`;
  await createStaff(cashierEmail, "Cashier A", "branch_manager", branchA.id);
  // Demote to cashier via the service role, which the escalation guard allows.
  await admin.from("profiles").update({ role: "cashier" }).eq("name", "Cashier A");

  const cashier = await signIn(cashierEmail);

  const { data: cashierMedicines } = await cashier.from("medicines").select("id");
  check(
    "a cashier can read the catalogue",
    (cashierMedicines?.length ?? 0) >= 1,
    `got ${cashierMedicines?.length ?? 0} rows`,
  );

  const { error: cashierMedicineInsert } = await cashier
    .from("medicines")
    .insert({ name: "RLSTest Rogue Medicine" });

  check(
    "a cashier cannot add to the catalogue",
    cashierMedicineInsert !== null,
    cashierMedicineInsert ? undefined : "the insert succeeded",
  );

  const { error: cashierPurchase } = await cashier.rpc("create_purchase", {
    p_branch_id: branchA.id,
    p_supplier_id: supplier.id,
    p_purchase_date: "2026-09-17",
    p_invoice_no: "RLS-INV-CASHIER",
    p_paid_amount: 0,
    p_items: [
      {
        medicine_id: medicine.id,
        batch_no: "RLSBATCH-C",
        expiry_date: "2030-06-30",
        quantity: 5,
        cost_price: 5,
        selling_price: 8,
        mrp: 10,
      },
    ],
  });

  check(
    "a cashier cannot record purchases",
    cashierPurchase !== null,
    cashierPurchase ? undefined : "the RPC succeeded",
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
