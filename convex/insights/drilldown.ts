/* eslint-disable no-await-in-loop -- bounded per-product queries are intentionally sequential to stay under the read budget */
import { v } from "convex/values";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { orgQuery } from "@convex/auth/functions";
import {
  computeClientStatus,
  type ClientStatus,
} from "@convex/utils/clientStatus";
import {
  ALL_STATS_MAX,
  DAY_MS,
  periodMs,
  readAllOrgClients,
  readAllOrgStats,
  readProductStatsFromYear,
  readStatsFromYear,
} from "@convex/insights/shared";
import {
  toSegmentClientRow,
  type SegmentClientRow,
  type SegmentClientsDrilldownDto,
} from "@convex/insights/dto/segmentClientsDrilldown";
import {
  buildMonthClientRow,
  buildMonthFamilyRow,
  type MonthDetailsDrilldownDto,
} from "@convex/insights/dto/monthDetailsDrilldown";
import {
  buildSeasonalClientRow,
  buildSeasonalYearRow,
  type SeasonalMonthDrilldownDto,
} from "@convex/insights/dto/seasonalMonthDrilldown";
import {
  buildFamilyClientRow,
  buildFamilyProductRow,
  type FamilyDetailsDrilldownDto,
} from "@convex/insights/dto/familyDetailsDrilldown";
import {
  buildActiveClientRow,
  type ActiveClientsDrilldownDto,
} from "@convex/insights/dto/activeClientsDrilldown";
import {
  BASKET_BIN_RANGES,
  buildBasketBin,
  type BasketHistogramDto,
} from "@convex/insights/dto/basketHistogramDrilldown";

const statusArg = v.union(
  v.literal("new"),
  v.literal("top"),
  v.literal("regular"),
  v.literal("occasional"),
  v.literal("dormant"),
  v.literal("lost"),
);

const MONTH_LABELS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

// ─────────────────────────────────────────────────────────────────────
// 1. Clients d'un segment de status
// ─────────────────────────────────────────────────────────────────────

export const getClientsBySegment = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { status: statusArg, limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<SegmentClientsDrilldownDto> => {
    const limit = args.limit ?? 200;
    const now = Date.now();
    const [stats, clients] = await Promise.all([
      readAllOrgStats(ctx, args.organizationId),
      readAllOrgClients(ctx, args.organizationId),
    ]);

    type Acc = {
      ca_total_ht: number;
      ca_12m_ht: number;
      total_invoices: number;
      last_invoice_at: number | null;
    };
    const accs = new Map<string, Acc>();
    const cutoff12 = now - 365 * DAY_MS;
    for (const row of stats) {
      const key = row.client_id as string;
      let acc = accs.get(key);
      if (!acc) {
        acc = {
          ca_total_ht: 0,
          ca_12m_ht: 0,
          total_invoices: 0,
          last_invoice_at: null,
        };
        accs.set(key, acc);
      }
      acc.ca_total_ht += row.ca_ht;
      acc.total_invoices += row.invoice_count;
      const pms = periodMs(row);
      if (pms >= cutoff12) acc.ca_12m_ht += row.ca_ht;
      if (
        row.invoice_count > 0 &&
        (acc.last_invoice_at === null || pms > acc.last_invoice_at)
      ) {
        acc.last_invoice_at = pms;
      }
    }

    const rows: SegmentClientRow[] = [];
    for (const client of clients) {
      const acc = accs.get(client._id) ?? {
        ca_total_ht: 0,
        ca_12m_ht: 0,
        total_invoices: 0,
        last_invoice_at: null,
      };
      const status: ClientStatus = computeClientStatus({
        last_invoice_at: acc.last_invoice_at,
        ca_12m_ht: acc.ca_12m_ht,
        total_invoices: acc.total_invoices,
        now,
      });
      if (status !== args.status) continue;
      rows.push(
        toSegmentClientRow({
          client_id: client._id,
          code: client.code,
          name: client.name,
          vendor: client.vendor ?? null,
          sector: client.sector ?? null,
          ca_12m_ht: acc.ca_12m_ht,
          ca_total_ht: acc.ca_total_ht,
          last_invoice_at: acc.last_invoice_at,
          total_invoices: acc.total_invoices,
        }),
      );
    }
    rows.sort((a, b) => b.ca_total_ht - a.ca_total_ht);
    return {
      status: args.status,
      count: rows.length,
      rows: rows.slice(0, limit),
    };
  },
});

