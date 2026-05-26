/**
 * Faker.js historical seed — generate 16 years of realistic ERP data
 * for the demo tenant `toscana-beverages-demo`.
 *
 * Volume target (modéré pour rester dans Convex free tier) :
 *   - ~3000 quotations (≈ 188/an, 4/sem)
 *   - ~2100 delivery forms (70 % conversion rate)
 *   - ~1900 invoices (90 % BL → invoice)
 *   - ~800 purchase orders
 *   - ~12000 stock movements
 *
 * Architecture :
 *   - public `runHistoricalDemoSeed` mutation = entry point (callable via Convex HTTP client)
 *     Note: pour > 16 ans / > 10k rows, splitter via une action qui chaîne plusieurs runs
 *     année par année (cf. memories/learnings/2026-05-convex-mutation-pagination-budget).
 *   - usage : `pnpm exec convex run seeds.historicalFaker:runHistoricalDemoSeed`
 *
 * Hypotheses :
 *   - clients, products, suppliers déjà seedés via seedCatalog
 *   - org slug = `toscana-beverages-demo` (cf. users.ts TOSCANA_ORG_ID)
 *   - vat_rate déjà attaché à chaque product
 *
 * NOT protected by auth — POC seed only, à retirer ou gater post-V1.
 */

/* eslint-disable no-await-in-loop -- sequential inserts required (quotation -> BL -> invoice chain) */
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { TOSCANA_ORG_ID } from "./users";
import { computeVatBreakdown } from "../utils/vatBreakdown";

// Configurable parameters
const HISTORY_START_YEAR = 2010;
const HISTORY_END_YEAR = 2026;
const QUOTATIONS_PER_YEAR = 188; // ≈ 4/sem
const PO_PER_YEAR = 50;
const DELIVERY_CONVERSION_RATE = 0.7;
const INVOICE_CONVERSION_RATE = 0.9;
const PO_RECEIVED_RATE = 0.85;
const LINES_PER_DOC_MIN = 1;
const LINES_PER_DOC_MAX = 5;

// Deterministic PRNG seeded on year+index so re-runs are reproducible
const seededRandom = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

const randInt = (rng: () => number, min: number, max: number) =>
  Math.floor(rng() * (max - min + 1)) + min;

const randChoice = <T>(rng: () => number, arr: readonly T[]): T => {
  return arr[Math.floor(rng() * arr.length)] as T;
};

const SEED_USER = "teina@toscana.local";

type DocCounts = {
  quotations: number;
  delivery_forms: number;
  invoices: number;
  purchase_orders: number;
  stock_movements: number;
};

/**
 * Seed 1 year of historical data. Idempotent per year via the year_prefix
 * convention — re-running on a year already seeded will create duplicates,
 * so wipe first via wipePocAllPublic before re-seeding.
 */
