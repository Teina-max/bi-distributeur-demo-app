import { v } from "convex/values";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { orgQuery } from "@convex/auth/functions";
import {
  DAY_MS,
  periodMs,
  readAllOrgClients,
  readAllOrgStats,
  readProductStatsFromYear,
  readStatsFromYear,
  type StatRow,
} from "@convex/insights/shared";
import {
  computeClientStatus,
  type ClientStatus,
} from "@convex/utils/clientStatus";
import {
  toInsightsOverviewDto,
  type InsightsOverviewDto,
} from "@convex/insights/dto/insightsOverview";
import {
  toClientSegmentsDto,
  type ClientSegmentDto,
} from "@convex/insights/dto/clientSegments";
import {
  toTopClientDto,
  type TopClientDto,
} from "@convex/insights/dto/topClient";
import {
  toDormantClientDto,
  type DormantClientDto,
} from "@convex/insights/dto/dormantClient";
import {
  toGlobalSeasonalityDto,
  type SeasonalityMonthDto,
} from "@convex/insights/dto/globalSeasonality";
import {
  toFamilyMixDto,
  type FamilyMixDto,
} from "@convex/insights/dto/familyMix";
import {
  toRevenueTimelineDto,
  type RevenueTimelineDto,
} from "@convex/insights/dto/revenueTimeline";
import {
  toGrowthYoYDto,
  type GrowthYoYDto,
  type GrowthSourceRow,
} from "@convex/insights/dto/growthYoY";

// ─────────────────────────────────────────────────────────────────────
// Aggregation helpers (read primitives live in ./shared.ts).
// ─────────────────────────────────────────────────────────────────────

type ClientAcc = {
  ca_total_ht: number;
  ca_12m_ht: number;
  ca_prev_12m_ht: number;
  total_invoices: number;
  total_invoices_12m: number;
  last_year_month: number; // YYYYMM, for ordering
  last_invoice_at: number | null; // anchored at month-15 UTC (best effort)
  sparkline_12m: number[]; // 12 entries, oldest first
};

function emptyAcc(): ClientAcc {
  return {
    ca_total_ht: 0,
    ca_12m_ht: 0,
    ca_prev_12m_ht: 0,
    total_invoices: 0,
    total_invoices_12m: 0,
    last_year_month: 0,
    last_invoice_at: null,
    sparkline_12m: new Array(12).fill(0),
  };
}

function buildClientAccs(
  rows: readonly StatRow[],
  now: number,
): Map<string, ClientAcc> {
  const map = new Map<string, ClientAcc>();
  const cutoff12 = now - 365 * DAY_MS;
  const cutoff24 = now - 2 * 365 * DAY_MS;
  const sparklineStartYearMonth = ymKey(
    new Date(now - 11 * 30 * DAY_MS).getUTCFullYear(),
    new Date(now - 11 * 30 * DAY_MS).getUTCMonth() + 1,
  );
  for (const row of rows) {
    const key = row.client_id as string;
    let acc = map.get(key);
    if (!acc) {
      acc = emptyAcc();
      map.set(key, acc);
    }
    const pms = periodMs(row);
    acc.ca_total_ht += row.ca_ht;
    acc.total_invoices += row.invoice_count;
    if (pms >= cutoff12) {
      acc.ca_12m_ht += row.ca_ht;
      acc.total_invoices_12m += row.invoice_count;
    } else if (pms >= cutoff24) {
      acc.ca_prev_12m_ht += row.ca_ht;
    }
    const yk = ymKey(row.year, row.month);
    if (row.invoice_count > 0 && yk > acc.last_year_month) {
      acc.last_year_month = yk;
      acc.last_invoice_at = pms;
    }
    if (yk >= sparklineStartYearMonth) {
      const idx = monthOffsetFromKey(sparklineStartYearMonth, yk);
      if (idx >= 0 && idx < 12) acc.sparkline_12m[idx] += row.ca_ht;
    }
  }
  return map;
}

