import { v } from "convex/values";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { QueryCtx } from "@convex/_generated/server";
import { orgQuery } from "@convex/auth/functions";
import {
  toClientMonthlyTimelineDto,
  type ClientMonthlyTimelineDto,
} from "@convex/legacy/dto/clientMonthlyTimeline";
import {
  toClientLifetimeStatsDto,
  type ClientLifetimeStatsDto,
} from "@convex/legacy/dto/clientLifetimeStats";
import {
  toClientProductMixDto,
  type ClientProductMixDto,
} from "@convex/legacy/dto/clientProductMix";
import {
  toClientLegacyDocumentDto,
  type ClientLegacyDocumentDto,
} from "@convex/legacy/dto/clientLegacyDocument";

const TIMELINE_MAX = 192; // 16 years × 12 months
const ARCHIVE_MAX = 30; // safety, real data is ~11 years (2000-2010)
const LIFETIME_DOCS_SAMPLE = 50; // enough to sharpen first/last invoice date
const PRODUCT_MIX_LINES_MAX = 5000;
const LEGACY_DOCS_DEFAULT_LIMIT = 20;
const LEGACY_DOCS_MAX_LIMIT = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

type LegacyDocKind = "invoice" | "quotation" | "delivery_form";
const docKindArg = v.union(
  v.literal("invoice"),
  v.literal("quotation"),
  v.literal("delivery_form"),
);

async function ensureClient(
  ctx: QueryCtx,
  id: Id<"clients">,
  organizationId: string,
): Promise<Doc<"clients"> | null> {
  const doc = await ctx.db.get(id);
  if (!doc) return null;
  if (doc.organization_id !== organizationId) return null;
  return doc;
}

// ─────────────────────────────────────────────────────────────────────
// 1. Monthly timeline — 16 years × 12 months + pre-2011 archive aggregate
// ─────────────────────────────────────────────────────────────────────

export async function getClientMonthlyTimelineHandler(
  ctx: QueryCtx,
  args: { organizationId: string; id: Id<"clients"> },
): Promise<ClientMonthlyTimelineDto | null> {
  const client = await ensureClient(ctx, args.id, args.organizationId);
  if (!client) return null;

  const [monthly, archive] = await Promise.all([
    ctx.db
      .query("client_monthly_stats")
      .withIndex("by_client_and_period", (q) => q.eq("client_id", args.id))
      .take(TIMELINE_MAX),
    ctx.db
      .query("legacy_archive_summary")
      .withIndex("by_client_and_year", (q) => q.eq("client_id", args.id))
      .take(ARCHIVE_MAX),
  ]);

  return toClientMonthlyTimelineDto({ monthly, archive });
}

export const getClientMonthlyTimeline = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { id: v.id("clients") },
  handler: async (ctx, args): Promise<ClientMonthlyTimelineDto | null> =>
    getClientMonthlyTimelineHandler(ctx, args),
});

// ─────────────────────────────────────────────────────────────────────
// 2. Lifetime stats — LTV, premier/dernier, fréquence, status auto
// ─────────────────────────────────────────────────────────────────────

export async function getClientLifetimeStatsHandler(
  ctx: QueryCtx,
  args: { organizationId: string; id: Id<"clients"> },
): Promise<ClientLifetimeStatsDto | null> {
  const client = await ensureClient(ctx, args.id, args.organizationId);
  if (!client) return null;

  const [monthly, archive, sampleDesc, sampleAsc] = await Promise.all([
    ctx.db
      .query("client_monthly_stats")
      .withIndex("by_client_and_period", (q) => q.eq("client_id", args.id))
      .take(TIMELINE_MAX),
    ctx.db
      .query("legacy_archive_summary")
      .withIndex("by_client_and_year", (q) => q.eq("client_id", args.id))
      .take(ARCHIVE_MAX),
    ctx.db
      .query("legacy_documents")
      .withIndex("by_client_and_date", (q) => q.eq("client_id", args.id))
      .order("desc")
      .take(LIFETIME_DOCS_SAMPLE),
    ctx.db
      .query("legacy_documents")
      .withIndex("by_client_and_date", (q) => q.eq("client_id", args.id))
      .order("asc")
      .take(LIFETIME_DOCS_SAMPLE),
  ]);

  return toClientLifetimeStatsDto({
    monthly,
    archive,
    legacyDocsSample: [...sampleDesc, ...sampleAsc],
    now: Date.now(),
  });
}

