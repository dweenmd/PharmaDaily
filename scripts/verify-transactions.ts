/**
 * Proves the inventory transactions hold together.
 *
 *     npm run verify:tx
 *
 * Companion to verify-rls.ts. That one asks "who may touch this row?"; this one
 * asks "when something is written, is everything written?"
 *
 * The thing being tested is the promise create_purchase() and
 * create_stock_adjustment() make: header, line items, stock, ledger and
 * supplier balance move together or not at all. If that ever stops being true,
 * stock on the shelf silently stops matching stock in the system, and every
 * report built on top of it is wrong.
 *
 * Fixtures are set up with the service role, which bypasses RLS. The
 * transactions themselves are invoked as a signed-in stock manager, because
 * they have to be: create_purchase() and create_stock_adjustment() run
 * SECURITY INVOKER and gate on can_manage_catalogue(), which resolves through
 * auth.uid(). A service-role caller has no auth.uid(), so the check fails
 * closed and the call is refused — correct behaviour, and a reminder that
 * nothing server-side can record a purchase without acting as a real user.
 *
 * Run against a LOCAL or STAGING database: it creates and deletes records.
 */
import { adminClient, anonClient } from "./_env";

const TAG = `TXTEST${Date.now().toString().slice(-6)}`;
const PASSWORD = "verify-transactions-password-2026";

let failures = 0;
let checks = 0;

function check(description: string, passed: boolean, detail?: string) {
  checks += 1;
  if (passed) {
    console.log(`  PASS  ${description}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${description}${detail ? ` (got ${detail})` : ""}`);
  }
}

/** Creates a stock manager at the given branch and returns a signed-in client. */
async function signedInStockManager(branchId: string) {
  const admin = adminClient();
  const email = `${TAG.toLowerCase()}-stock@example.com`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: `${TAG} Stock Manager` },
  });

  if (error || !data.user) throw new Error(`createUser: ${error?.message}`);

  await admin
    .from("profiles")
    .update({ role: "stock_manager", branch_id: branchId, is_active: true })
    .eq("auth_id", data.user.id);

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signInError) throw new Error(`signIn: ${signInError.message}`);

  return client;
}

async function cleanup(branchId?: string, medicineId?: string, supplierId?: string) {
  const admin = adminClient();

  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const user of users?.users ?? []) {
    if (user.email?.startsWith(TAG.toLowerCase())) {
      await admin.auth.admin.deleteUser(user.id);
    }
  }

  if (branchId) {
    await admin.from("stock_movements").delete().eq("branch_id", branchId);
    await admin.from("stock_adjustments").delete().eq("branch_id", branchId);

    const { data: purchases } = await admin
      .from("purchases")
      .select("id")
      .eq("branch_id", branchId);
    const ids = (purchases ?? []).map((p) => p.id);
    if (ids.length > 0) {
      await admin.from("purchase_items").delete().in("purchase_id", ids);
      await admin.from("purchases").delete().in("id", ids);
    }

    await admin.from("branch_stocks").delete().eq("branch_id", branchId);
  }

  if (medicineId) await admin.from("medicines").delete().eq("id", medicineId);
  if (supplierId) await admin.from("suppliers").delete().eq("id", supplierId);
  if (branchId) await admin.from("branches").delete().eq("id", branchId);
}