function ymKey(year: number, month: number): number {
  return year * 100 + month;
}

function monthOffsetFromKey(start: number, key: number): number {
  const sy = Math.floor(start / 100);
  const sm = start % 100;
  const ky = Math.floor(key / 100);
  const km = key % 100;
  return (ky - sy) * 12 + (km - sm);
}

// ─────────────────────────────────────────────────────────────────────
// 1. Overview KPIs
// ─────────────────────────────────────────────────────────────────────

export const getOverview = orgQuery({
  roles: ["owner", "admin", "member"],
  args: {},
  handler: async (ctx, args): Promise<InsightsOverviewDto> => {
    const now = Date.now();
    const currentYear = new Date(now).getUTCFullYear();
    const cutoff12 = now - 365 * DAY_MS;
    const cutoff24 = now - 2 * 365 * DAY_MS;

    // Only the last ~3 years are needed for the 12m vs prev-12m comparison.
    const fromYear = currentYear - 2;
    const [stats, clients, oldestArchive] = await Promise.all([
      readStatsFromYear(ctx, args.organizationId, fromYear),
      readAllOrgClients(ctx, args.organizationId),
      // Single oldest archive row to expose the historical depth indicator.
      ctx.db
        .query("legacy_archive_summary")
        .withIndex("by_organization_and_year", (q) =>
          q.eq("organization_id", args.organizationId),
        )
        .order("asc")
        .take(1),
    ]);

    let ca12 = 0;
    let caPrev12 = 0;
    let invoices12 = 0;
    const active12 = new Set<string>();
    let oldestYear: number | null = null;
    for (const row of stats) {
      const pms = periodMs(row);
      if (oldestYear === null || row.year < oldestYear) oldestYear = row.year;
      if (pms >= cutoff12) {
        if (row.invoice_count > 0) {
          ca12 += row.ca_ht;
          invoices12 += row.invoice_count;
          active12.add(row.client_id as string);
        }
      } else if (pms >= cutoff24 && row.invoice_count > 0) {
        caPrev12 += row.ca_ht;
      }
    }
    if (oldestArchive.length > 0) {
      const archiveOldest = oldestArchive[0].year;
      if (oldestYear === null || archiveOldest < oldestYear) {
        oldestYear = archiveOldest;
      }
    }

    return toInsightsOverviewDto({
      total_clients: clients.length,
      active_client_ids_12m: active12,
      ca_12m_ht: ca12,
      ca_prev_12m_ht: caPrev12,
      total_invoices_12m: invoices12,
      oldest_data_year: oldestYear,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────
// 2. Client segments by status
// ─────────────────────────────────────────────────────────────────────

export const getClientSegments = orgQuery({
  roles: ["owner", "admin", "member"],
  args: {},
  handler: async (ctx, args): Promise<ClientSegmentDto[]> => {
    const now = Date.now();
    const [stats, clients] = await Promise.all([
      readAllOrgStats(ctx, args.organizationId),
      readAllOrgClients(ctx, args.organizationId),
    ]);
    const accs = buildClientAccs(stats, now);

    type SegAcc = {
      count: number;
      ca_12m_ht: number;
      ca_total_ht: number;
      names: { name: string; ca: number }[];
    };
    const perStatus = new Map<ClientStatus, SegAcc>();

    for (const client of clients) {
      const acc = accs.get(client._id);
      const lifetime = acc ?? emptyAcc();
      const status = computeClientStatus({
        last_invoice_at: lifetime.last_invoice_at,
        ca_12m_ht: lifetime.ca_12m_ht,
        total_invoices: lifetime.total_invoices,
        now,
      });
      let seg = perStatus.get(status);
      if (!seg) {
        seg = { count: 0, ca_12m_ht: 0, ca_total_ht: 0, names: [] };
        perStatus.set(status, seg);
      }
      seg.count++;
      seg.ca_12m_ht += lifetime.ca_12m_ht;
      seg.ca_total_ht += lifetime.ca_total_ht;
      seg.names.push({ name: client.name, ca: lifetime.ca_12m_ht });
    }

    const compact = new Map<
      ClientStatus,
      { count: number; ca_12m_ht: number; ca_total_ht: number; names: string[] }
    >();
    for (const [status, seg] of perStatus) {
      compact.set(status, {
        count: seg.count,
        ca_12m_ht: seg.ca_12m_ht,
        ca_total_ht: seg.ca_total_ht,
        names: [...seg.names].sort((a, b) => b.ca - a.ca).map((n) => n.name),
      });
    }
    return toClientSegmentsDto(compact);
  },
});

// ─────────────────────────────────────────────────────────────────────
// 3. Top clients by CA 12m
// ─────────────────────────────────────────────────────────────────────

export const getTopClients = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<TopClientDto[]> => {
    const now = Date.now();
    const currentYear = new Date(now).getUTCFullYear();
    const limit = args.limit ?? 200;
    // 12-month window only — top clients are scored on recent CA. Reads ~16k docs.
    const [stats, clients] = await Promise.all([
      readStatsFromYear(ctx, args.organizationId, currentYear - 1),
      readAllOrgClients(ctx, args.organizationId),
    ]);
    const accs = buildClientAccs(stats, now);

    const byId = new Map<string, Doc<"clients">>(
      clients.map((c) => [c._id, c]),
    );

    const candidates: TopClientDto[] = [];
    for (const [clientId, acc] of accs) {
      if (acc.ca_12m_ht <= 0) continue;
      const client = byId.get(clientId);
      if (!client) continue;
      candidates.push(
        toTopClientDto({
          client_id: client._id,
          code: client.code,
          name: client.name,
          vendor: client.vendor ?? null,
          sector: client.sector ?? null,
          ca_12m_ht: acc.ca_12m_ht,
          ca_total_ht: acc.ca_total_ht,
          last_invoice_at: acc.last_invoice_at,
          sparkline_12m: acc.sparkline_12m,
          status: computeClientStatus({
            last_invoice_at: acc.last_invoice_at,
            ca_12m_ht: acc.ca_12m_ht,
            total_invoices: acc.total_invoices,
            now,
          }),
        }),
      );
    }
    candidates.sort((a, b) => b.ca_12m_ht - a.ca_12m_ht);
    return candidates.slice(0, limit);
  },
});

// ─────────────────────────────────────────────────────────────────────
// 4. Dormant / lost clients with historical value
// ─────────────────────────────────────────────────────────────────────

export const getDormantClients = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<DormantClientDto[]> => {
    const now = Date.now();
    const limit = args.limit ?? 200;
    const [stats, clients] = await Promise.all([
      readAllOrgStats(ctx, args.organizationId),
      readAllOrgClients(ctx, args.organizationId),
    ]);
    const accs = buildClientAccs(stats, now);
    const byId = new Map<string, Doc<"clients">>(
      clients.map((c) => [c._id, c]),
    );

    const rows: DormantClientDto[] = [];
    for (const [clientId, acc] of accs) {
      if (acc.ca_total_ht <= 0) continue;
      const client = byId.get(clientId);
      if (!client) continue;
      const status = computeClientStatus({
        last_invoice_at: acc.last_invoice_at,
        ca_12m_ht: acc.ca_12m_ht,
        total_invoices: acc.total_invoices,
        now,
      });
      if (status !== "dormant" && status !== "lost") continue;
      const daysSince =
        acc.last_invoice_at !== null
          ? Math.floor((now - acc.last_invoice_at) / DAY_MS)
          : null;
      rows.push(
        toDormantClientDto({
          client_id: client._id,
          code: client.code,
          name: client.name,
          vendor: client.vendor ?? null,
          sector: client.sector ?? null,
          last_invoice_at: acc.last_invoice_at,
          days_since_last: daysSince,
          ca_total_ht: acc.ca_total_ht,
          total_invoices: acc.total_invoices,
          status,
        }),
      );
    }
    rows.sort((a, b) => b.ca_total_ht - a.ca_total_ht);
    return rows.slice(0, limit);
  },
});

// ─────────────────────────────────────────────────────────────────────
// 5. Global seasonality (5-year average per calendar month)
// ─────────────────────────────────────────────────────────────────────

export const getGlobalSeasonality = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { yearsBack: v.optional(v.number()) },
  handler: async (ctx, args): Promise<SeasonalityMonthDto[]> => {
    // Default capped at 3 years to stay under the 32k read budget
    // (700 clients × 36 months ≈ 25k stats).
    const yearsBack = Math.min(args.yearsBack ?? 3, 3);
    const now = Date.now();
    const currentYear = new Date(now).getUTCFullYear();
    const cutoff = now - yearsBack * 365 * DAY_MS;
    const stats = await readStatsFromYear(
      ctx,
      args.organizationId,
      currentYear - yearsBack,
    );
    const perMonth = new Map<number, { total: number; years: Set<number> }>();
    for (const row of stats) {
      const pms = periodMs(row);
      if (pms < cutoff) continue;
      if (row.invoice_count === 0) continue;
      let acc = perMonth.get(row.month);
      if (!acc) {
        acc = { total: 0, years: new Set<number>() };
        perMonth.set(row.month, acc);
      }
      acc.total += row.ca_ht;
      acc.years.add(row.year);
    }
    return toGlobalSeasonalityDto(perMonth);
  },
});

