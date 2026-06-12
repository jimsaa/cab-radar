/**
 * One-time bulk import of Jim's Civilkoll list.
 * Reads supabase/data/jim-civilkoll-import.txt and inserts approved entries.
 *
 * Requires SUPABASE_SECRET_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 *
 * Usage: npm run import:civilkoll
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_FILE = join(ROOT, "supabase", "data", "jim-civilkoll-import.txt");
const JIM_ADMIN_ID = "ca340a4a-26d0-46b6-9286-21f5a535d370";

const REG_PATTERN = /^[A-Z0-9]{2,10}$/;

function loadEnv() {
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) {
    console.error("Missing .env.local");
    process.exit(1);
  }
  const env = Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
      })
  );
  return env;
}

function normalizeRegistration(input) {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

function parseLines(rawText) {
  let invalid = 0;
  const seen = new Set();
  const entries = [];

  for (const line of rawText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const normalized = normalizeRegistration(trimmed);
    if (!REG_PATTERN.test(normalized)) {
      invalid += 1;
      continue;
    }
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    entries.push({ normalized, originalLine: trimmed });
  }

  return { entries, invalid };
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");
    process.exit(1);
  }

  if (!existsSync(DATA_FILE)) {
    console.error(`Data file not found: ${DATA_FILE}`);
    process.exit(1);
  }

  const rawText = readFileSync(DATA_FILE, "utf8");
  const { entries, invalid } = parseLines(rawText);

  if (entries.length === 0) {
    console.error("No valid registration numbers in data file. Paste Jim's list into:");
    console.error(DATA_FILE);
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const existing = new Set();
  const BATCH = 500;

  for (let i = 0; i < entries.length; i += BATCH) {
    const chunk = entries.slice(i, i + BATCH).map((e) => e.normalized);
    const { data, error } = await supabase
      .from("civil_registry")
      .select("registration_number")
      .in("registration_number", chunk);

    if (error) {
      console.error("Fetch existing failed:", error.message);
      process.exit(1);
    }
    for (const row of data ?? []) {
      existing.add(row.registration_number);
    }
  }

  const now = new Date().toISOString();
  const observedDate = now.slice(0, 10);
  const toInsert = entries.filter((e) => !existing.has(e.normalized));
  const skipped = entries.length - toInsert.length;

  let useFullSchema = true;

  for (let i = 0; i < toInsert.length; i += BATCH) {
    const slice = toInsert.slice(i, i + BATCH);
    const fullBatch = slice.map((entry) => ({
      registration_number: entry.normalized,
      admin_note: entry.originalLine,
      observation_count: 1,
      last_observed_at: observedDate,
      approved_by: JIM_ADMIN_ID,
      approved_at: now,
      source: "admin_manual",
      status: "approved",
    }));
    const minimalBatch = slice.map((entry) => ({
      registration_number: entry.normalized,
      last_observed_at: observedDate,
    }));

    let batch = useFullSchema ? fullBatch : minimalBatch;
    let { error } = await supabase.from("civil_registry").insert(batch);

    if (error && useFullSchema && error.message.includes("schema cache")) {
      useFullSchema = false;
      console.log("Note: v2 columns missing — importing registration_number only.");
      console.log("Run migration-civilkoll-v2.sql in Supabase for full metadata.");
      batch = minimalBatch;
      ({ error } = await supabase.from("civil_registry").insert(batch));
    }

    if (error) {
      console.error("Insert failed:", error.message);
      process.exit(1);
    }
  }

  console.log(`Import complete:`);
  console.log(`  ${toInsert.length} imported`);
  console.log(`  ${skipped} skipped (duplicates)`);
  console.log(`  ${invalid} invalid lines`);
}

main();