export const getClientLifetimeStats = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { id: v.id("clients") },
  handler: async (ctx, args): Promise<ClientLifetimeStatsDto | null> =>
    getClientLifetimeStatsHandler(ctx, args),
});

// ─────────────────────────────────────────────────────────────────────
// 3. Product mix — top 10 + mix par famille (default fenêtre 5 ans)
// ─────────────────────────────────────────────────────────────────────

export async function getClientProductMixHandler(
  ctx: QueryCtx,
  args: {
    organizationId: string;
    id: Id<"clients">;
    monthsBack?: number;
  },
): Promise<ClientProductMixDto | null> {
  const client = await ensureClient(ctx, args.id, args.organizationId);
  if (!client) return null;

  const monthsBack = args.monthsBack ?? 60;
  const cutoff = Date.now() - monthsBack * 30 * DAY_MS;

  const lines = await ctx.db
    .query("legacy_document_lines")
    .withIndex("by_client_and_date", (q) =>
      q.eq("client_id", args.id).gte("document_date", cutoff),
    )
    .order("desc")
    .take(PRODUCT_MIX_LINES_MAX);

  // Build a productsById map for family_code resolution. Convex .get is fine
  // for a bounded number of unique products (capped at PRODUCT_MIX_LINES_MAX).
  const productIds = new Set<Id<"products">>();
  for (const line of lines) {
    if (line.product_id) productIds.add(line.product_id);
  }
  const productsById = new Map<string, Doc<"products">>();
  await Promise.all(
    [...productIds].map(async (pid) => {
      const product = await ctx.db.get(pid);
      if (product) productsById.set(pid, product);
    }),
  );

  return toClientProductMixDto({
    lines,
    productsById,
    monthsBack,
  });
}

export const getClientProductMix = orgQuery({
  roles: ["owner", "admin", "member"],
  args: {
    id: v.id("clients"),
    monthsBack: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ClientProductMixDto | null> =>
    getClientProductMixHandler(ctx, args),
});

// ─────────────────────────────────────────────────────────────────────
// 4. Legacy documents drill-down — derniers documents Heritage par kind
// ─────────────────────────────────────────────────────────────────────

export async function getClientLegacyDocumentsHandler(
  ctx: QueryCtx,
  args: {
    organizationId: string;
    id: Id<"clients">;
    kind?: LegacyDocKind;
    limit?: number;
  },
): Promise<ClientLegacyDocumentDto[] | null> {
  const client = await ensureClient(ctx, args.id, args.organizationId);
  if (!client) return null;

  const limit = Math.min(
    args.limit ?? LEGACY_DOCS_DEFAULT_LIMIT,
    LEGACY_DOCS_MAX_LIMIT,
  );

  // by_client_and_date can't be filtered by kind without a compound index, so
  // we over-fetch then filter in-app. Cap kept low to bound the read budget.
  const overfetch = args.kind ? limit * 3 : limit;
  const rows = await ctx.db
    .query("legacy_documents")
    .withIndex("by_client_and_date", (q) => q.eq("client_id", args.id))
    .order("desc")
    .take(Math.min(overfetch, LEGACY_DOCS_MAX_LIMIT * 3));

  const filtered = args.kind
    ? rows.filter((doc) => doc.kind === args.kind)
    : rows;
  return filtered.slice(0, limit).map(toClientLegacyDocumentDto);
}

export const getClientLegacyDocuments = orgQuery({
  roles: ["owner", "admin", "member"],
  args: {
    id: v.id("clients"),
    kind: v.optional(docKindArg),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ClientLegacyDocumentDto[] | null> =>
    getClientLegacyDocumentsHandler(ctx, args),
});
