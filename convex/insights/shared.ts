import type { Doc } from "@convex/_generated/dataModel";
import type { QueryCtx } from "@convex/_generated/server";

export const ALL_STATS_MAX = 28000;
export const ALL_CLIENTS_MAX = 5000;
export const ALL_PRODUCT_STATS_MAX = 28000;
export const DAY_MS = 24 * 60 * 60 * 1000;

export type StatRow = Doc<"client_monthly_stats">;
export type ProductStatRow = Doc<"product_monthly_stats">;

export function periodMs(row: StatRow): number {
  return Date.UTC(row.year, row.month - 1, 15, 12);
}

export function productPeriodMs(row: ProductStatRow): number {
  return Date.UTC(row.year, row.month - 1, 15, 12);
}

export async function readAllOrgStats(
  ctx: QueryCtx,
  organizationId: string,
): Promise<StatRow[]> {
  return ctx.db
    .query("client_monthly_stats")
    .withIndex("by_organization_and_period", (q) =>
      q.eq("organization_id", organizationId),
    )
    .take(ALL_STATS_MAX);
}

export async function readStatsFromYear(
  ctx: QueryCtx,
  organizationId: string,
  fromYear: number,
  limit: number = ALL_STATS_MAX,
): Promise<StatRow[]> {
  return ctx.db
    .query("client_monthly_stats")
    .withIndex("by_organization_and_period", (q) =>
      q.eq("organization_id", organizationId).gte("year", fromYear),
    )
    .take(limit);
}

export async function readProductStatsFromYear(
  ctx: QueryCtx,
  organizationId: string,
  fromYear: number,
  limit: number = ALL_PRODUCT_STATS_MAX,
): Promise<ProductStatRow[]> {
  return ctx.db
    .query("product_monthly_stats")
    .withIndex("by_organization_and_period", (q) =>
      q.eq("organization_id", organizationId).gte("year", fromYear),
    )
    .take(limit);
}

export async function readAllOrgClients(
  ctx: QueryCtx,
  organizationId: string,
): Promise<Doc<"clients">[]> {
  return ctx.db
    .query("clients")
    .withIndex("by_organization", (q) =>
      q.eq("organization_id", organizationId),
    )
    .take(ALL_CLIENTS_MAX);
}
