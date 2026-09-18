import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const envFile = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
const env: Record<string, string> = {};
for (const line of envFile.split("\n")) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match && match[1] && match[2]) {
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: branch } = await sb
    .from("branches")
    .select("id, name")
    .limit(1)
    .single();

  if (!branch) {
    console.error("No branch found!");
    return;
  }
  console.log(`Target branch: ${branch.name} (${branch.id})`);

  // Fetch 35 active medicines
  const { data: medicines } = await sb
    .from("medicines")
    .select("id, name, generic_name, strength, dosage_form")
    .limit(35);

  if (!medicines || medicines.length === 0) {
    console.error("No medicines found in database!");
    return;
  }

  const { data: existingStocks } = await sb
    .from("branch_stocks")
    .select("medicine_id")
    .eq("branch_id", branch.id);

  const existingMedIds = new Set((existingStocks ?? []).map((s) => s.medicine_id));

  const toInsert: any[] = [];
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const expiryDateStr = futureDate.toISOString().slice(0, 10);

  const nearExpiryDate = new Date();
  nearExpiryDate.setMonth(nearExpiryDate.getMonth() + 2);
  const nearExpiryDateStr = nearExpiryDate.toISOString().slice(0, 10);

  let i = 0;
  for (const med of medicines) {
    if (existingMedIds.has(med.id)) continue;
    i++;
    const isNearExpiry = i % 8 === 0;
    const qty = 50 + (i * 15) % 250;
    const cost = Number((5 + (i * 3.5) % 40).toFixed(2));
    const price = Number((cost * 1.25).toFixed(2));

    toInsert.push({
      branch_id: branch.id,
      medicine_id: med.id,
      batch_no: `BT-${2026}${String(i).padStart(3, "0")}`,
      expiry_date: isNearExpiry ? nearExpiryDateStr : expiryDateStr,
      quantity: qty,
      reserved_quantity: 0,
      purchase_price: cost,
      selling_price: price,
      mrp: price,
      received_date: new Date().toISOString().slice(0, 10),
    });
  }

  if (toInsert.length > 0) {
    const { error } = await sb.from("branch_stocks").insert(toInsert);
    if (error) {
      console.error("Error inserting sample stock:", error);
    } else {
      console.log(`Successfully seeded ${toInsert.length} batches into branch_stocks!`);
    }
  } else {
    console.log("Batches already seeded.");
  }
}

main();
