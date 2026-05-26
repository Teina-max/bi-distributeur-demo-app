#!/usr/bin/env bun
/**
 * Seed 16 ans d'historique demo via le client HTTP Convex.
 *
 * Prerequis :
 *   - VITE_CONVEX_URL exporté dans l'environnement (ou .env.local)
 *   - Catalog déjà seedé (suppliers + products + clients)
 *
 * Usage :
 *   bun scripts/seed-historical.mjs           # tous les ans 2010-2026
 *   bun scripts/seed-historical.mjs 2024      # un seul an
 *   bun scripts/seed-historical.mjs 2020 2026 # plage d'ans
 *
 * Pourquoi un script Node externe et pas une mutation Convex aggregate :
 *   Convex limite chaque mutation à 16 MB de reads/writes cumulés. Chaîner
 *   17 années de seeding dans une seule mutation dépasse le budget. Côté Node
 *   on parallélise / séquence à notre rythme et chaque mutation reste petite.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const url = process.env.VITE_CONVEX_URL ?? process.env.CONVEX_URL;
if (!url) {
  console.error("❌ VITE_CONVEX_URL (ou CONVEX_URL) doit être défini.");
  process.exit(1);
}

const args = process.argv.slice(2).map(Number);
const startYear = args[0] ?? 2010;
const endYear = args[1] ?? args[0] ?? 2026;

if (!Number.isInteger(startYear) || !Number.isInteger(endYear)) {
  console.error("❌ Years must be integers.");
  process.exit(1);
}

const client = new ConvexHttpClient(url);

console.log(`🌱 Seeding historical demo data : ${startYear} → ${endYear}\n`);

const totals = {
  quotations: 0,
  delivery_forms: 0,
  invoices: 0,
  purchase_orders: 0,
  stock_movements: 0,
};

const t0 = Date.now();

for (let year = startYear; year <= endYear; year++) {
  const yearStart = Date.now();
  process.stdout.write(`  ${year}...`);
  try {
    const counts = await client.mutation(
      api.seeds.historicalFaker.seedYearBatch,
      { year },
    );
    Object.entries(counts).forEach(([k, v]) => {
      totals[k] += v;
    });
    const dur = ((Date.now() - yearStart) / 1000).toFixed(1);
    console.log(
      ` ✅ ${dur}s — Q:${counts.quotations} BL:${counts.delivery_forms} F:${counts.invoices} BC:${counts.purchase_orders} SM:${counts.stock_movements}`,
    );
  } catch (e) {
    console.log(` ❌ ${e.message}`);
    process.exit(2);
  }
}

const totalDur = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n🎉 Done in ${totalDur}s`);
console.log(`Totals: ${JSON.stringify(totals, null, 2)}`);
