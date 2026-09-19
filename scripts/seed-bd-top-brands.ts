/**
 * PharmaDaily — Top 4,000–5,000 Bangladeshi Medicine Brands Seeder
 *
 * Ingests the most prescribed, high-turnover pharmaceutical brands from
 * Bangladesh's leading drug manufacturers into Supabase `medicines`.
 *
 * Usage:
 *   npx tsx scripts/seed-bd-top-brands.ts
 */

import fs from "fs";
import path from "path";
import { adminClient } from "./_env";

type RawBrand = {
  brand_id: string;
  generic_id: string;
  company_id: string;
  brand_name: string;
  form: string;
  strength: string;
  price: string;
  packsize: string;
};

type RawGeneric = {
  generic_id: string;
  generic_name: string;
  indication?: string;
  mode_of_action?: string;
};

type RawCompany = {
  company_id: string;
  company_name: string;
};

type RawDataset = {
  brands: RawBrand[];
  generics: RawGeneric[];
  companies: RawCompany[];
};

const TOP_MANUFACTURERS = [
  "Square",
  "Incepta",
  "Beximco",
  "Renata",
  "Healthcare",
  "Opsonin",
  "Acme",
  "Eskayef",
  "Aristopharma",
  "Popular",
  "ACI",
  "Ibn Sina",
  "Navana",
  "Drug International",
  "General Pharmaceuticals",
  "Orion",
  "Beacon",
  "Delta",
  "Ziska",
];

const STANDARD_CATEGORIES = [
  "Analgesic & Antipyretic",
  "Anti-Ulcerant & Gastrointestinal",
  "Antibiotic & Antimicrobial",
  "Antihypertensive & Cardiovascular",
  "Antidiabetic",
  "Respiratory & Anti-Asthmatic",
  "Antihistamine & Anti-Allergic",
  "Vitamin & Mineral Supplement",
  "Dermatological & Topical",
  "Central Nervous System & Psychiatric",
  "Ophthalmic & Otic",
  "Urological & Renal",
  "Hormone & Endocrine",
  "General Healthcare",
];