async function main() {
  const admin = adminClient();

  const { data: branch } = await admin
    .from("branches")
    .insert({ name: `${TAG} Branch`, code: TAG.slice(0, 10).toUpperCase() })
    .select("id")
    .single();

  const { data: medicine } = await admin
    .from("medicines")
    .insert({ name: `${TAG} Medicine`, reorder_level: 10 })
    .select("id")
    .single();

  const { data: supplier } = await admin
    .from("suppliers")
    .insert({ name: `${TAG} Supplier` })
    .select("id, due_amount")
    .single();

  if (!branch || !medicine || !supplier) throw new Error("fixture setup failed");

  // The transactions run as this user, not as the service role.
  const user = await signedInStockManager(branch.id);

  try {
    // =======================================================================
    console.log("\n  Purchase writes everything together");
    // =======================================================================

    // 100 x 5.00 + 40 x 5.50 = 720.00. Paying 300 leaves 420 owed.
    const EXPECTED_TOTAL = 720;
    const EXPECTED_DUE = 420;

    const { data: purchaseId, error: purchaseError } = await user.rpc("create_purchase", {
      p_branch_id: branch.id,
      p_supplier_id: supplier.id,
      p_purchase_date: "2026-09-17",
      p_invoice_no: `${TAG}-INV`,
      p_paid_amount: 300,
      p_items: [
        {
          medicine_id: medicine.id,
          batch_no: "B1",
          expiry_date: "2030-12-31",
          quantity: 100,
          cost_price: 5,
          selling_price: 8,
          mrp: 10,
        },
        {
          medicine_id: medicine.id,
          batch_no: "B2",
          expiry_date: "2029-06-30",
          quantity: 40,
          cost_price: 5.5,
          selling_price: 8,
          mrp: 10,
        },
      ],
    });

    if (purchaseError) throw new Error(`create_purchase failed: ${purchaseError.message}`);

    const { data: purchase } = await admin
      .from("purchases")
      .select("total_amount, paid_amount, due_amount")
      .eq("id", purchaseId!)
      .single();

    const { data: items } = await admin
      .from("purchase_items")
      .select("batch_no")
      .eq("purchase_id", purchaseId!);

    const { data: stock } = await admin
      .from("branch_stocks")
      .select("batch_no, quantity")
      .eq("branch_id", branch.id);

    const { data: movements } = await admin
      .from("stock_movements")
      .select("quantity, type")
      .eq("reference_id", purchaseId!);

    const { data: supplierAfter } = await admin
      .from("suppliers")
      .select("due_amount")
      .eq("id", supplier.id)
      .single();

    // The total is computed inside the database from the line items, not taken
    // from the client, so the header can never disagree with what arrived.
    check(
      "total is computed from the line items",
      Number(purchase?.total_amount) === EXPECTED_TOTAL,
      `${purchase?.total_amount}`,
    );
    check(
      "due equals total minus paid",
      Number(purchase?.due_amount) === EXPECTED_DUE,
      `${purchase?.due_amount}`,
    );
    check("both line items written", items?.length === 2, `${items?.length}`);
    check("both batches created in stock", stock?.length === 2, `${stock?.length}`);
    check(
      "batch quantities match what was received",
      stock?.find((s) => s.batch_no === "B1")?.quantity === 100 &&
        stock?.find((s) => s.batch_no === "B2")?.quantity === 40,
      JSON.stringify(stock),
    );
    check("one ledger entry per line", movements?.length === 2, `${movements?.length}`);
    check(
      "ledger entries add stock rather than remove it",
      (movements ?? []).every((m) => m.quantity > 0 && m.type === "purchase"),
      JSON.stringify(movements),
    );
    check(
      "supplier balance increased by the unpaid amount",
      Number(supplierAfter?.due_amount) === EXPECTED_DUE,
      `${supplierAfter?.due_amount}`,
    );

    // =======================================================================
    console.log("\n  Receiving the same batch again tops it up");
    // =======================================================================
    await user.rpc("create_purchase", {
      p_branch_id: branch.id,
      p_supplier_id: supplier.id,
      p_purchase_date: "2026-09-18",
      p_invoice_no: `${TAG}-INV-2`,
      p_paid_amount: 0,
      p_items: [
        {
          medicine_id: medicine.id,
          batch_no: "B1",
          expiry_date: "2030-12-31",
          quantity: 25,
          cost_price: 5,
          selling_price: 8,
          mrp: 10,
        },
      ],
    });

    const { data: toppedUp } = await admin
      .from("branch_stocks")
      .select("quantity")
      .eq("branch_id", branch.id)
      .eq("batch_no", "B1")
      .single();

    // Not a second row: one physical batch must stay one row, or FEFO and the
    // low-stock totals both start reading the same stock twice.
    check(
      "existing batch topped up to 125, not duplicated",
      toppedUp?.quantity === 125,
      `${toppedUp?.quantity}`,
    );

    // =======================================================================
    console.log("\n  A duplicate consignment is refused");
    // =======================================================================
    const { error: duplicateError } = await user.rpc("create_purchase", {
      p_branch_id: branch.id,
      p_supplier_id: supplier.id,
      p_purchase_date: "2026-09-17",
      p_invoice_no: `${TAG}-INV`,
      p_paid_amount: 0,
      p_items: [
        {
          medicine_id: medicine.id,
          batch_no: "B9",
          expiry_date: "2030-12-31",
          quantity: 1,
          cost_price: 1,
          selling_price: 2,
          mrp: 3,
        },
      ],
    });

    check(
      "the same supplier invoice cannot be received twice",
      duplicateError !== null,
      "the second call succeeded, which would double the stock",
    );

    // =======================================================================
    console.log("\n  A failed purchase leaves nothing behind");
    // =======================================================================
    const countStock = async () =>
      (
        await admin
          .from("branch_stocks")
          .select("id", { count: "exact", head: true })
          .eq("branch_id", branch.id)
      ).count;

    const stockBefore = await countStock();
    const { data: supplierBefore } = await admin
      .from("suppliers")
      .select("due_amount")
      .eq("id", supplier.id)
      .single();

    // Second line references a medicine that does not exist, so the foreign key
    // fails AFTER the first line has already written stock and a ledger entry.
    // If the function were not one transaction, that first line would survive.
    const { error: rollbackError } = await user.rpc("create_purchase", {
      p_branch_id: branch.id,
      p_supplier_id: supplier.id,
      p_purchase_date: "2026-09-19",
      p_invoice_no: `${TAG}-INV-3`,
      p_paid_amount: 0,
      p_items: [
        {
          medicine_id: medicine.id,
          batch_no: "ROLLBACK-GOOD",
          expiry_date: "2030-12-31",
          quantity: 5,
          cost_price: 1,
          selling_price: 2,
          mrp: 3,
        },
        {
          medicine_id: "00000000-0000-0000-0000-000000000000",
          batch_no: "ROLLBACK-BAD",
          expiry_date: "2030-12-31",
          quantity: 5,
          cost_price: 1,
          selling_price: 2,
          mrp: 3,
        },
      ],
    });

    const stockAfter = await countStock();
    const { data: supplierUnchanged } = await admin
      .from("suppliers")
      .select("due_amount")
      .eq("id", supplier.id)
      .single();

    check("the failing purchase was rejected", rollbackError !== null);
    check(
      "no stock row survived from the successful first line",
      stockBefore === stockAfter,
      `${stockBefore} -> ${stockAfter}`,
    );
    check(
      "the supplier balance was not touched",
      Number(supplierBefore?.due_amount) === Number(supplierUnchanged?.due_amount),
      `${supplierBefore?.due_amount} -> ${supplierUnchanged?.due_amount}`,
    );

    // =======================================================================
    console.log("\n  Adjustment moves balance and ledger together");
    // =======================================================================
    const { error: adjustError } = await user.rpc("create_stock_adjustment", {
      p_branch_id: branch.id,
      p_medicine_id: medicine.id,
      p_batch_no: "B1",
      p_type: "decrease",
      p_quantity: 25,
      p_reason: "Damaged in transit",
    });

    const { data: afterAdjust } = await admin
      .from("branch_stocks")
      .select("quantity")
      .eq("branch_id", branch.id)
      .eq("batch_no", "B1")
      .single();

    const { data: adjustMovements } = await admin
      .from("stock_movements")
      .select("quantity, type")
      .eq("branch_id", branch.id)
      .eq("type", "adjustment");

    check("the adjustment was accepted", adjustError === null, adjustError?.message);
    check("stock went from 125 to 100", afterAdjust?.quantity === 100, `${afterAdjust?.quantity}`);
    check(
      "a matching negative ledger entry was written",
      adjustMovements?.length === 1 && adjustMovements[0]?.quantity === -25,
      JSON.stringify(adjustMovements),
    );

    // =======================================================================
    console.log("\n  The ledger reconciles with the balance");
    // =======================================================================
    const { data: allMovements } = await admin
      .from("stock_movements")
      .select("quantity")
      .eq("branch_id", branch.id)
      .eq("batch_no", "B1");

    const ledgerSum = (allMovements ?? []).reduce((sum, m) => sum + m.quantity, 0);

    // The invariant the whole design rests on: branch_stocks.quantity is a
    // running balance, and the ledger is the record it must agree with.
    check(
      "summing the ledger reproduces the stock balance",
      ledgerSum === afterAdjust?.quantity,
      `ledger ${ledgerSum} vs balance ${afterAdjust?.quantity}`,
    );
  } finally {
    console.log("\n  Cleaning up…");
    await cleanup(branch.id, medicine.id, supplier.id);
  }

  console.log(`\n  ${checks - failures}/${checks} checks passed.\n`);

  if (failures > 0) {
    console.error("  INVENTORY TRANSACTIONS ARE NOT ATOMIC — do not deploy until these pass.\n");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`\n  ${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
