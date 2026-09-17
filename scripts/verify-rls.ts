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

    const { data: testSales } = await admin.from("sales").select("id").in("branch_id", branchIds);
    const saleIds = (testSales ?? []).map((s) => s.id);
    if (saleIds.length > 0) {
      const { data: returns } = await admin
        .from("sales_returns")
        .select("id")
        .in("sale_id", saleIds);
      const returnIds = (returns ?? []).map((r) => r.id);
      if (returnIds.length > 0) {
        await admin.from("sales_return_items").delete().in("return_id", returnIds);
        await admin.from("sales_returns").delete().in("id", returnIds);
      }
      await admin.from("payments").delete().in("sale_id", saleIds);
      await admin.from("sale_items").delete().in("sale_id", saleIds);
      await admin.from("sales").delete().in("id", saleIds);
    }

    const { data: testTransfers } = await admin
      .from("stock_transfers")
      .select("id")
      .or(
        branchIds.map((id) => `from_branch_id.eq.${id}`).join(",") +
          "," +
          branchIds.map((id) => `to_branch_id.eq.${id}`).join(","),
      );
    const transferIds = (testTransfers ?? []).map((t) => t.id);
    if (transferIds.length > 0) {
      await admin.from("stock_transfer_items").delete().in("transfer_id", transferIds);
      await admin.from("stock_transfers").delete().in("id", transferIds);
    }

    await admin.from("customer_payments").delete().in("branch_id", branchIds);
    await admin.from("supplier_payments").delete().in("branch_id", branchIds);
    await admin.from("invoice_counters").delete().in("branch_id", branchIds);
    await admin.from("notifications").delete().in("branch_id", branchIds);
    await admin.from("settings").delete().in("branch_id", branchIds);
    await admin.from("expenses").delete().in("branch_id", branchIds);

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

  await admin.from("customers").delete().like("name", "RLSTest%");
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

  // Branch B's manager: a transfer is the one row both ends may read, so
  // both ends have to be exercised.
  const b = await signIn(managerBEmail);

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
  // Phase 3 — sales.
  //
  // Takings, discounts and customer debt. Same isolation as stock, applied to
  // money, plus the append-only rules that stop a till being rewritten after
  // the fact.
  // =========================================================================
  console.log("\n  Phase 3 — sales and money");

  const { data: customer } = await admin
    .from("customers")
    .insert({ name: "RLSTest Customer", phone: `+8801${Date.now().toString().slice(-9)}` })
    .select("id")
    .single();

  if (!customer) throw new Error("customer fixture failed");

  // A completed sale at branch B, so branch A has something to fail to see.
  const { data: saleB } = await admin
    .from("sales")
    .insert({
      branch_id: branchB.id,
      customer_id: customer.id,
      invoice_no: "RLSB-2026-9001",
      subtotal: 100,
      discount: 0,
      total_amount: 100,
      paid_amount: 100,
      due_amount: 0,
    })
    .select("id")
    .single();

  if (!saleB) throw new Error("sale fixture failed");

  const { data: saleItemB } = await admin
    .from("sale_items")
    .insert({
      sale_id: saleB.id,
      medicine_id: medicine.id,
      branch_stock_id: stockRows.find((s) => s.branch_id === branchB.id)!.id,
      batch_no: "RLSBATCH-B",
      quantity: 10,
      unit_price: 10,
      total_price: 100,
    })
    .select("id")
    .single();

  const { data: paymentB } = await admin
    .from("payments")
    .insert({ sale_id: saleB.id, branch_id: branchB.id, method: "cash", amount: 100 })
    .select("id")
    .single();

  // --- Branch manager A looking at another branch's money ------------------
  const { data: aSales } = await a.from("sales").select("invoice_no");
  check(
    "cannot see another branch's sales",
    !(aSales ?? []).some((s) => s.invoice_no === "RLSB-2026-9001"),
    JSON.stringify(aSales?.map((s) => s.invoice_no)),
  );

  const { data: aSaleItems } = await a.from("sale_items").select("id");
  check(
    "cannot see another branch's sale lines",
    (aSaleItems?.length ?? 0) === 0,
    `got ${aSaleItems?.length ?? 0} rows`,
  );

  const { data: aPayments } = await a.from("payments").select("id");
  check(
    "cannot see another branch's takings",
    (aPayments?.length ?? 0) === 0,
    `got ${aPayments?.length ?? 0} rows`,
  );

  const { error: crossBranchSale } = await a.rpc("create_sale", {
    p_branch_id: branchB.id,
    p_customer_id: customer.id,
    p_discount: 0,
    p_items: [
      { branch_stock_id: stockRows.find((s) => s.branch_id === branchB.id)!.id, quantity: 1 },
    ],
    p_payments: [{ method: "cash", amount: 8 }],
  });

  check(
    "cannot ring up a sale at another branch",
    crossBranchSale !== null,
    crossBranchSale ? undefined : "the RPC succeeded",
  );

  // --- Money records must be append-only -----------------------------------
  if (paymentB) {
    const { error: paymentUpdate } = await a
      .from("payments")
      .update({ amount: 1 })
      .eq("id", paymentB.id);

    const { data: paymentAfter } = await admin
      .from("payments")
      .select("amount")
      .eq("id", paymentB.id)
      .single();

    check(
      "cannot rewrite a recorded payment",
      Number(paymentAfter?.amount) === 100,
      `amount is now ${paymentAfter?.amount}, error was ${paymentUpdate?.message ?? "none"}`,
    );

    const { error: paymentDelete } = await a.from("payments").delete().eq("id", paymentB.id);
    const { count: paymentCount } = await admin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("id", paymentB.id);

    check(
      "cannot delete a recorded payment",
      paymentCount === 1,
      `row count ${paymentCount}, error was ${paymentDelete?.message ?? "none"}`,
    );
  }

  if (saleItemB) {
    const { error: itemUpdate } = await a
      .from("sale_items")
      .update({ unit_price: 1 })
      .eq("id", saleItemB.id);

    const { data: itemAfter } = await admin
      .from("sale_items")
      .select("unit_price")
      .eq("id", saleItemB.id)
      .single();

    check(
      "cannot change what a customer was charged",
      Number(itemAfter?.unit_price) === 10,
      `unit_price is now ${itemAfter?.unit_price}, error was ${itemUpdate?.message ?? "none"}`,
    );
  }

  // --- The invoice counter must be unreachable -----------------------------
  const { data: counters, error: counterError } = await a.from("invoice_counters").select("*");
  check(
    "cannot read or rewind the invoice counter",
    counterError !== null || (counters?.length ?? 0) === 0,
    `got ${counters?.length ?? 0} rows`,
  );

  // --- A stock manager must not handle money -------------------------------
  const stockManagerEmail = `${PREFIX}-stockman@example.com`;
  await createStaff(stockManagerEmail, "Stock Manager A", "branch_manager", branchA.id);
  await admin.from("profiles").update({ role: "stock_manager" }).eq("name", "Stock Manager A");

  const stockManager = await signIn(stockManagerEmail);

  const { error: stockManagerSale } = await stockManager.rpc("create_sale", {
    p_branch_id: branchA.id,
    p_customer_id: null as unknown as string,
    p_discount: 0,
    p_items: [
      { branch_stock_id: stockRows.find((s) => s.branch_id === branchA.id)!.id, quantity: 1 },
    ],
    p_payments: [{ method: "cash", amount: 8 }],
  });

  check(
    "a stock manager cannot take payment",
    stockManagerSale !== null,
    stockManagerSale ? undefined : "the RPC succeeded — refunds would be reachable too",
  );

  // --- Customers are deliberately global ------------------------------------
  const { data: aCustomers } = await a.from("customers").select("id").eq("id", customer.id);
  check(
    "customers are shared across branches by design",
    (aCustomers?.length ?? 0) === 1,
    `got ${aCustomers?.length ?? 0} rows`,
  );

  // =========================================================================
  // Phase 4 — reporting, settings and alerts.
  //
  // The report functions take a branch id as an argument, which is exactly the
  // shape of parameter that usually becomes an access-control hole. They are
  // SECURITY INVOKER, so the argument can only narrow what RLS already allows —
  // these checks are what prove that claim.
  // =========================================================================
  console.log("\n  Phase 4 — reports, settings and alerts");

  const { data: aKpisOwn } = await a.rpc("dashboard_kpis", {
    p_date: "2026-09-17",
    p_branch_id: branchA.id,
  });

  check(
    "can run reports for their own branch",
    Array.isArray(aKpisOwn) && aKpisOwn.length === 1,
    `got ${JSON.stringify(aKpisOwn)}`,
  );

  // Asking for branch B by id. The function does not refuse — it returns the
  // report as computed over rows the caller may see, which is none of them.
  const { data: aKpisOther } = await a.rpc("dashboard_kpis", {
    p_date: "2026-09-17",
    p_branch_id: branchB.id,
  });

  check(
    "a report for another branch comes back empty, not populated",
    Array.isArray(aKpisOther) &&
      aKpisOther.length === 1 &&
      Number(aKpisOther[0]?.revenue ?? 0) === 0 &&
      Number(aKpisOther[0]?.sales_count ?? 0) === 0,
    `got ${JSON.stringify(aKpisOther)}`,
  );

  const { data: aSalesReport } = await a.rpc("sales_report", {
    p_from: "2000-01-01",
    p_to: "2100-01-01",
    p_branch_id: branchB.id,
    p_cashier_id: null as unknown as string,
    p_payment_method: null as unknown as "cash",
  });

  check(
    "cannot pull another branch's invoices through the report function",
    (aSalesReport?.length ?? 0) === 0,
    `got ${aSalesReport?.length ?? 0} rows`,
  );

  const { data: aStockReport } = await a.rpc("stock_report", {
    p_branch_id: null as unknown as string,
  });

  check(
    "an unfiltered stock report still only covers their own branch",
    (aStockReport ?? []).every((r) => r.branch_id === branchA.id),
    `branches in result: ${JSON.stringify([...new Set((aStockReport ?? []).map((r) => r.branch_code))])}`,
  );

  // --- Alerts must be generated, never forged --------------------------------
  //
  // Forced rather than hoped for: the fixture medicine has 50 in stock, so its
  // reorder level is pushed above that to guarantee the generator produces a
  // low-stock alert. A check that silently skips protects nothing.
  await admin.from("medicines").update({ reorder_level: 9999 }).eq("id", medicine.id);
  await a.rpc("refresh_stock_alerts", { p_branch_id: branchA.id });

  const { error: forgeAlert } = await a.from("notifications").insert({
    branch_id: branchA.id,
    type: "system",
    message: "Forged alert",
    dedupe_key: "forged:1",
  });

  check(
    "cannot create a notification by hand",
    forgeAlert !== null,
    forgeAlert ? undefined : "an alert could be forged",
  );

  const { data: existingAlert } = await admin
    .from("notifications")
    .select("id, message")
    .eq("branch_id", branchA.id)
    .limit(1)
    .maybeSingle();

  check(
    "the generator actually produced an alert",
    existingAlert !== null && existingAlert !== undefined,
    "no alert was generated, so the next two checks would have been skipped",
  );

  if (existingAlert) {
    const { error: rewriteAlert } = await a
      .from("notifications")
      .update({ message: "Nothing to see here" })
      .eq("id", existingAlert.id);

    const { data: alertAfter } = await admin
      .from("notifications")
      .select("message")
      .eq("id", existingAlert.id)
      .single();

    check(
      "cannot reword an inconvenient alert",
      alertAfter?.message === existingAlert.message,
      `message is now "${alertAfter?.message}", error was ${rewriteAlert?.message ?? "none"}`,
    );

    const { error: markRead } = await a
      .from("notifications")
      .update({ is_read: true })
      .eq("id", existingAlert.id);

    check("can still mark an alert as read", markRead === null, markRead?.message);
  }

  // --- Balances are derived, not writable -----------------------------------
  // (stockManager is created in the Phase 3 section above.)
  //
  // These were exploitable before the payment-ledger migration: the UPDATE
  // grant covered every column, so anyone who could edit a customer could set
  // their debt to zero. Column-level grants now stop it at the privilege
  // layer, before RLS is even consulted.
  // A real credit sale, because the balance is now DERIVED — poking due_amount
  // directly would be a fiction that the next recompute erases. This is also
  // what makes the payment check below meaningful.
  const { data: creditSale } = await admin
    .from("sales")
    .insert({
      branch_id: branchA.id,
      customer_id: customer.id,
      invoice_no: "RLSA-2026-9500",
      subtotal: 5000,
      discount: 0,
      total_amount: 5000,
      paid_amount: 0,
      due_amount: 5000,
    })
    .select("id")
    .single();

  if (!creditSale) throw new Error("credit sale fixture failed");
  await admin.rpc("recompute_customer_balance", { p_customer_id: customer.id });

  const { error: wipeCustomerDebt } = await cashier
    .from("customers")
    .update({ due_amount: 0 })
    .eq("id", customer.id);

  const { data: customerAfter } = await admin
    .from("customers")
    .select("due_amount")
    .eq("id", customer.id)
    .single();

  check(
    "a cashier cannot wipe a customer's debt",
    Number(customerAfter?.due_amount) === 5000,
    `balance is now ${customerAfter?.due_amount}, error was ${wipeCustomerDebt?.message ?? "none"}`,
  );

  // Same again on the supplier side: an unpaid purchase, not a poked column.
  await admin.from("purchases").insert({
    supplier_id: supplier.id,
    branch_id: branchA.id,
    invoice_no: "RLS-INV-CREDIT",
    total_amount: 8000,
    paid_amount: 0,
    due_amount: 8000,
  });
  await admin.rpc("recompute_supplier_balance", { p_supplier_id: supplier.id });

  // Compared against what the balance actually is rather than a hard-coded
  // figure: earlier fixtures in this run also owe this supplier, and a test
  // that assumes otherwise fails for the wrong reason.
  const { data: supplierBefore } = await admin
    .from("suppliers")
    .select("due_amount")
    .eq("id", supplier.id)
    .single();

  const { error: wipeSupplierDebt } = await stockManager
    .from("suppliers")
    .update({ due_amount: 0 })
    .eq("id", supplier.id);

  const { data: supplierAfter } = await admin
    .from("suppliers")
    .select("due_amount")
    .eq("id", supplier.id)
    .single();

  check(
    "a stock manager cannot hide what the business owes a supplier",
    Number(supplierAfter?.due_amount) === Number(supplierBefore?.due_amount) &&
      Number(supplierAfter?.due_amount) > 0,
    `balance went ${supplierBefore?.due_amount} -> ${supplierAfter?.due_amount}, error was ${wipeSupplierDebt?.message ?? "none"}`,
  );

  // Editing the contact details IS allowed — a cashier fixing a typo'd phone
  // number is routine. Only the money columns are frozen.
  const { error: renameCustomer } = await cashier
    .from("customers")
    .update({ phone: "+8801700000000" })
    .eq("id", customer.id);

  check(
    "but can still correct a customer's contact details",
    renameCustomer === null,
    renameCustomer?.message,
  );

  // Recording a payment is the sanctioned way to reduce a balance, and it
  // cannot be used to take more than is owed.
  const { error: overPayment } = await cashier.rpc("record_customer_payment", {
    p_customer_id: customer.id,
    p_branch_id: branchA.id,
    p_amount: 999999,
    p_method: "cash",
  });

  check(
    "cannot record a payment larger than the debt",
    overPayment !== null,
    overPayment ? undefined : "the balance could be driven negative",
  );

  const { error: goodPayment } = await cashier.rpc("record_customer_payment", {
    p_customer_id: customer.id,
    p_branch_id: branchA.id,
    p_amount: 2000,
    p_method: "cash",
  });

  const { data: afterPayment } = await admin
    .from("customers")
    .select("due_amount")
    .eq("id", customer.id)
    .single();

  check(
    "recording a payment reduces the balance",
    goodPayment === null && Number(afterPayment?.due_amount) === 3000,
    `balance is ${afterPayment?.due_amount}, error was ${goodPayment?.message ?? "none"}`,
  );

  const { error: cashierPaysSupplier } = await cashier.rpc("record_supplier_payment", {
    p_supplier_id: supplier.id,
    p_branch_id: branchA.id,
    p_amount: 100,
    p_method: "cash",
  });

  check(
    "a cashier cannot pay a supplier",
    cashierPaysSupplier !== null,
    cashierPaysSupplier ? undefined : "the payment went through",
  );

  // --- Transfers are the one row two branches may both see ------------------
  //
  // Everywhere else, a row belongs to exactly one branch. A transfer is about
  // two of them, so both ends can read it — and a third branch still cannot.
  const { data: transferAB } = await admin
    .from("stock_transfers")
    .insert({
      from_branch_id: branchA.id,
      to_branch_id: branchB.id,
      reference_no: `RLS-TRF-${Date.now().toString().slice(-6)}`,
      transferred_by: null,
    })
    .select("id")
    .single();

  if (transferAB) {
    const { data: aSees } = await a.from("stock_transfers").select("id").eq("id", transferAB.id);

    check(
      "the sending branch sees its own outgoing transfer",
      (aSees?.length ?? 0) === 1,
      `got ${aSees?.length ?? 0} rows`,
    );

    const { data: bSees } = await b.from("stock_transfers").select("id").eq("id", transferAB.id);

    check(
      "the receiving branch sees the transfer coming to it",
      (bSees?.length ?? 0) === 1,
      `got ${bSees?.length ?? 0} rows`,
    );

    // A cashier at branch A is still at branch A, so they see it — the scope
    // is the branch, not the role. What they cannot do is act on it.
    const { error: cashierApproves } = await cashier.rpc("approve_stock_transfer", {
      p_transfer_id: transferAB.id,
    });

    check(
      "a cashier cannot dispatch stock to another branch",
      cashierApproves !== null,
      cashierApproves ? undefined : "the transfer was approved",
    );

    const { error: uninvolvedRequest } = await b.rpc("create_stock_transfer", {
      p_from_branch_id: branchA.id,
      p_to_branch_id: branchB.id,
      p_items: [
        { source_stock_id: stockRows.find((s) => s.branch_id === branchA.id)!.id, quantity: 1 },
      ],
      p_notes: null as unknown as string,
    });

    check(
      "a branch cannot help itself to another branch's stock by requesting a transfer",
      uninvolvedRequest !== null,
      uninvolvedRequest ? undefined : "branch B pulled stock out of branch A",
    );
  }

  // --- Settings are a manager's call ----------------------------------------
  const { error: cashierSetting } = await cashier.from("settings").insert({
    branch_id: branchA.id,
    key: "near_expiry_days",
    value: "1",
  });

  check(
    "a cashier cannot change the alert thresholds",
    cashierSetting !== null,
    cashierSetting ? undefined : "a cashier rewrote what the business reorders",
  );

  const { data: globalSettings } = await cashier
    .from("settings")
    .select("key")
    .is("branch_id", null);

  check(
    "everyone can read the global settings the screens depend on",
    (globalSettings?.length ?? 0) > 0,
    `got ${globalSettings?.length ?? 0} rows`,
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
