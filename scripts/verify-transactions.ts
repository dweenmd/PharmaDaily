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

/** Creates a cashier at the given branch and returns a signed-in client. */
async function signedInCashier(branchId: string) {
  const admin = adminClient();
  const email = `${TAG.toLowerCase()}-cashier@example.com`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: `${TAG} Cashier` },
  });

  if (error || !data.user) throw new Error(`createUser: ${error?.message}`);

  await admin
    .from("profiles")
    .update({ role: "cashier", branch_id: branchId, is_active: true })
    .eq("auth_id", data.user.id);

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signInError) throw new Error(`signIn: ${signInError.message}`);

  return client;
}

/** Creates a branch manager at the given branch and returns a signed-in client. */
async function signedInBranchManager(branchId: string, suffix: string) {
  const admin = adminClient();
  const email = `${TAG.toLowerCase()}-manager-${suffix}@example.com`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: `${TAG} Manager ${suffix.toUpperCase()}` },
  });

  if (error || !data.user) throw new Error(`createUser: ${error?.message}`);

  await admin
    .from("profiles")
    .update({ role: "branch_manager", branch_id: branchId, is_active: true })
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

    const { data: sales } = await admin.from("sales").select("id").eq("branch_id", branchId);
    const saleIds = (sales ?? []).map((s) => s.id);
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

    await admin.from("invoice_counters").delete().eq("branch_id", branchId);
    await admin.from("customers").delete().like("name", `${TAG}%`);

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

  // The transfer fixtures span two branches, so they are cleared by tag
  // rather than by the single branch id the caller passed.
  const { data: taggedBranches } = await admin
    .from("branches")
    .select("id")
    .like("name", `${TAG}%`);
  const taggedIds = (taggedBranches ?? []).map((b) => b.id);

  if (taggedIds.length > 0) {
    const { data: transfers } = await admin
      .from("stock_transfers")
      .select("id")
      .or(
        taggedIds.map((id) => `from_branch_id.eq.${id}`).join(",") +
          "," +
          taggedIds.map((id) => `to_branch_id.eq.${id}`).join(","),
      );

    const transferIds = (transfers ?? []).map((t) => t.id);
    if (transferIds.length > 0) {
      await admin.from("stock_transfer_items").delete().in("transfer_id", transferIds);
      await admin.from("stock_transfers").delete().in("id", transferIds);
    }

    await admin.from("stock_movements").delete().in("branch_id", taggedIds);
    await admin.from("branch_stocks").delete().in("branch_id", taggedIds);
  }

  if (medicineId) await admin.from("medicines").delete().eq("id", medicineId);
  if (supplierId) await admin.from("suppliers").delete().eq("id", supplierId);
  if (branchId) await admin.from("branches").delete().eq("id", branchId);
  await admin.from("branches").delete().like("name", `${TAG}%`);
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

    // =======================================================================
    console.log("\n  Sales");
    // =======================================================================
    const cashier = await signedInCashier(branch.id);

    const { data: customer } = await admin
      .from("customers")
      .insert({ name: `${TAG} Customer` })
      .select("id")
      .single();

    const { data: batch } = await admin
      .from("branch_stocks")
      .select("id, quantity, selling_price")
      .eq("branch_id", branch.id)
      .eq("batch_no", "B1")
      .single();

    if (!customer || !batch) throw new Error("sales fixture setup failed");

    const stockBeforeSale = batch.quantity;
    const price = Number(batch.selling_price);

    // THE PRICE-TAMPERING TEST. The client is deliberately sending a price and
    // a total; create_sale() must ignore both and read selling_price from the
    // database. If this ever fails, anyone with a browser console can set their
    // own prices and the books will still balance.
    const { data: saleId, error: saleError } = await cashier.rpc("create_sale", {
      p_branch_id: branch.id,
      p_customer_id: customer.id,
      p_discount: 10,
      p_items: [
        {
          branch_stock_id: batch.id,
          quantity: 4,
          unit_price: 0.01,
          total_price: 0.04,
        },
      ],
      p_payments: [{ method: "cash", amount: 50 }],
    });

    if (saleError) throw new Error(`create_sale failed: ${saleError.message}`);

    const { data: sale } = await admin
      .from("sales")
      .select("invoice_no, subtotal, discount, total_amount, paid_amount, due_amount")
      .eq("id", saleId!)
      .single();

    const { data: soldItems } = await admin
      .from("sale_items")
      .select("quantity, unit_price, total_price")
      .eq("sale_id", saleId!);

    const expectedSubtotal = price * 4;

    check(
      "the client's price is ignored in favour of the database's",
      Number(soldItems?.[0]?.unit_price) === price,
      `unit_price ${soldItems?.[0]?.unit_price}, expected ${price}`,
    );
    check(
      "the subtotal is computed from database prices",
      Number(sale?.subtotal) === expectedSubtotal,
      `${sale?.subtotal}, expected ${expectedSubtotal}`,
    );
    check(
      "total equals subtotal minus discount",
      Number(sale?.total_amount) === expectedSubtotal - 10,
      `${sale?.total_amount}`,
    );

    check(
      "the invoice number is branch-coded and sequential",
      /^[A-Z0-9]{2,10}-\d{4}-\d{4,}$/.test(sale?.invoice_no ?? ""),
      sale?.invoice_no,
    );

    const { data: stockAfterSale } = await admin
      .from("branch_stocks")
      .select("quantity")
      .eq("id", batch.id)
      .single();

    check(
      "stock was deducted by the quantity sold",
      stockAfterSale?.quantity === stockBeforeSale - 4,
      `${stockBeforeSale} -> ${stockAfterSale?.quantity}`,
    );

    const { data: saleMovements } = await admin
      .from("stock_movements")
      .select("quantity, type")
      .eq("reference_id", saleId!);

    check(
      "a negative ledger entry was written for the sale",
      saleMovements?.length === 1 &&
        saleMovements[0]?.quantity === -4 &&
        saleMovements[0]?.type === "sale",
      JSON.stringify(saleMovements),
    );

    const { data: customerAfterSale } = await admin
      .from("customers")
      .select("due_amount")
      .eq("id", customer.id)
      .single();

    // Paid 50 against a total of (price*4 - 10); the remainder is credit.
    const expectedDue = Math.max(0, expectedSubtotal - 10 - 50);
    check(
      "unpaid balance was added to the customer",
      Number(customerAfterSale?.due_amount) === expectedDue,
      `${customerAfterSale?.due_amount}, expected ${expectedDue}`,
    );

    // --- Overselling ------------------------------------------------------
    const { error: oversell } = await cashier.rpc("create_sale", {
      p_branch_id: branch.id,
      p_customer_id: null as unknown as string,
      p_discount: 0,
      p_items: [{ branch_stock_id: batch.id, quantity: 100000 }],
      p_payments: [{ method: "cash", amount: 1 }],
    });

    check(
      "cannot sell more than is on the shelf",
      oversell !== null,
      oversell ? undefined : "the sale succeeded — stock could go negative",
    );

    // --- Credit without a customer ----------------------------------------
    const { error: anonymousCredit } = await cashier.rpc("create_sale", {
      p_branch_id: branch.id,
      p_customer_id: null as unknown as string,
      p_discount: 0,
      p_items: [{ branch_stock_id: batch.id, quantity: 1 }],
      p_payments: [],
    });

    check(
      "cannot leave an amount owing without naming a customer",
      anonymousCredit !== null,
      anonymousCredit ? undefined : "untraceable debt was created",
    );

    // =======================================================================
    console.log("\n  Concurrent invoice numbering");
    // =======================================================================

    // The real reason the counter exists. Ten sales fired at once: every one
    // must get a distinct number. With max(invoice_no)+1 several would collide
    // and be rejected after the customer had already paid.
    const concurrent = await Promise.all(
      Array.from({ length: 10 }, () =>
        cashier.rpc("create_sale", {
          p_branch_id: branch.id,
          p_customer_id: null as unknown as string,
          p_discount: 0,
          p_items: [{ branch_stock_id: batch.id, quantity: 1 }],
          p_payments: [{ method: "cash", amount: price }],
        }),
      ),
    );

    const succeeded = concurrent.filter((r) => !r.error);
    const { data: concurrentSales } = await admin
      .from("sales")
      .select("invoice_no")
      .in(
        "id",
        succeeded.map((r) => r.data as unknown as string),
      );

    const numbers = (concurrentSales ?? []).map((s) => s.invoice_no);

    check(
      "all ten concurrent sales completed",
      succeeded.length === 10,
      `${succeeded.length} of 10; first error: ${concurrent.find((r) => r.error)?.error?.message}`,
    );
    check(
      "every concurrent sale got a distinct invoice number",
      new Set(numbers).size === numbers.length,
      `${numbers.length} sales, ${new Set(numbers).size} distinct numbers`,
    );

    // =======================================================================
    console.log("\n  Returns");
    // =======================================================================
    const { data: saleItem } = await admin
      .from("sale_items")
      .select("id, quantity")
      .eq("sale_id", saleId!)
      .single();

    if (!saleItem) throw new Error("sale item missing");

    const { data: stockBeforeReturn } = await admin
      .from("branch_stocks")
      .select("quantity")
      .eq("id", batch.id)
      .single();

    const { error: returnError } = await cashier.rpc("create_sales_return", {
      p_sale_id: saleId!,
      p_items: [{ sale_item_id: saleItem.id, quantity: 2 }],
      p_reason: "Customer changed their mind",
      p_refund_method: "cash",
    });

    const { data: stockAfterReturn } = await admin
      .from("branch_stocks")
      .select("quantity")
      .eq("id", batch.id)
      .single();

    check("the return was accepted", returnError === null, returnError?.message);
    check(
      "returned stock went back to the same batch",
      stockAfterReturn?.quantity === (stockBeforeReturn?.quantity ?? 0) + 2,
      `${stockBeforeReturn?.quantity} -> ${stockAfterReturn?.quantity}`,
    );

    const { data: returnMovements } = await admin
      .from("stock_movements")
      .select("quantity, type")
      .eq("type", "return")
      .eq("branch_id", branch.id);

    check(
      "a positive ledger entry was written for the return",
      returnMovements?.some((m) => m.quantity === 2) ?? false,
      JSON.stringify(returnMovements),
    );

    // Two of four already returned, so at most two more.
    const { error: overReturn } = await cashier.rpc("create_sales_return", {
      p_sale_id: saleId!,
      p_items: [{ sale_item_id: saleItem.id, quantity: 3 }],
      p_reason: "Attempting to over-return",
      p_refund_method: "cash",
    });

    check(
      "cannot return more than was sold",
      overReturn !== null,
      overReturn ? undefined : "the same line was refunded twice",
    );

    const { error: noReason } = await cashier.rpc("create_sales_return", {
      p_sale_id: saleId!,
      p_items: [{ sale_item_id: saleItem.id, quantity: 1 }],
      p_reason: "",
      p_refund_method: "cash",
    });

    check(
      "a return requires a reason",
      noReason !== null,
      noReason ? undefined : "an unexplained refund was accepted",
    );

    // =======================================================================
    console.log("\n  Transfers");
    // =======================================================================

    // A second branch to move stock to, and a manager who can approve.
    const { data: branchB } = await admin
      .from("branches")
      .insert({ name: `${TAG} Branch B`, code: `${TAG.slice(0, 8).toUpperCase()}B` })
      .select("id")
      .single();

    if (!branchB) throw new Error("second branch fixture failed");

    const manager = await signedInBranchManager(branch.id, "a");
    const destinationManager = await signedInBranchManager(branchB.id, "b");

    const { data: transferBatch } = await admin
      .from("branch_stocks")
      .select("id, quantity")
      .eq("branch_id", branch.id)
      .eq("batch_no", "B2")
      .single();

    if (!transferBatch) throw new Error("transfer batch fixture missing");

    const sourceBefore = transferBatch.quantity;

    // --- Requesting moves nothing -----------------------------------------
    const { data: transferId, error: requestError } = await user.rpc("create_stock_transfer", {
      p_from_branch_id: branch.id,
      p_to_branch_id: branchB.id,
      p_items: [{ source_stock_id: transferBatch.id, quantity: 10 }],
      p_notes: "verify-tx lifecycle",
    });

    const { data: afterRequest } = await admin
      .from("branch_stocks")
      .select("quantity")
      .eq("id", transferBatch.id)
      .single();

    check("a transfer can be requested", requestError === null, requestError?.message);
    check(
      "requesting moves no stock",
      afterRequest?.quantity === sourceBefore,
      `${sourceBefore} -> ${afterRequest?.quantity}`,
    );

    // --- Only the right people, in the right order ------------------------
    const { error: stockManagerApproves } = await user.rpc("approve_stock_transfer", {
      p_transfer_id: transferId!,
    });

    check(
      "a stock manager cannot approve their own request",
      stockManagerApproves !== null,
      stockManagerApproves ? undefined : "one person moved stock between branches unobserved",
    );

    const { error: destinationApproves } = await destinationManager.rpc("approve_stock_transfer", {
      p_transfer_id: transferId!,
    });

    check(
      "the receiving branch cannot approve a dispatch",
      destinationApproves !== null,
      destinationApproves ? undefined : "the destination dispatched someone else's stock",
    );

    const { error: receiveBeforeApprove } = await destinationManager.rpc("receive_stock_transfer", {
      p_transfer_id: transferId!,
      p_receipts: [],
    });

    check(
      "cannot receive a transfer that was never dispatched",
      receiveBeforeApprove !== null,
      receiveBeforeApprove ? undefined : "stock arrived without leaving",
    );

    // --- Approve: stock leaves --------------------------------------------
    const { error: approveError } = await manager.rpc("approve_stock_transfer", {
      p_transfer_id: transferId!,
    });

    const { data: afterApprove } = await admin
      .from("branch_stocks")
      .select("quantity")
      .eq("id", transferBatch.id)
      .single();

    const { data: destinationDuringTransit } = await admin
      .from("branch_stocks")
      .select("quantity")
      .eq("branch_id", branchB.id)
      .eq("batch_no", "B2")
      .maybeSingle();

    check("the sending branch manager can approve", approveError === null, approveError?.message);
    check(
      "approval deducts at the source",
      afterApprove?.quantity === sourceBefore - 10,
      `${sourceBefore} -> ${afterApprove?.quantity}`,
    );

    // The whole reason this is two steps: in transit, the stock belongs to
    // neither branch's sellable count.
    check(
      "in transit, the destination has not been credited",
      destinationDuringTransit === null || destinationDuringTransit.quantity === 0,
      `destination holds ${destinationDuringTransit?.quantity}`,
    );

    const { error: approveTwice } = await manager.rpc("approve_stock_transfer", {
      p_transfer_id: transferId!,
    });

    check(
      "cannot dispatch the same transfer twice",
      approveTwice !== null,
      approveTwice ? undefined : "stock was deducted a second time",
    );

    const { error: rejectAfterDispatch } = await manager.rpc("reject_stock_transfer", {
      p_transfer_id: transferId!,
      p_reason: "changed my mind",
    });

    check(
      "cannot reject a transfer whose stock has already left",
      rejectAfterDispatch !== null,
      rejectAfterDispatch ? undefined : "a status change silently un-dispatched real stock",
    );

    const { error: sourceReceives } = await manager.rpc("receive_stock_transfer", {
      p_transfer_id: transferId!,
      p_receipts: [],
    });

    check(
      "the sending branch cannot confirm its own delivery arrived",
      sourceReceives !== null,
      sourceReceives ? undefined : "counting it in was skipped",
    );

    // --- Receive short, with a reason -------------------------------------
    const { data: transferItem } = await admin
      .from("stock_transfer_items")
      .select("id")
      .eq("transfer_id", transferId!)
      .single();

    const { error: shortNoReason } = await destinationManager.rpc("receive_stock_transfer", {
      p_transfer_id: transferId!,
      p_receipts: [{ item_id: transferItem!.id, received_quantity: 8 }],
    });

    check(
      "a shortfall must be explained",
      shortNoReason !== null,
      shortNoReason ? undefined : "stock vanished between branches with no record of why",
    );

    const { error: receiveError } = await destinationManager.rpc("receive_stock_transfer", {
      p_transfer_id: transferId!,
      p_receipts: [
        { item_id: transferItem!.id, received_quantity: 8, shortfall_reason: "Damaged in transit" },
      ],
    });

    const { data: destinationAfter } = await admin
      .from("branch_stocks")
      .select("quantity, expiry_date, selling_price")
      .eq("branch_id", branchB.id)
      .eq("batch_no", "B2")
      .single();

    const { data: sourceBatchMeta } = await admin
      .from("branch_stocks")
      .select("expiry_date, selling_price")
      .eq("id", transferBatch.id)
      .single();

    check("the destination can confirm receipt", receiveError === null, receiveError?.message);
    check(
      "only what actually arrived is credited",
      destinationAfter?.quantity === 8,
      `destination holds ${destinationAfter?.quantity}, expected 8`,
    );
    check(
      "the destination inherits the batch's expiry and price",
      destinationAfter?.expiry_date === sourceBatchMeta?.expiry_date &&
        Number(destinationAfter?.selling_price) === Number(sourceBatchMeta?.selling_price),
      `${destinationAfter?.expiry_date} / ${destinationAfter?.selling_price}`,
    );

    const { data: transferMovements } = await admin
      .from("stock_movements")
      .select("branch_id, type, quantity")
      .eq("reference_id", transferId!);

    const out = (transferMovements ?? []).find((m) => m.type === "transfer_out");
    const into = (transferMovements ?? []).find((m) => m.type === "transfer_in");

    check(
      "the ledger records 10 leaving and 8 arriving",
      out?.quantity === -10 && into?.quantity === 8,
      JSON.stringify(transferMovements),
    );

    // The 2 units that left and never arrived are visible as the gap between
    // the two ledger entries — which is the point of recording both.
    check(
      "the two missing units are visible in the ledger, not absorbed",
      Math.abs(out?.quantity ?? 0) - (into?.quantity ?? 0) === 2,
      `out ${out?.quantity}, in ${into?.quantity}`,
    );

    // --- A rejected transfer changes nothing ------------------------------
    const { data: rejectBatch } = await admin
      .from("branch_stocks")
      .select("id, quantity")
      .eq("id", transferBatch.id)
      .single();

    const { data: rejectedId } = await user.rpc("create_stock_transfer", {
      p_from_branch_id: branch.id,
      p_to_branch_id: branchB.id,
      p_items: [{ source_stock_id: transferBatch.id, quantity: 5 }],
      p_notes: null as unknown as string,
    });

    await manager.rpc("reject_stock_transfer", {
      p_transfer_id: rejectedId!,
      p_reason: "Needed here",
    });

    const { data: afterReject } = await admin
      .from("branch_stocks")
      .select("quantity")
      .eq("id", transferBatch.id)
      .single();

    const { count: rejectedMovements } = await admin
      .from("stock_movements")
      .select("id", { count: "exact", head: true })
      .eq("reference_id", rejectedId!);

    check(
      "a rejected transfer leaves the shelves untouched",
      afterReject?.quantity === rejectBatch?.quantity,
      `${rejectBatch?.quantity} -> ${afterReject?.quantity}`,
    );
    check(
      "a rejected transfer writes nothing to the ledger",
      rejectedMovements === 0,
      `${rejectedMovements} movements`,
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
