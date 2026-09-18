/**
 * PharmaDaily — Master Data Seeding Script
 *
 * Ingests:
 *   1. 300+ Pharmaceutical Companies from `company name .csv` into `suppliers`
 *   2. 3,500+ DGDA Formulations from `Directorate General of Drug Administration (1).csv` into `medicines`
 *
 * Fully Idempotent: Can be re-run safely without creating duplicates.
 * Handles PostgREST 1000-row pagination cleanly.
 *
 * Usage:
 *   npm run seed:master-data
 */
import fs from "fs";
import path from "path";
import readline from "readline";

import { adminClient } from "./_env";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function cleanText(text: string | undefined): string {
  if (!text) return "";
  return text
    .replace(/^"+|"+$/g, "")
    .replace(/[\uFFFD\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "")
    .trim();
}

function findFile(filename: string): string {
  const candidates = [
    path.resolve(process.cwd(), filename),
    path.resolve(process.cwd(), "..", filename),
    path.resolve("D:/PROJECTS/pharmacy-management", filename),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`File not found: ${filename}. Checked: ${candidates.join(", ")}`);
}

async function fetchAllSuppliers(supabase: ReturnType<typeof adminClient>) {
  const names = new Set<string>();
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("suppliers")
      .select("name")
      .is("deleted_at", null)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const s of data) {
      if (s.name) names.add(s.name.toLowerCase().trim());
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return names;
}

async function fetchAllMedicines(supabase: ReturnType<typeof adminClient>) {
  const keys = new Set<string>();
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("medicines")
      .select("name, strength")
      .is("deleted_at", null)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const m of data) {
      keys.add(`${(m.name || "").toLowerCase().trim()}::${(m.strength || "").toLowerCase().trim()}`);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return keys;
}

async function seedCompanies() {
  console.log("\n=======================================================");
  console.log("  Step 1: Seeding Pharmaceutical Companies (Suppliers)");
  console.log("=======================================================");

  const filePath = findFile("company name .csv");
  console.log(`  Source file: ${filePath}`);

  const supabase = adminClient();

  const existingNames = await fetchAllSuppliers(supabase);
  console.log(`  Existing suppliers in database: ${existingNames.size}`);

  const fileStream = fs.createReadStream(filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let isHeader = true;
  const toInsert: Array<{
    name: string;
    address: string | null;
    due_amount: number;
    is_active: boolean;
  }> = [];

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (isHeader) {
      isHeader = false;
      continue;
    }

    const cols = parseCsvLine(line);
    const company = cleanText(cols[1]);
    const address = cleanText(cols[2]);
    const status = cleanText(cols[6]);

    if (!company) continue;

    const lower = company.toLowerCase();
    if (existingNames.has(lower)) {
      continue;
    }

    existingNames.add(lower);
    toInsert.push({
      name: company,
      address: address || null,
      due_amount: 0,
      is_active: !status.toLowerCase().includes("non-functional"),
    });
  }

  console.log(`  New companies to insert: ${toInsert.length}`);

  if (toInsert.length > 0) {
    const BATCH_SIZE = 50;
    let inserted = 0;

    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const chunk = toInsert.slice(i, i + BATCH_SIZE);
      const { error: insertErr } = await supabase.from("suppliers").insert(chunk);
      if (insertErr) {
        console.error(`  Error inserting suppliers batch ${i / BATCH_SIZE + 1}:`, insertErr.message);
      } else {
        inserted += chunk.length;
        process.stdout.write(`\r  Inserted: ${inserted}/${toInsert.length} companies...`);
      }
    }
    console.log(`\n  Done! Successfully inserted ${inserted} suppliers.`);
  } else {
    console.log("  All suppliers are already up to date.");
  }
}

async function seedMedicines() {
  console.log("\n=======================================================");
  console.log("  Step 2: Seeding DGDA Medicines & Formulations");
  console.log("=======================================================");

  const filePath = findFile("Directorate General of Drug Administration (1).csv");
  console.log(`  Source file: ${filePath}`);

  const supabase = adminClient();

  const existingKeys = await fetchAllMedicines(supabase);
  console.log(`  Existing medicines in database: ${existingKeys.size}`);

  const fileStream = fs.createReadStream(filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let isHeader = true;
  const toInsert: Array<{
    name: string;
    generic_name: string;
    dosage_form: string | null;
    strength: string | null;
    reorder_level: number;
    prescription_required: boolean;
    controlled_drug: boolean;
    is_active: boolean;
  }> = [];

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (isHeader) {
      isHeader = false;
      continue;
    }

    const cols = parseCsvLine(line);
    const generic = cleanText(cols[1]);
    const dosage = cleanText(cols[2]);
    const strength = cleanText(cols[3]);

    if (!generic) continue;

    const displayName = strength ? `${generic} ${strength}` : `${generic} (${dosage || "Standard"})`;
    const key = `${displayName.toLowerCase()}::${strength.toLowerCase()}`;

    if (existingKeys.has(key)) {
      continue;
    }

    existingKeys.add(key);

    const isPrescription =
      dosage.toLowerCase().includes("injection") ||
      dosage.toLowerCase().includes("infusion") ||
      dosage.toLowerCase().includes("suppository") ||
      generic.toLowerCase().includes("hydrochloride") ||
      generic.toLowerCase().includes("prednisolone");

    toInsert.push({
      name: displayName,
      generic_name: generic,
      dosage_form: dosage || null,
      strength: strength || null,
      reorder_level: 10,
      prescription_required: isPrescription,
      controlled_drug: false,
      is_active: true,
    });
  }

  console.log(`  New medicines to insert: ${toInsert.length}`);

  if (toInsert.length > 0) {
    const BATCH_SIZE = 100;
    let inserted = 0;

    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const chunk = toInsert.slice(i, i + BATCH_SIZE);
      const { error: insertErr } = await supabase.from("medicines").insert(chunk);
      if (insertErr) {
        console.error(`  Error inserting medicines batch ${i / BATCH_SIZE + 1}:`, insertErr.message);
      } else {
        inserted += chunk.length;
        process.stdout.write(`\r  Inserted: ${inserted}/${toInsert.length} medicines...`);
      }
    }
    console.log(`\n  Done! Successfully inserted ${inserted} medicines.`);
  } else {
    console.log("  All medicines are already up to date.");
  }
}

async function main() {
  const start = Date.now();
  console.log("Starting PharmaDaily Master Data Seeding...\n");

  await seedCompanies();
  await seedMedicines();

  console.log(`\nAll master data check/seeding complete in ${((Date.now() - start) / 1000).toFixed(1)}s!`);
}

main().catch((err) => {
  console.error("\nSeeding failed:", err);
  process.exit(1);
});
