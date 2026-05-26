/* eslint-disable no-await-in-loop -- per-product/per-document iteration kept sequential to stay under read budget */
import { v } from "convex/values";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { QueryCtx } from "@convex/_generated/server";
import { orgQuery } from "@convex/auth/functions";
import {
  buildClientMonthInvoiceRow,
  type ClientMonthInvoicesDto,
} from "@convex/legacy/dto/clientMonthInvoices";
import {
  buildSimilarClient,
  buildTimelineEntry,
  type ClientProductHistoryDto,
  type ProductTimelineEntry,
  type SimilarClientRow,
} from "@convex/legacy/dto/clientProductHistory";
import {
  buildClientYearRow,
  type ClientYearRow,
  type ClientYearlyRevenueDto,
} from "@convex/legacy/dto/clientYearlyRevenue";
import {
  toClientSeasonalityDto,
  type ClientPersonalSeasonalityDto,
} from "@convex/legacy/dto/clientPersonalSeasonality";
import {
  buildAbandonedRow,
  buildCrossSellRow,
  type AbandonedProductRow,
  type ClientOpportunitiesDto,
  type CrossSellProductRow,
} from "@convex/legacy/dto/clientOpportunities";

const DAY_MS = 24 * 60 * 60 * 1000;

async function ensureClient(
  ctx: QueryCtx,
  id: Id<"clients">,
  organizationId: string,
): Promise<Doc<"clients"> | null> {
  const doc = await ctx.db.get(id);
  if (doc?.organization_id !== organizationId) return null;
  return doc;
}

// ─────────────────────────────────────────────────────────────────────
// 1. Factures d'un mois précis pour ce client
// ─────────────────────────────────────────────────────────────────────

