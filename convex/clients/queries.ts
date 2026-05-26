import { v } from "convex/values";
import type { Id } from "@convex/_generated/dataModel";
import type { QueryCtx } from "@convex/_generated/server";
import { orgQuery } from "@convex/auth/functions";
import {
  toClientActivityDto,
  type ClientActivityDto,
} from "@convex/clients/dto/clientActivity";
import {
  toClientActivitySummaryDto,
  type ClientActivitySummaryDto,
} from "@convex/clients/dto/clientActivitySummary";
import {
  toClientDetailDto,
  type ClientDetailDto,
} from "@convex/clients/dto/clientDetail";
import {
  toClientListItemDto,
  type ClientListItemDto,
} from "@convex/clients/dto/clientListItem";

const DEFAULT_LIST_LIMIT = 50;
const RECENT_ACTIVITY_LIMIT = 10;
const SUMMARY_ACTIVITY_LIMIT = 500;

const byOrg = <T extends { organization_id: string }>(
  rows: readonly T[],
  organizationId: string,
): T[] => rows.filter((row) => row.organization_id === organizationId);

const MAX_VISIBILITY_FETCH_BUDGET = 200;

export async function listCatalogHandler(
  ctx: QueryCtx,
  args: {
    organizationId: string;
    query?: string;
    limit?: number;
    include_hidden?: boolean;
  },
): Promise<ClientListItemDto[]> {
  const limit = args.limit ?? DEFAULT_LIST_LIMIT;
  const trimmed = (args.query ?? "").trim();
  const includeHidden = args.include_hidden ?? false;
  const fetchBudget = includeHidden
    ? limit
    : Math.min(limit * 2, MAX_VISIBILITY_FETCH_BUDGET);
  const visibleFilter = (row: { is_visible?: boolean }) =>
    includeHidden ? true : row.is_visible !== false;

  if (trimmed.length === 0) {
    const rows = await ctx.db
      .query("clients")
      .withIndex("by_organization_and_code", (q) =>
        q.eq("organization_id", args.organizationId),
      )
      .order("asc")
      .take(fetchBudget);
    return rows.filter(visibleFilter).slice(0, limit).map(toClientListItemDto);
  }

  const rows = await ctx.db
    .query("clients")
    .withSearchIndex("by_search_tokens", (q) =>
      q.search("name", trimmed).eq("organization_id", args.organizationId),
    )
    .take(fetchBudget);
  return rows.filter(visibleFilter).slice(0, limit).map(toClientListItemDto);
}

export const listCatalog = orgQuery({
  roles: ["owner", "admin", "member"],
  args: {
    query: v.optional(v.string()),
    limit: v.optional(v.number()),
    include_hidden: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<ClientListItemDto[]> =>
    listCatalogHandler(ctx, args),
});

export async function getByIdHandler(
  ctx: QueryCtx,
  args: {
    organizationId: string;
    id: Id<"clients">;
  },
): Promise<ClientDetailDto | null> {
  const doc = await ctx.db.get(args.id);
  if (doc?.organization_id !== args.organizationId) return null;
  return toClientDetailDto(doc);
}

export const getById = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { id: v.id("clients") },
  handler: async (ctx, args): Promise<ClientDetailDto | null> =>
    getByIdHandler(ctx, args),
});

export async function getActivityByIdHandler(
  ctx: QueryCtx,
  args: {
    organizationId: string;
    id: Id<"clients">;
  },
): Promise<ClientActivityDto | null> {
  const [client, quotations, deliveryForms, invoices] = await Promise.all([
    ctx.db.get(args.id),
    ctx.db
      .query("quotations")
      .withIndex("by_client_and_creation", (q) => q.eq("client_id", args.id))
      .order("desc")
      .take(RECENT_ACTIVITY_LIMIT),
    ctx.db
      .query("delivery_forms")
      .withIndex("by_client_and_creation", (q) => q.eq("client_id", args.id))
      .order("desc")
      .take(RECENT_ACTIVITY_LIMIT),
    ctx.db
      .query("invoices")
      .withIndex("by_client_and_creation", (q) => q.eq("client_id", args.id))
      .order("desc")
      .take(RECENT_ACTIVITY_LIMIT),
  ]);

  if (client?.organization_id !== args.organizationId) return null;

  return toClientActivityDto(
    client,
    byOrg(quotations, args.organizationId),
    byOrg(deliveryForms, args.organizationId),
    byOrg(invoices, args.organizationId),
  );
}

export const getActivityById = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { id: v.id("clients") },
  handler: async (ctx, args): Promise<ClientActivityDto | null> =>
    getActivityByIdHandler(ctx, args),
});

export async function getActivitySummaryHandler(
  ctx: QueryCtx,
  args: {
    organizationId: string;
    id: Id<"clients">;
  },
): Promise<ClientActivitySummaryDto | null> {
  const [client, quotations, deliveryForms, invoices] = await Promise.all([
    ctx.db.get(args.id),
    ctx.db
      .query("quotations")
      .withIndex("by_client_and_creation", (q) => q.eq("client_id", args.id))
      .order("desc")
      .take(SUMMARY_ACTIVITY_LIMIT),
    ctx.db
      .query("delivery_forms")
      .withIndex("by_client_and_creation", (q) => q.eq("client_id", args.id))
      .order("desc")
      .take(SUMMARY_ACTIVITY_LIMIT),
    ctx.db
      .query("invoices")
      .withIndex("by_client_and_creation", (q) => q.eq("client_id", args.id))
      .order("desc")
      .take(SUMMARY_ACTIVITY_LIMIT),
  ]);

  if (client?.organization_id !== args.organizationId) return null;

  return toClientActivitySummaryDto({
    quotations: byOrg(quotations, args.organizationId),
    deliveryForms: byOrg(deliveryForms, args.organizationId),
    invoices: byOrg(invoices, args.organizationId),
  });
}

export const getActivitySummary = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { id: v.id("clients") },
  handler: async (ctx, args): Promise<ClientActivitySummaryDto | null> =>
    getActivitySummaryHandler(ctx, args),
});
