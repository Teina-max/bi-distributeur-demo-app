#!/usr/bin/env node
/**
 * POC live-test seed for L4 conversions.
 * Seeds a single 3-line quotation against the Toscana Beverages SARL org using already
 * seeded catalog (clients + products from seedCatalog).
 *
 * Usage:
 *   pnpm start-all  # in another terminal (boots Convex dev)
 *   node scripts/seed-poc-conversion-fixture.mjs
 *
 * Outputs the created quotation_id + number so you can navigate to the
 * sandbox harness or to /app/delivery-forms after running F8.
 *
 * Requires env: VITE_CONVEX_URL or CONVEX_URL.
 *
 * Reference: docs/superpowers/plans/poc-lots/L4-conversions.md §7 live test.
 */
import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const ORG_ID = "toscana-beverages-demo";
const CLIENT_CODE = process.env.CLIENT_CODE ?? "C001234";
const PRODUCT_CODES = (
  process.env.PRODUCT_CODES ?? "CAF-001-1KG,CAF-002-1KG,CAF-003-500G"
)
  .split(",")
  .map((s) => s.trim());
const QUANTITIES = (process.env.QUANTITIES ?? "5,2,10")
  .split(",")
  .map((s) => Number(s.trim()));

function resolveConvexUrl() {
  if (process.env.CONVEX_URL) return process.env.CONVEX_URL;
  if (process.env.VITE_CONVEX_URL) return process.env.VITE_CONVEX_URL;
  try {
    const env = readFileSync(resolve(repoRoot, ".env.local"), "utf8");
    const match = env.match(/^VITE_CONVEX_URL=(.+)$/m);
    if (match) return match[1].trim();
  } catch {
    // ignore
  }
  return null;
}

const convexUrl = resolveConvexUrl();
if (!convexUrl) {
  console.error("Missing CONVEX_URL or VITE_CONVEX_URL.");
  process.exit(1);
}

const client = new ConvexHttpClient(convexUrl);

try {
  const result = await client.mutation(
    "delivery_forms/mutations:__seedQuotationForLiveTest",
    {
      organization_id: ORG_ID,
      client_code: CLIENT_CODE,
      product_codes: PRODUCT_CODES,
      quantities: QUANTITIES,
    },
  );
  console.log(
    `Seeded quotation ${result.number} (id=${result.id}) with ${PRODUCT_CODES.length} lines.`,
  );
  console.log("Navigate to /app then trigger F8 on the quotation detail page.");
  console.log(
    "Or use the Convex dashboard to call delivery_forms.mutations.convertFromQuotation with that id.",
  );
} catch (err) {
  console.error("Seed failed:", err?.message ?? err);
  process.exit(1);
}