export const getClientMonthInvoices = orgQuery({
  roles: ["owner", "admin", "member"],
  args: {
    client_id: v.id("clients"),
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args): Promise<ClientMonthInvoicesDto | null> => {
    const client = await ensureClient(ctx, args.client_id, args.organizationId);
    if (!client) return null;

    const monthStart = Date.UTC(args.year, args.month - 1, 1);
    const monthEnd = Date.UTC(args.year, args.month, 1);

    const docs = await ctx.db
      .query("legacy_documents")
      .withIndex("by_client_and_date", (q) =>
        q
          .eq("client_id", args.client_id)
          .gte("document_date", monthStart)
          .lt("document_date", monthEnd),
      )
      .take(200);

    const invoices = docs.filter((d) => d.kind === "invoice");
    let totalHt = 0;
    let totalTtc = 0;

    const rows = await Promise.all(
      invoices.map(async (doc) => {
        const lines = await ctx.db
          .query("legacy_document_lines")
          .withIndex("by_document", (q) => q.eq("document_id", doc._id))
          .take(100);
        totalHt += doc.total_ht;
        totalTtc += doc.total_ttc;
        return buildClientMonthInvoiceRow({
          id: doc._id,
          legacy_number: doc.legacy_number,
          document_date: doc.document_date,
          total_ht: doc.total_ht,
          total_ttc: doc.total_ttc,
          comment: doc.comment,
          line_count: lines.length,
        });
      }),
    );
    rows.sort((a, b) => a.document_date - b.document_date);

    return {
      year: args.year,
      month: args.month,
      total_ca_ht: Math.round(totalHt * 100) / 100,
      total_ttc: Math.round(totalTtc * 100) / 100,
      invoice_count: invoices.length,
      invoices: rows,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────
// 2. Historique d'un article pour ce client + clients similaires
// ─────────────────────────────────────────────────────────────────────

export const getClientProductHistory = orgQuery({
  roles: ["owner", "admin", "member"],
  args: {
    client_id: v.id("clients"),
    product_id: v.id("products"),
  },
  handler: async (ctx, args): Promise<ClientProductHistoryDto | null> => {
    const client = await ensureClient(ctx, args.client_id, args.organizationId);
    if (!client) return null;
    const product = await ctx.db.get(args.product_id);
    if (!product) return null;

    const lines = await ctx.db
      .query("legacy_document_lines")
      .withIndex("by_product_and_date", (q) =>
        q.eq("product_id", args.product_id),
      )
      .take(5000);

    type TimeAcc = {
      qty: number;
      ca: number;
      weighted_ttc: number;
      qty_for_avg: number;
    };
    type ClientAcc = { qty: number; ca: number; name?: string; code?: string };

    const ownTimeline = new Map<string, TimeAcc>();
    const perOtherClient = new Map<string, ClientAcc>();
    let totalQty = 0;
    let totalCa = 0;
    let weightedTtc = 0;
    let qtyForAvg = 0;
    let firstAt: number | null = null;
    let lastAt: number | null = null;
    let purchaseCount = 0;

    for (const line of lines) {
      if (line.document_kind !== "invoice") continue;
      if (line.client_id === args.client_id) {
        const key = `${new Date(line.document_date).getUTCFullYear()}-${
          new Date(line.document_date).getUTCMonth() + 1
        }`;
        let acc = ownTimeline.get(key);
        if (!acc) {
          acc = { qty: 0, ca: 0, weighted_ttc: 0, qty_for_avg: 0 };
          ownTimeline.set(key, acc);
        }
        acc.qty += line.quantity;
        acc.ca += line.line_total_ht;
        if (line.quantity > 0) {
          acc.weighted_ttc += line.unit_price_ttc * line.quantity;
          acc.qty_for_avg += line.quantity;
          weightedTtc += line.unit_price_ttc * line.quantity;
          qtyForAvg += line.quantity;
        }
        totalQty += line.quantity;
        totalCa += line.line_total_ht;
        purchaseCount++;
        if (firstAt === null || line.document_date < firstAt) {
          firstAt = line.document_date;
        }
        if (lastAt === null || line.document_date > lastAt) {
          lastAt = line.document_date;
        }
      } else if (line.client_id !== null) {
        let acc = perOtherClient.get(line.client_id as string);
        if (!acc) {
          acc = { qty: 0, ca: 0 };
          perOtherClient.set(line.client_id as string, acc);
        }
        acc.qty += line.quantity;
        acc.ca += line.line_total_ht;
      }
    }

    const timeline: ProductTimelineEntry[] = [...ownTimeline.entries()]
      .map(([key, acc]) => {
        const [y, m] = key.split("-").map(Number);
        return buildTimelineEntry({
          year: y,
          month: m,
          qty: acc.qty,
          ca_ht: acc.ca,
          avg_unit_price_ttc:
            acc.qty_for_avg > 0 ? acc.weighted_ttc / acc.qty_for_avg : 0,
        });
      })
      .sort((a, b) => a.year - b.year || a.month - b.month);

    const topOthers = [...perOtherClient.entries()]
      .sort((a, b) => b[1].ca - a[1].ca)
      .slice(0, 5);
    const otherClientIds = topOthers.map(([id]) => id as Id<"clients">);
    const otherClientsDocs = await Promise.all(
      otherClientIds.map(async (cid) => ctx.db.get(cid)),
    );
    const similarClients: SimilarClientRow[] = topOthers.map(
      ([clientId, acc], idx) => {
        const doc = otherClientsDocs[idx];
        return buildSimilarClient({
          client_id: clientId as Id<"clients">,
          code: doc?.code ?? "—",
          name: doc?.name ?? "Client inconnu",
          qty_purchased: acc.qty,
          ca_ht: acc.ca,
        });
      },
    );

    return {
      product_id: args.product_id,
      code: product.code,
      name: product.name,
      family_code: product.family_code ?? null,
      total_qty: Math.round(totalQty * 100) / 100,
      total_ca_ht: Math.round(totalCa * 100) / 100,
      avg_unit_price_ttc:
        qtyForAvg > 0 ? Math.round((weightedTtc / qtyForAvg) * 100) / 100 : 0,
      first_purchase_at: firstAt,
      last_purchase_at: lastAt,
      purchase_count: purchaseCount,
      timeline,
      similar_clients: similarClients,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────
// 3. CA par année 2011-2026 + archive pré-2011
// ─────────────────────────────────────────────────────────────────────

export const getClientYearlyRevenue = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { client_id: v.id("clients") },
  handler: async (ctx, args): Promise<ClientYearlyRevenueDto | null> => {
    const client = await ensureClient(ctx, args.client_id, args.organizationId);
    if (!client) return null;

    const [monthly, archive] = await Promise.all([
      ctx.db
        .query("client_monthly_stats")
        .withIndex("by_client_and_period", (q) =>
          q.eq("client_id", args.client_id),
        )
        .take(300),
      ctx.db
        .query("legacy_archive_summary")
        .withIndex("by_client_and_year", (q) =>
          q.eq("client_id", args.client_id),
        )
        .take(30),
    ]);

    type Acc = { ca_ht: number; invoice_count: number };
    const perYearMonthly = new Map<number, Acc>();
    for (const row of monthly) {
      if (row.invoice_count === 0) continue;
      let acc = perYearMonthly.get(row.year);
      if (!acc) {
        acc = { ca_ht: 0, invoice_count: 0 };
        perYearMonthly.set(row.year, acc);
      }
      acc.ca_ht += row.ca_ht;
      acc.invoice_count += row.invoice_count;
    }

    const rows: ClientYearRow[] = [];
    for (const arch of archive) {
      rows.push(
        buildClientYearRow({
          year: arch.year,
          ca_ht: arch.ca_ht,
          invoice_count: arch.invoice_count,
          is_archive: true,
        }),
      );
    }
    for (const [year, acc] of perYearMonthly) {
      rows.push(
        buildClientYearRow({
          year,
          ca_ht: acc.ca_ht,
          invoice_count: acc.invoice_count,
          is_archive: false,
        }),
      );
    }
    rows.sort((a, b) => a.year - b.year);

    const activeRows = rows.filter((r) => r.ca_ht > 0);
    let bestYear: number | null = null;
    let bestCa = 0;
    let worstYear: number | null = null;
    let worstCa = Number.POSITIVE_INFINITY;
    for (const r of activeRows) {
      if (r.ca_ht > bestCa) {
        bestCa = r.ca_ht;
        bestYear = r.year;
      }
      if (r.ca_ht < worstCa) {
        worstCa = r.ca_ht;
        worstYear = r.year;
      }
    }
    const lastTwo = rows.filter((r) => !r.is_archive).slice(-2);
    const growthPctLast =
      lastTwo.length === 2 && lastTwo[0].ca_ht > 0
        ? Math.round(
            ((lastTwo[1].ca_ht - lastTwo[0].ca_ht) / lastTwo[0].ca_ht) * 10000,
          ) / 100
        : null;

    return {
      rows,
      best_year: bestYear,
      best_year_ca_ht: Math.round(bestCa * 100) / 100,
      worst_year_with_activity: worstYear,
      worst_year_ca_ht:
        worstCa === Number.POSITIVE_INFINITY
          ? 0
          : Math.round(worstCa * 100) / 100,
      growth_pct_last_year: growthPctLast,
      total_ca_ht:
        Math.round(rows.reduce((s, r) => s + r.ca_ht, 0) * 100) / 100,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────
// 4. Profil saisonnier personnel du client
// ─────────────────────────────────────────────────────────────────────

export const getClientPersonalSeasonality = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { client_id: v.id("clients") },
  handler: async (ctx, args): Promise<ClientPersonalSeasonalityDto | null> => {
    const client = await ensureClient(ctx, args.client_id, args.organizationId);
    if (!client) return null;

    const stats = await ctx.db
      .query("client_monthly_stats")
      .withIndex("by_client_and_period", (q) =>
        q.eq("client_id", args.client_id),
      )
      .take(300);

    const perMonth = new Map<number, { total: number; years: Set<number> }>();
    for (const row of stats) {
      if (row.invoice_count === 0) continue;
      let acc = perMonth.get(row.month);
      if (!acc) {
        acc = { total: 0, years: new Set<number>() };
        perMonth.set(row.month, acc);
      }
      acc.total += row.ca_ht;
      acc.years.add(row.year);
    }
    return toClientSeasonalityDto(perMonth);
  },
});

// ─────────────────────────────────────────────────────────────────────
// 5 + 6. Articles abandonnés + cross-sell opportunités (combinés)
// ─────────────────────────────────────────────────────────────────────

export const getClientOpportunities = orgQuery({
  roles: ["owner", "admin", "member"],
  args: {
    client_id: v.id("clients"),
    monthsThreshold: v.optional(v.number()),
    crossSellLimit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ClientOpportunitiesDto | null> => {
    const client = await ensureClient(ctx, args.client_id, args.organizationId);
    if (!client) return null;

    const monthsThreshold = args.monthsThreshold ?? 12;
    const crossSellLimit = args.crossSellLimit ?? 10;
    const cutoff = Date.now() - monthsThreshold * 30 * DAY_MS;

    // Scan all client lines once.
    const lines = await ctx.db
      .query("legacy_document_lines")
      .withIndex("by_client_and_date", (q) => q.eq("client_id", args.client_id))
      .take(8000);

    type PA = {
      product_id: Id<"products"> | null;
      code: string;
      name: string;
      last_at: number;
      ca: number;
      qty: number;
    };
    const perProduct = new Map<string, PA>();
    const ownProductIds = new Set<string>();
    for (const line of lines) {
      if (line.document_kind !== "invoice") continue;
      if (!line.product_legacy_code) continue;
      const key = line.product_id ?? `code:${line.product_legacy_code}`;
      let acc = perProduct.get(key as string);
      if (!acc) {
        acc = {
          product_id: line.product_id,
          code: line.product_legacy_code,
          name: line.product_legacy_name,
          last_at: line.document_date,
          ca: 0,
          qty: 0,
        };
        perProduct.set(key as string, acc);
      }
      if (line.document_date > acc.last_at) acc.last_at = line.document_date;
      acc.ca += line.line_total_ht;
      acc.qty += line.quantity;
      if (line.product_id) ownProductIds.add(line.product_id as string);
    }

    // Abandoned = last < cutoff AND ca > 0.
    const abandoned: AbandonedProductRow[] = [];
    const now = Date.now();
    for (const acc of perProduct.values()) {
      if (acc.last_at >= cutoff) continue;
      if (acc.ca <= 0) continue;
      // Resolve family if product_id available
      const product = acc.product_id ? await ctx.db.get(acc.product_id) : null;
      abandoned.push(
        buildAbandonedRow({
          product_id: acc.product_id,
          code: acc.code,
          name: acc.name,
          family_code: product?.family_code ?? null,
          last_purchase_at: acc.last_at,
          days_since: Math.floor((now - acc.last_at) / DAY_MS),
          ca_historical_ht: acc.ca,
          total_qty_historical: acc.qty,
        }),
      );
    }
    abandoned.sort((a, b) => b.ca_historical_ht - a.ca_historical_ht);

    // Cross-sell: top globally selling products that this client never bought.
    const productStats = await ctx.db
      .query("product_monthly_stats")
      .withIndex("by_organization_and_period", (q) =>
        q.eq("organization_id", args.organizationId).gte("year", 2024),
      )
      .take(15000);
    type CSAcc = {
      ca: number;
      qty: number;
      weighted_ttc: number;
      qty_for_avg: number;
      months_count: number;
    };
    const perStatsProduct = new Map<string, CSAcc>();
    for (const row of productStats) {
      const pid = row.product_id as string;
      if (ownProductIds.has(pid)) continue;
      let acc = perStatsProduct.get(pid);
      if (!acc) {
        acc = {
          ca: 0,
          qty: 0,
          weighted_ttc: 0,
          qty_for_avg: 0,
          months_count: 0,
        };
        perStatsProduct.set(pid, acc);
      }
      acc.ca += row.ca_ht;
      acc.qty += row.quantity_sold;
      acc.months_count += 1;
    }

    const topCrossSellEntries = [...perStatsProduct.entries()]
      .sort((a, b) => b[1].ca - a[1].ca)
      .slice(0, crossSellLimit);

    const crossSellRows: CrossSellProductRow[] = [];
    for (const [pid, acc] of topCrossSellEntries) {
      const product = await ctx.db.get(pid as Id<"products">);
      if (!product) continue;
      crossSellRows.push(
        buildCrossSellRow({
          product_id: pid as Id<"products">,
          code: product.code,
          name: product.name,
          family_code: product.family_code ?? null,
          popularity_score: acc.ca,
          top_buyer_count: acc.months_count,
          avg_unit_price_ttc: 0,
        }),
      );
    }

    return {
      months_threshold: monthsThreshold,
      abandoned: abandoned.slice(0, 20),
      cross_sell: crossSellRows,
    };
  },
});