// ─────────────────────────────────────────────────────────────────────
// 2. Détails d'un mois précis (year+month) — heatmap cell
// ─────────────────────────────────────────────────────────────────────

export const getMonthDetails = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { year: v.number(), month: v.number() },
  handler: async (ctx, args): Promise<MonthDetailsDrilldownDto> => {
    const statsForMonth = await ctx.db
      .query("client_monthly_stats")
      .withIndex("by_organization_and_period", (q) =>
        q
          .eq("organization_id", args.organizationId)
          .eq("year", args.year)
          .eq("month", args.month),
      )
      .take(2000);
    const productStatsForMonth = await ctx.db
      .query("product_monthly_stats")
      .withIndex("by_organization_and_period", (q) =>
        q
          .eq("organization_id", args.organizationId)
          .eq("year", args.year)
          .eq("month", args.month),
      )
      .take(2000);

    const clientIds = new Set<Id<"clients">>();
    for (const row of statsForMonth) clientIds.add(row.client_id);
    const clientsList = await Promise.all(
      [...clientIds].map(async (cid) => ctx.db.get(cid)),
    );
    const clientById = new Map<string, Doc<"clients">>();
    for (const client of clientsList) {
      if (client) clientById.set(client._id, client);
    }

    const productIds = new Set<Id<"products">>();
    for (const row of productStatsForMonth) productIds.add(row.product_id);
    const productsList = await Promise.all(
      [...productIds].map(async (pid) => ctx.db.get(pid)),
    );
    const productById = new Map<string, Doc<"products">>();
    for (const product of productsList) {
      if (product) productById.set(product._id, product);
    }

    let totalCa = 0;
    let totalInvoices = 0;
    const activeClients = new Set<string>();
    const topClientRows = statsForMonth
      .filter((r) => r.invoice_count > 0)
      .map((row) => {
        const client = clientById.get(row.client_id);
        totalCa += row.ca_ht;
        totalInvoices += row.invoice_count;
        activeClients.add(row.client_id as string);
        return buildMonthClientRow({
          client_id: row.client_id,
          code: client?.code ?? "—",
          name: client?.name ?? "Client inconnu",
          ca_ht: row.ca_ht,
          invoice_count: row.invoice_count,
        });
      })
      .sort((a, b) => b.ca_ht - a.ca_ht)
      .slice(0, 500);

    const familyAcc = new Map<string, { ca: number; qty: number }>();
    for (const row of productStatsForMonth) {
      const product = productById.get(row.product_id);
      const family = product?.family_code ?? "_INCONNU";
      let acc = familyAcc.get(family);
      if (!acc) {
        acc = { ca: 0, qty: 0 };
        familyAcc.set(family, acc);
      }
      acc.ca += row.ca_ht;
      acc.qty += row.quantity_sold;
    }
    const productTotal = [...familyAcc.values()].reduce((s, a) => s + a.ca, 0);
    const familyBreakdown = [...familyAcc.entries()]
      .map(([family_code, acc]) =>
        buildMonthFamilyRow(family_code, acc.ca, acc.qty, productTotal),
      )
      .sort((a, b) => b.ca_ht - a.ca_ht)
      .slice(0, 10);

    return {
      year: args.year,
      month: args.month,
      total_ca_ht: Math.round(totalCa * 100) / 100,
      total_invoices: totalInvoices,
      active_clients: activeClients.size,
      top_clients: topClientRows,
      family_breakdown: familyBreakdown,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────
// 3. Saisonnalité d'un mois calendaire — détail par année
// ─────────────────────────────────────────────────────────────────────

export const getSeasonalMonthDetails = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { month: v.number(), yearsBack: v.optional(v.number()) },
  handler: async (ctx, args): Promise<SeasonalMonthDrilldownDto> => {
    const yearsBack = Math.min(args.yearsBack ?? 5, 10);
    const now = Date.now();
    const currentYear = new Date(now).getUTCFullYear();
    const fromYear = currentYear - yearsBack;
    const stats = await readStatsFromYear(
      ctx,
      args.organizationId,
      fromYear,
      ALL_STATS_MAX,
    );
    const filtered = stats.filter((r) => r.month === args.month);

    const perYear = new Map<
      number,
      { ca: number; invoices: number; clients: Set<string> }
    >();
    const perClient = new Map<string, { ca: number; invoices: number }>();
    for (const row of filtered) {
      if (row.invoice_count === 0) continue;
      let yacc = perYear.get(row.year);
      if (!yacc) {
        yacc = { ca: 0, invoices: 0, clients: new Set<string>() };
        perYear.set(row.year, yacc);
      }
      yacc.ca += row.ca_ht;
      yacc.invoices += row.invoice_count;
      yacc.clients.add(row.client_id as string);

      let cacc = perClient.get(row.client_id as string);
      if (!cacc) {
        cacc = { ca: 0, invoices: 0 };
        perClient.set(row.client_id as string, cacc);
      }
      cacc.ca += row.ca_ht;
      cacc.invoices += row.invoice_count;
    }

    const clientIds = [...perClient.keys()] as Id<"clients">[];
    const clientsList = await Promise.all(
      clientIds.map(async (cid) => ctx.db.get(cid)),
    );
    const clientById = new Map<string, Doc<"clients">>();
    for (const client of clientsList) {
      if (client) clientById.set(client._id, client);
    }

    const topClients = [...perClient.entries()]
      .map(([clientId, acc]) => {
        const client = clientById.get(clientId);
        return buildSeasonalClientRow({
          client_id: clientId as Id<"clients">,
          code: client?.code ?? "—",
          name: client?.name ?? "Client inconnu",
          ca_ht: acc.ca,
          invoice_count: acc.invoices,
        });
      })
      .sort((a, b) => b.ca_ht - a.ca_ht)
      .slice(0, 500);

    const yearBreakdown = [...perYear.entries()]
      .map(([year, acc]) =>
        buildSeasonalYearRow({
          year,
          ca_ht: acc.ca,
          invoice_count: acc.invoices,
          active_clients: acc.clients.size,
        }),
      )
      .sort((a, b) => a.year - b.year);

    const totalCa = yearBreakdown.reduce((s, r) => s + r.ca_ht, 0);
    const yearsCount = yearBreakdown.length;
    const avgCa = yearsCount > 0 ? totalCa / yearsCount : 0;

    return {
      month: args.month,
      label: MONTH_LABELS[args.month - 1] ?? `M${args.month}`,
      years_back: yearsBack,
      avg_ca_ht: Math.round(avgCa * 100) / 100,
      year_breakdown: yearBreakdown,
      top_clients: topClients,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────
// 4. Détails d'une famille — top produits + top clients
// ─────────────────────────────────────────────────────────────────────

export const getFamilyDetails = orgQuery({
  roles: ["owner", "admin", "member"],
  args: {
    family_code: v.string(),
    monthsBack: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<FamilyDetailsDrilldownDto> => {
    const monthsBack = args.monthsBack ?? 12;
    const now = Date.now();
    const currentYear = new Date(now).getUTCFullYear();
    const cutoff = now - monthsBack * 30 * DAY_MS;
    const fromYear = currentYear - Math.ceil(monthsBack / 12);

    const productsInFamily = await ctx.db
      .query("products")
      .withIndex("by_organization_and_family", (q) =>
        q
          .eq("organization_id", args.organizationId)
          .eq("family_code", args.family_code),
      )
      .take(500);
    const productIds = new Set<string>(
      productsInFamily.map((p) => p._id as string),
    );
    if (productIds.size === 0) {
      return {
        family_code: args.family_code,
        months_back: monthsBack,
        total_ca_ht: 0,
        total_qty: 0,
        product_count: 0,
        client_count: 0,
        top_products: [],
        top_clients: [],
      };
    }

    // Stats articles last yearsBack filtered to this family
    const allProductStats = await readProductStatsFromYear(
      ctx,
      args.organizationId,
      fromYear,
    );
    const familyStats = allProductStats.filter(
      (r) =>
        Date.UTC(r.year, r.month - 1, 15) >= cutoff &&
        productIds.has(r.product_id as string),
    );

    type ProdAcc = { ca: number; qty: number };
    const perProduct = new Map<string, ProdAcc>();
    let totalCa = 0;
    let totalQty = 0;
    for (const row of familyStats) {
      let acc = perProduct.get(row.product_id as string);
      if (!acc) {
        acc = { ca: 0, qty: 0 };
        perProduct.set(row.product_id as string, acc);
      }
      acc.ca += row.ca_ht;
      acc.qty += row.quantity_sold;
      totalCa += row.ca_ht;
      totalQty += row.quantity_sold;
    }

    const productById = new Map<string, Doc<"products">>(
      productsInFamily.map((p) => [p._id, p]),
    );
    const topProducts = [...perProduct.entries()]
      .map(([productId, acc]) => {
        const product = productById.get(productId);
        return buildFamilyProductRow({
          product_id: productId as Id<"products">,
          code: product?.code ?? "—",
          name: product?.name ?? "Article inconnu",
          ca_ht: acc.ca,
          qty_sold: acc.qty,
          unique_clients: 0, // populated below from legacy_document_lines if needed; left 0 for V1
        });
      })
      .sort((a, b) => b.ca_ht - a.ca_ht)
      .slice(0, 500);

    // For top clients on a family, scan legacy_document_lines invoice for these products.
    // Bounded read: take first 8000 lines from product index (sufficient on a single family).
    type ClientAcc = { ca: number; qty: number };
    const perClient = new Map<string, ClientAcc>();
    for (const productId of productIds) {
      const lines = await ctx.db
        .query("legacy_document_lines")
        .withIndex("by_product_and_date", (q) =>
          q
            .eq("product_id", productId as Id<"products">)
            .gte("document_date", cutoff),
        )
        .take(1000);
      for (const line of lines) {
        if (line.document_kind !== "invoice") continue;
        if (!line.client_id) continue;
        let acc = perClient.get(line.client_id as string);
        if (!acc) {
          acc = { ca: 0, qty: 0 };
          perClient.set(line.client_id as string, acc);
        }
        acc.ca += line.line_total_ht;
        acc.qty += line.quantity;
      }
    }

    const clientIds = [...perClient.keys()] as Id<"clients">[];
    const clientsList = await Promise.all(
      clientIds.map(async (cid) => ctx.db.get(cid)),
    );
    const clientById = new Map<string, Doc<"clients">>();
    for (const client of clientsList) {
      if (client) clientById.set(client._id, client);
    }
    const topClients = [...perClient.entries()]
      .map(([clientId, acc]) => {
        const client = clientById.get(clientId);
        return buildFamilyClientRow({
          client_id: clientId as Id<"clients">,
          code: client?.code ?? "—",
          name: client?.name ?? "Client inconnu",
          ca_ht: acc.ca,
          qty_purchased: acc.qty,
        });
      })
      .sort((a, b) => b.ca_ht - a.ca_ht)
      .slice(0, 500);

    return {
      family_code: args.family_code,
      months_back: monthsBack,
      total_ca_ht: Math.round(totalCa * 100) / 100,
      total_qty: Math.round(totalQty * 100) / 100,
      product_count: perProduct.size,
      client_count: perClient.size,
      top_products: topProducts,
      top_clients: topClients,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────
// 5. Liste clients actifs sur N mois — alphabétique
// ─────────────────────────────────────────────────────────────────────

export const getActiveClientsList = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { monthsBack: v.optional(v.number()) },
  handler: async (ctx, args): Promise<ActiveClientsDrilldownDto> => {
    const monthsBack = args.monthsBack ?? 12;
    const now = Date.now();
    const currentYear = new Date(now).getUTCFullYear();
    const fromYear = currentYear - Math.ceil(monthsBack / 12);
    const cutoff = now - monthsBack * 30 * DAY_MS;

    const [stats, clients] = await Promise.all([
      readStatsFromYear(ctx, args.organizationId, fromYear),
      readAllOrgClients(ctx, args.organizationId),
    ]);
    const clientById = new Map<string, Doc<"clients">>(
      clients.map((c) => [c._id, c]),
    );

    type Acc = {
      ca: number;
      invoices: number;
      last: number | null;
    };
    const accs = new Map<string, Acc>();
    for (const row of stats) {
      const pms = periodMs(row);
      if (pms < cutoff) continue;
      if (row.invoice_count === 0) continue;
      let acc = accs.get(row.client_id as string);
      if (!acc) {
        acc = { ca: 0, invoices: 0, last: null };
        accs.set(row.client_id as string, acc);
      }
      acc.ca += row.ca_ht;
      acc.invoices += row.invoice_count;
      if (acc.last === null || pms > acc.last) acc.last = pms;
    }

    const rows = [...accs.entries()]
      .map(([clientId, acc]) => {
        const client = clientById.get(clientId);
        return buildActiveClientRow({
          client_id: clientId as Id<"clients">,
          code: client?.code ?? "—",
          name: client?.name ?? "Client inconnu",
          vendor: client?.vendor ?? null,
          ca_period_ht: acc.ca,
          invoice_count: acc.invoices,
          last_invoice_at: acc.last,
        });
      })
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));

    return {
      months_back: monthsBack,
      count: rows.length,
      rows,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────
// 6. Histogramme des paniers — bins
// ─────────────────────────────────────────────────────────────────────

export const getBasketHistogram = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { monthsBack: v.optional(v.number()) },
  handler: async (ctx, args): Promise<BasketHistogramDto> => {
    const monthsBack = args.monthsBack ?? 12;
    const now = Date.now();
    const currentYear = new Date(now).getUTCFullYear();
    const fromYear = currentYear - Math.ceil(monthsBack / 12);
    const cutoff = now - monthsBack * 30 * DAY_MS;
    const stats = await readStatsFromYear(ctx, args.organizationId, fromYear);

    // For each (client, period) with invoices, compute average basket.
    type Basket = { ca: number; count: number };
    const baskets: Basket[] = [];
    let totalCa = 0;
    let totalInvoices = 0;
    for (const row of stats) {
      const pms = periodMs(row);
      if (pms < cutoff) continue;
      if (row.invoice_count === 0) continue;
      const basketValue = row.ca_ht / row.invoice_count;
      // Push one entry per invoice approximate (basket size repeated invoice_count times)
      // For the histogram we want per-invoice distribution.
      for (let i = 0; i < row.invoice_count; i++) {
        baskets.push({ ca: basketValue, count: 1 });
      }
      totalCa += row.ca_ht;
      totalInvoices += row.invoice_count;
    }

    type BinAcc = { count: number; ca: number };
    const binAccs: BinAcc[] = BASKET_BIN_RANGES.map(() => ({
      count: 0,
      ca: 0,
    }));
    for (const b of baskets) {
      const idx = BASKET_BIN_RANGES.findIndex(
        (range) =>
          b.ca >= range.min && (range.max === null || b.ca < range.max),
      );
      if (idx >= 0) {
        binAccs[idx].count++;
        binAccs[idx].ca += b.ca;
      }
    }
    const bins = BASKET_BIN_RANGES.map((range, i) =>
      buildBasketBin(
        {
          label: range.label,
          min: range.min,
          max: range.max,
          count: binAccs[i].count,
          ca_ht: binAccs[i].ca,
          share_pct: 0,
        },
        totalCa,
      ),
    );

    const sortedBaskets = baskets.map((b) => b.ca).sort((a, b) => a - b);
    const median =
      sortedBaskets.length > 0
        ? sortedBaskets[Math.floor(sortedBaskets.length / 2)]
        : 0;
    const avg = totalInvoices > 0 ? totalCa / totalInvoices : 0;

    return {
      months_back: monthsBack,
      total_invoices: totalInvoices,
      total_ca_ht: Math.round(totalCa * 100) / 100,
      avg_basket_ht: Math.round(avg * 100) / 100,
      median_basket_ht: Math.round(median * 100) / 100,
      bins,
    };
  },
});