function titleCase(text: string): string {
  if (!text) return "";
  return text
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function cleanString(str?: string | null): string | null {
  if (!str) return null;
  const cleaned = str.replace(/[\uFFFD\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function assignCategory(generic: string, form: string): string {
  const g = generic.toLowerCase();
  const f = form.toLowerCase();

  if (g.includes("paracetamol") || g.includes("ibuprofen") || g.includes("ketorolac") || g.includes("aceclofenac") || g.includes("naproxen") || g.includes("diclofenac")) {
    return "Analgesic & Antipyretic";
  }
  if (g.includes("omeprazole") || g.includes("pantoprazole") || g.includes("esomeprazole") || g.includes("rabeprazole") || g.includes("domperidone") || g.includes("antacid") || g.includes("famotidine")) {
    return "Anti-Ulcerant & Gastrointestinal";
  }
  if (g.includes("cillin") || g.includes("cef") || g.includes("mycin") || g.includes("floxacin") || g.includes("clav") || g.includes("doxycycline") || g.includes("metronidazole")) {
    return "Antibiotic & Antimicrobial";
  }
  if (g.includes("sartan") || g.includes("olol") || g.includes("dipine") || g.includes("statin") || g.includes("pril") || g.includes("clopidogrel") || g.includes("aspirin")) {
    return "Antihypertensive & Cardiovascular";
  }
  if (g.includes("metformin") || g.includes("glimepiride") || g.includes("vildagliptin") || g.includes("sitagliptin") || g.includes("linagliptin") || g.includes("insulin") || g.includes("dapagliflozin") || g.includes("empagliflozin") || g.includes("tirzepatide")) {
    return "Antidiabetic";
  }
  if (g.includes("montelukast") || g.includes("salbutamol") || g.includes("doxophylline") || g.includes("theophylline") || g.includes("budesonide") || g.includes("ipratropium")) {
    return "Respiratory & Anti-Asthmatic";
  }
  if (g.includes("cetirizine") || g.includes("fexofenadine") || g.includes("loratadine") || g.includes("levocetirizine") || g.includes("bilastine") || g.includes("ketotifen")) {
    return "Antihistamine & Anti-Allergic";
  }
  if (g.includes("vitamin") || g.includes("calcium") || g.includes("zinc") || g.includes("iron") || g.includes("folic acid") || g.includes("cholecalciferol") || g.includes("cod liver")) {
    return "Vitamin & Mineral Supplement";
  }
  if (f.includes("eye") || f.includes("ear") || f.includes("ophthalmic")) {
    return "Ophthalmic & Otic";
  }
  if (f.includes("cream") || f.includes("ointment") || f.includes("gel") || f.includes("lotion") || g.includes("clobetasol") || g.includes("miconazole")) {
    return "Dermatological & Topical";
  }
  return "General Healthcare";
}

function determinePrescriptionRequired(generic: string, form: string): boolean {
  const g = generic.toLowerCase();
  const f = form.toLowerCase();

  if (f.includes("injection") || f.includes("infusion") || f.includes("vial") || f.includes("ampoule")) {
    return true;
  }
  if (
    g.includes("cillin") ||
    g.includes("cef") ||
    g.includes("mycin") ||
    g.includes("floxacin") ||
    g.includes("sartan") ||
    g.includes("statin") ||
    g.includes("glitazone") ||
    g.includes("clonazepam") ||
    g.includes("diazepam") ||
    g.includes("steroid") ||
    g.includes("prednisol") ||
    g.includes("dexamethason")
  ) {
    return true;
  }
  return false;
}

async function fetchExistingMedicines(supabase: ReturnType<typeof adminClient>): Promise<Set<string>> {
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
      if (m.name) {
        keys.add(`${m.name.toLowerCase().trim()}::${(m.strength || "").toLowerCase().trim()}`);
      }
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return keys;
}

async function seedCategories(supabase: ReturnType<typeof adminClient>): Promise<Map<string, string>> {
  const categoryMap = new Map<string, string>();

  // 1. Fetch existing categories
  const { data: existing, error } = await supabase
    .from("medicine_categories")
    .select("id, name");

  if (error) throw error;

  for (const c of existing ?? []) {
    categoryMap.set(c.name.toLowerCase().trim(), c.id);
  }

  // 2. Insert missing categories
  const missing = STANDARD_CATEGORIES.filter(
    (name) => !categoryMap.has(name.toLowerCase().trim()),
  );

  if (missing.length > 0) {
    console.log(`  Seeding ${missing.length} standard pharmaceutical categories...`);
    const { data: inserted, error: insErr } = await supabase
      .from("medicine_categories")
      .insert(missing.map((name) => ({ name })))
      .select("id, name");

    if (insErr) {
      console.warn("  Warning inserting categories:", insErr.message);
    } else {
      for (const c of inserted ?? []) {
        categoryMap.set(c.name.toLowerCase().trim(), c.id);
      }
    }
  }

  return categoryMap;
}

async function main() {
  const startTime = Date.now();
  console.log("===============================================================================");
  console.log("  PharmaDaily — Seeding Top 4,000–5,000 Running Bangladeshi Medicine Brands");
  console.log("===============================================================================\n");

  const jsonPath = path.resolve(process.cwd(), "scripts/data/medicne.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Dataset not found at ${jsonPath}. Please run download command first.`);
  }

  console.log("1. Reading raw dataset...");
  const raw: RawDataset = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  console.log(`   Found ${raw.brands.length} raw brands, ${raw.generics.length} generics, ${raw.companies.length} companies.`);

  const genericsMap = new Map<string, RawGeneric>();
  for (const g of raw.generics) {
    genericsMap.set(g.generic_id, g);
  }

  const companiesMap = new Map<string, RawCompany>();
  for (const c of raw.companies) {
    companiesMap.set(c.company_id, c);
  }

  const supabase = adminClient();

  console.log("\n2. Ensuring standard therapeutic categories exist...");
  const categoryIdMap = await seedCategories(supabase);

  console.log("\n3. Checking existing database medicines for deduplication...");
  const existingKeys = await fetchExistingMedicines(supabase);
  console.log(`   Found ${existingKeys.size} medicines currently in database.`);

  console.log("\n4. Filtering brands from Bangladesh's top pharmaceutical manufacturers...");
  const brandsToProcess: any[] = [];
  const seenKeys = new Set<string>();

  for (const b of raw.brands) {
    if (!b.brand_name || !b.generic_id || !b.company_id) continue;

    const company = companiesMap.get(b.company_id);
    if (!company?.company_name) continue;

    const companyName = company.company_name.trim();
    const isTopCompany = TOP_MANUFACTURERS.some((tm) =>
      companyName.toLowerCase().includes(tm.toLowerCase()),
    );
    if (!isTopCompany) continue;

    const generic = genericsMap.get(b.generic_id);
    if (!generic?.generic_name) continue;

    const genericName = generic.generic_name.trim();
    const brandName = b.brand_name.trim();
    const strength = cleanString(b.strength) || null;
    const form = cleanString(b.form) || "Tablet";

    // Standardized display name: e.g. "Napa 500mg" or "Seclo 20mg"
    const displayName = strength
      ? brandName.toLowerCase().includes(strength.toLowerCase())
        ? brandName
        : `${brandName} ${strength}`
      : brandName;

    const key = `${displayName.toLowerCase().trim()}::${(strength || "").toLowerCase().trim()}`;

    // Skip duplicate entries within dataset or already in database
    if (seenKeys.has(key) || existingKeys.has(key)) continue;
    seenKeys.add(key);

    const categoryName = assignCategory(genericName, form);
    const categoryId = categoryIdMap.get(categoryName.toLowerCase().trim()) || null;

    const unit = form.toLowerCase().includes("syrup") || form.toLowerCase().includes("susp") || form.toLowerCase().includes("drop")
      ? "bottle"
      : form.toLowerCase().includes("cream") || form.toLowerCase().includes("ointment") || form.toLowerCase().includes("gel")
      ? "tube"
      : "piece";

    brandsToProcess.push({
      name: displayName,
      brand_name: brandName,
      generic_name: genericName,
      dosage_form: form,
      strength: strength,
      category_id: categoryId,
      manufacturer: companyName,
      pack_size: cleanString(b.packsize) || null,
      unit: unit,
      reorder_level: 20,
      prescription_required: determinePrescriptionRequired(genericName, form),
      controlled_drug: false,
      is_active: true,
    });
  }

  console.log(`   Selected ${brandsToProcess.length} premier brand medicines to insert!`);

  if (brandsToProcess.length === 0) {
    console.log("   All top brands are already present in the database.");
    return;
  }

  console.log("\n5. Ingesting into Supabase in safe batches...");
  const BATCH_SIZE = 150;
  let insertedCount = 0;

  for (let i = 0; i < brandsToProcess.length; i += BATCH_SIZE) {
    const chunk = brandsToProcess.slice(i, i + BATCH_SIZE);
    const { error: insErr } = await supabase.from("medicines").insert(chunk);

    if (insErr) {
      console.error(`\n   Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, insErr.message);
    } else {
      insertedCount += chunk.length;
      process.stdout.write(`\r   Progress: ${insertedCount} / ${brandsToProcess.length} medicines ingested...`);
    }
  }

  console.log(`\n\n✓ Done! Successfully ingested ${insertedCount} top running Bangladeshi medicine brands.`);
  console.log(`  Total elapsed time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error("\nSeeding failed:", err);
  process.exit(1);
});