export const seedYearBatch = mutation({
  args: { year: v.number() },
  handler: async (ctx, { year }): Promise<DocCounts> => {
    const counts: DocCounts = {
      quotations: 0,
      delivery_forms: 0,
      invoices: 0,
      purchase_orders: 0,
      stock_movements: 0,
    };

    // Load catalog snapshots once
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_organization", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .collect();
    const products = await ctx.db
      .query("products")
      .withIndex("by_organization", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .collect();
    const suppliers = await ctx.db
      .query("suppliers")
      .withIndex("by_organization", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .collect();

    if (
      clients.length === 0 ||
      products.length === 0 ||
      suppliers.length === 0
    ) {
      throw new Error(
        "Catalog vide. Lance d'abord seedCatalog (suppliers + products + clients).",
      );
    }

    const rng = seededRandom(year * 1000 + 42);
    const yearPrefix = year.toString().slice(-2);

    // Distribute quotations across the year as timestamps
    const yearStartMs = new Date(year, 0, 1).getTime();
    const yearEndMs = new Date(year + 1, 0, 1).getTime();
    const yearSpanMs = yearEndMs - yearStartMs;

    const buildLines = () => {
      const n = randInt(rng, LINES_PER_DOC_MIN, LINES_PER_DOC_MAX);
      const picked: Doc<"products">[] = [];
      const usedIds = new Set<Id<"products">>();
      while (picked.length < n) {
        const p = randChoice(rng, products);
        if (!usedIds.has(p._id)) {
          usedIds.add(p._id);
          picked.push(p);
        }
      }
      return picked.map((p) => {
        const quantity = randInt(rng, 1, 12);
        return {
          product_id: p._id,
          product_code: p.code,
          product_name: p.name,
          quantity,
          unit_price_ht: p.price_ht,
          vat_rate: p.vat_rate,
          line_total_ht: Number((quantity * p.price_ht).toFixed(2)),
        };
      });
    };

    // === Quotations + cascade ===
    for (let i = 0; i < QUOTATIONS_PER_YEAR; i++) {
      const client = randChoice(rng, clients);
      const lines = buildLines();
      const breakdown = computeVatBreakdown(
        lines.map((l) => ({
          quantity: l.quantity,
          unit_price_ht: l.unit_price_ht,
          vat_rate: l.vat_rate,
        })),
      );
      const qNumber = `D${yearPrefix}-${String(i + 1).padStart(4, "0")}`;
      const quotationTs = yearStartMs + Math.floor(rng() * yearSpanMs);

      const goesToDelivery = rng() < DELIVERY_CONVERSION_RATE;
      const quotationId = await ctx.db.insert("quotations", {
        organization_id: TOSCANA_ORG_ID,
        client_id: client._id,
        number: qNumber,
        status: goesToDelivery ? "converted_to_delivery" : "sent",
        lines,
        total_ht: breakdown.total_ht,
        total_vat: breakdown.total_vat,
        total_ttc: breakdown.total_ttc,
        created_by: SEED_USER,
      });
      counts.quotations += 1;

      if (!goesToDelivery) continue;

      const bNumber = `B${yearPrefix}-${String(i + 1).padStart(4, "0")}`;
      const goesToInvoice = rng() < INVOICE_CONVERSION_RATE;
      const deliveryId = await ctx.db.insert("delivery_forms", {
        organization_id: TOSCANA_ORG_ID,
        quotation_id: quotationId,
        client_id: client._id,
        number: bNumber,
        status: goesToInvoice ? "invoiced" : "delivered",
        lines,
        total_ht: breakdown.total_ht,
        total_ttc: breakdown.total_ttc,
        delivered_at: quotationTs + 24 * 3600 * 1000, // J+1
        created_by: SEED_USER,
      });
      counts.delivery_forms += 1;

      // Stock movements (negative delta per line)
      for (const line of lines) {
        await ctx.db.insert("stock_movements", {
          organization_id: TOSCANA_ORG_ID,
          product_id: line.product_id,
          delta: -line.quantity,
          reason: "delivery_form_out",
          reference_kind: "delivery_form",
          reference_id: deliveryId,
          note: `BL ${bNumber}`,
        });
        counts.stock_movements += 1;
      }

      if (!goesToInvoice) continue;

      const fNumber = `F${yearPrefix}-${String(i + 1).padStart(4, "0")}`;
      const paid = rng() < 0.85;
      await ctx.db.insert("invoices", {
        organization_id: TOSCANA_ORG_ID,
        delivery_form_ids: [deliveryId],
        client_id: client._id,
        number: fNumber,
        status: paid ? "paid" : "sent",
        total_ht: breakdown.total_ht,
        total_ttc: breakdown.total_ttc,
        due_date:
          quotationTs + (client.payment_terms_days + 1) * 24 * 3600 * 1000,
        sent_at: quotationTs + 2 * 24 * 3600 * 1000, // J+2
      });
      counts.invoices += 1;
    }

    // === Purchase orders + stock in ===
    for (let i = 0; i < PO_PER_YEAR; i++) {
      const supplier = randChoice(rng, suppliers);
      const poLines = buildLines().map((l) => ({
        product_id: l.product_id,
        product_code: l.product_code,
        product_name: l.product_name,
        quantity_ordered: randInt(rng, 20, 80),
        quantity_received: 0,
        unit_purchase_price_ht: Number((l.unit_price_ht * 0.55).toFixed(2)),
        vat_rate: l.vat_rate,
      }));
      const received = rng() < PO_RECEIVED_RATE;
      poLines.forEach((l) => {
        l.quantity_received = received ? l.quantity_ordered : 0;
      });
      const poBreakdown = computeVatBreakdown(
        poLines.map((l) => ({
          quantity: l.quantity_ordered,
          unit_price_ht: l.unit_purchase_price_ht,
          vat_rate: l.vat_rate,
        })),
      );
      const bcNumber = `BC${yearPrefix}-${String(i + 1).padStart(4, "0")}`;
      const poTs = yearStartMs + Math.floor(rng() * yearSpanMs);
      const poId = await ctx.db.insert("purchase_orders", {
        organization_id: TOSCANA_ORG_ID,
        supplier_id: supplier._id,
        number: bcNumber,
        status: received ? "received" : "sent",
        lines: poLines,
        total_ht: poBreakdown.total_ht,
        total_ttc: poBreakdown.total_ttc,
        received_at: received ? poTs + 5 * 24 * 3600 * 1000 : null,
        created_by: SEED_USER,
      });
      counts.purchase_orders += 1;

      if (received) {
        for (const line of poLines) {
          await ctx.db.insert("stock_movements", {
            organization_id: TOSCANA_ORG_ID,
            product_id: line.product_id,
            delta: line.quantity_received,
            reason: "purchase_order_in",
            reference_kind: "purchase_order",
            reference_id: poId,
            note: `BC ${bcNumber}`,
          });
          counts.stock_movements += 1;
        }
      }
    }

    return counts;
  },
});

/**
 * Pour chaîner les 17 années (2010-2026), utiliser le script Node externe :
 *
 *     bun scripts/seed-historical.mjs
 *
 * Ce script appelle `seedYearBatch` année par année via le client HTTP
 * Convex, ce qui évite de dépasser le budget mutation 16 MB.
 *
 * Constantes exportées pour le script externe :
 */
export const HISTORY_BOUNDS = {
  start: HISTORY_START_YEAR,
  end: HISTORY_END_YEAR,
} as const;