// ─────────────────────────────────────────────────────────────────────
// 6. Global family mix
// ─────────────────────────────────────────────────────────────────────

export const getGlobalFamilyMix = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { monthsBack: v.optional(v.number()) },
  handler: async (ctx, args): Promise<FamilyMixDto> => {
    const monthsBack = args.monthsBack ?? 12;
    const now = Date.now();
    const currentYear = new Date(now).getUTCFullYear();
    const cutoff = now - monthsBack * 30 * DAY_MS;
    const fromYear = currentYear - Math.ceil(monthsBack / 12);
    const allRows = await readProductStatsFromYear(
      ctx,
      args.organizationId,
      fromYear,
    );
    const rows = allRows.filter(
      (r) => Date.UTC(r.year, r.month - 1, 15) >= cutoff,
    );
    const productIds = new Set<Id<"products">>();
    for (const row of rows) productIds.add(row.product_id);
    const productsList = await Promise.all(
      [...productIds].map(async (pid) => ctx.db.get(pid)),
    );
    const productById = new Map<string, Doc<"products">>();
    for (const product of productsList) {
      if (product) productById.set(product._id, product);
    }

    const perFamily = new Map<
      string,
      { ca_ht: number; qty_sold: number; product_ids: Set<string> }
    >();
    for (const row of rows) {
      const product = productById.get(row.product_id);
      const family = product?.family_code ?? "_INCONNU";
      let acc = perFamily.get(family);
      if (!acc) {
        acc = { ca_ht: 0, qty_sold: 0, product_ids: new Set<string>() };
        perFamily.set(family, acc);
      }
      acc.ca_ht += row.ca_ht;
      acc.qty_sold += row.quantity_sold;
      acc.product_ids.add(row.product_id);
    }

    return toFamilyMixDto({
      perFamily,
      familyNames: new Map<string, string>(), // names hydrated client-side if needed
      monthsBack,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────
// 7. Revenue timeline (16 years × 12 months) + archive pre-2011
// ─────────────────────────────────────────────────────────────────────

export const getRevenueTimeline = orgQuery({
  roles: ["owner", "admin", "member"],
  args: {},
  handler: async (ctx, args): Promise<RevenueTimelineDto> => {
    // 2011-2026 monthly heatmap only. Pre-2011 archive lives behind
    // getArchiveYearly to keep this function under the 32k read budget.
    const stats = await readAllOrgStats(ctx, args.organizationId);

    const monthly = new Map<
      string,
      {
        year: number;
        month: number;
        ca_ht: number;
        invoice_count: number;
        client_ids: Set<string>;
      }
    >();
    for (const row of stats) {
      if (row.invoice_count === 0) continue;
      const key = `${row.year}-${row.month}`;
      let entry = monthly.get(key);
      if (!entry) {
        entry = {
          year: row.year,
          month: row.month,
          ca_ht: 0,
          invoice_count: 0,
          client_ids: new Set<string>(),
        };
        monthly.set(key, entry);
      }
      entry.ca_ht += row.ca_ht;
      entry.invoice_count += row.invoice_count;
      entry.client_ids.add(row.client_id as string);
    }

    return toRevenueTimelineDto({
      monthly,
      archive: new Map<number, { ca_ht: number; invoice_count: number }>(),
    });
  },
});

// Aggregated yearly archive (pre-2011). Read budget ~8k.
export const getArchiveYearly = orgQuery({
  roles: ["owner", "admin", "member"],
  args: {},
  handler: async (
    ctx,
    args,
  ): Promise<{ year: number; ca_ht: number; invoice_count: number }[]> => {
    const rows = await ctx.db
      .query("legacy_archive_summary")
      .withIndex("by_organization_and_year", (q) =>
        q.eq("organization_id", args.organizationId),
      )
      .take(15000);
    const perYear = new Map<number, { ca_ht: number; invoice_count: number }>();
    for (const row of rows) {
      let entry = perYear.get(row.year);
      if (!entry) {
        entry = { ca_ht: 0, invoice_count: 0 };
        perYear.set(row.year, entry);
      }
      entry.ca_ht += row.ca_ht;
      entry.invoice_count += row.invoice_count;
    }
    return [...perYear.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, acc]) => ({
        year,
        ca_ht: Math.round(acc.ca_ht * 100) / 100,
        invoice_count: acc.invoice_count,
      }));
  },
});

// ─────────────────────────────────────────────────────────────────────
// 8. Growth Year-over-Year (top growers + decliners)
// ─────────────────────────────────────────────────────────────────────

export const getGrowthYoY = orgQuery({
  roles: ["owner", "admin", "member"],
  args: {
    year: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<GrowthYoYDto> => {
    const targetYear = args.year ?? new Date().getUTCFullYear();
    const prevYear = targetYear - 1;
    const limit = args.limit ?? 10;
    const [stats, clients] = await Promise.all([
      readStatsFromYear(ctx, args.organizationId, prevYear),
      readAllOrgClients(ctx, args.organizationId),
    ]);
    const byId = new Map<string, Doc<"clients">>(
      clients.map((c) => [c._id, c]),
    );

    const perClient = new Map<
      string,
      { ca_current: number; ca_prev: number }
    >();
    for (const row of stats) {
      if (row.year !== targetYear && row.year !== prevYear) continue;
      if (row.invoice_count === 0) continue;
      let acc = perClient.get(row.client_id as string);
      if (!acc) {
        acc = { ca_current: 0, ca_prev: 0 };
        perClient.set(row.client_id as string, acc);
      }
      if (row.year === targetYear) acc.ca_current += row.ca_ht;
      else acc.ca_prev += row.ca_ht;
    }

    const rows: GrowthSourceRow[] = [];
    for (const [clientId, acc] of perClient) {
      const client = byId.get(clientId);
      if (!client) continue;
      rows.push({
        client_id: client._id,
        code: client.code,
        name: client.name,
        ca_current: acc.ca_current,
        ca_prev: acc.ca_prev,
      });
    }
    return toGrowthYoYDto({ year: targetYear, prevYear, rows, limit });
  },
});
