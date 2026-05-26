/* eslint-disable no-await-in-loop -- paginated import is intentionally sequential to bound Convex read/write budgets */
import { v } from "convex/values";
import {
  internalAction,
  action,
  mutation,
  internalQuery,
  query,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { TOSCANA_ORG_ID } from "../seeds/users";
import {
  toLegacyImportReportDto,
  type LegacyImportReportDto,
} from "./dto/legacyImportReport";
import type { Id } from "../_generated/dataModel";

const matchMethodArg = v.union(
  v.literal("exact"),
  v.literal("strict"),
  v.literal("fuzzy"),
  v.literal("manual"),
  v.literal("unknown"),
  v.literal("empty"),
);

const kindArg = v.union(
  v.literal("invoice"),
  v.literal("quotation"),
  v.literal("delivery_form"),
);

const resolutionArg = v.union(
  v.literal("pending"),
  v.literal("manual"),
  v.literal("merged_to_bucket"),
);

const addressArg = v.object({
  street: v.string(),
  postal_code: v.string(),
  city: v.string(),
  country: v.string(),
});

// ─────────────────────────────────────────────────────────────────────
// WIPE — internal action that loops the chunk-delete mutation per table
// ─────────────────────────────────────────────────────────────────────

const LEGACY_TABLES = [
  "legacy_documents",
  "legacy_document_lines",
  "legacy_archive_summary",
  "legacy_unknown_aliases",
  "client_monthly_stats",
  "product_monthly_stats",
] as const;

type LegacyTable = (typeof LEGACY_TABLES)[number];

export const wipeLegacyAll = internalAction({
  args: {},
  handler: async (ctx): Promise<{ deleted: Record<LegacyTable, number> }> => {
    const deleted = {} as Record<LegacyTable, number>;
    for (const table of LEGACY_TABLES) {
      let total = 0;
      let hasMore = true;
      while (hasMore) {
        const res = await ctx.runMutation(
          internal.legacy.mutations.wipeLegacyChunk,
          { table },
        );
        total += res.deleted;
        hasMore = res.hasMore;
      }
      deleted[table] = total;
    }
    return { deleted };
  },
});

// ─────────────────────────────────────────────────────────────────────
// COMPUTE MONTHLY STATS — internal action paginating legacy_documents +
// legacy_document_lines, writes batches of 500 into the stats tables.
// ─────────────────────────────────────────────────────────────────────

const STATS_BATCH = 500;
const SCAN_BATCH = 500;

type ClientStatKey = string; // `${clientId}|${year}|${month}`
type ProductStatKey = string; // `${productId}|${year}|${month}`

type ClientStatAcc = {
  client_id: Id<"clients">;
  year: number;
  month: number;
  invoice_count: number;
  quotation_count: number;
  delivery_form_count: number;
  ca_ht: number;
  ca_ttc: number;
  product_ids: Set<string>;
};

type ProductStatAcc = {
  product_id: Id<"products">;
  year: number;
  month: number;
  quantity_sold: number;
  ca_ht: number;
  margin_ht: number;
  client_ids: Set<string>;
};

export const computeMonthlyStats = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    client_periods_written: number;
    product_periods_written: number;
    documents_scanned: number;
    lines_scanned: number;
  }> => {
    const clientAcc = new Map<ClientStatKey, ClientStatAcc>();
    const productAcc = new Map<ProductStatKey, ProductStatAcc>();

    // Pass 1: scan headers (invoice/quotation/delivery_form) to build counters per (client, period).
    let documentsScanned = 0;
    let cursor: string | null = null;
    do {
      const page: { docs: DocScanRow[]; cursor: string | null } =
        await ctx.runQuery(internal.legacy.actions.scanLegacyDocumentsPage, {
          cursor,
          limit: SCAN_BATCH,
        });
      for (const doc of page.docs) {
        if (!doc.client_id) continue;
        const d = new Date(doc.document_date);
        const year = d.getUTCFullYear();
        const month = d.getUTCMonth() + 1;
        const key = `${doc.client_id}|${year}|${month}`;
        let entry = clientAcc.get(key);
        if (!entry) {
          entry = {
            client_id: doc.client_id,
            year,
            month,
            invoice_count: 0,
            quotation_count: 0,
            delivery_form_count: 0,
            ca_ht: 0,
            ca_ttc: 0,
            product_ids: new Set<string>(),
          };
          clientAcc.set(key, entry);
        }
        if (doc.kind === "invoice") {
          entry.invoice_count++;
          entry.ca_ht += doc.total_ht;
          entry.ca_ttc += doc.total_ttc;
        } else if (doc.kind === "quotation") {
          entry.quotation_count++;
        } else {
          entry.delivery_form_count++;
        }
      }
      documentsScanned += page.docs.length;
      cursor = page.cursor;
    } while (cursor !== null);

    // Pass 2: scan invoice lines to build product stats (qty, marge, unique clients).
    let linesScanned = 0;
    cursor = null;
    do {
      const page: { lines: LineScanRow[]; cursor: string | null } =
        await ctx.runQuery(internal.legacy.actions.scanLegacyLinesPage, {
          cursor,
          limit: SCAN_BATCH,
        });
      for (const line of page.lines) {
        if (line.document_kind !== "invoice") continue;
        if (!line.product_id) continue;
        const d = new Date(line.document_date);
        const year = d.getUTCFullYear();
        const month = d.getUTCMonth() + 1;
        const key = `${line.product_id}|${year}|${month}`;
        let entry = productAcc.get(key);
        if (!entry) {
          entry = {
            product_id: line.product_id,
            year,
            month,
            quantity_sold: 0,
            ca_ht: 0,
            margin_ht: 0,
            client_ids: new Set<string>(),
          };
          productAcc.set(key, entry);
        }
        entry.quantity_sold += line.quantity;
        entry.ca_ht += line.line_total_ht;
        entry.margin_ht +=
          line.line_total_ht - line.unit_cost_pmp * line.quantity;
        if (line.client_id) entry.client_ids.add(line.client_id);

        // Also feed unique_products on the client side.
        if (line.client_id) {
          const ckey = `${line.client_id}|${year}|${month}`;
          const centry = clientAcc.get(ckey);
          if (centry) centry.product_ids.add(line.product_id);
        }
      }
      linesScanned += page.lines.length;
      cursor = page.cursor;
    } while (cursor !== null);

    // Flush client_monthly_stats in batches.
    const clientRows = [...clientAcc.values()].map((acc) => ({
      client_id: acc.client_id,
      year: acc.year,
      month: acc.month,
      invoice_count: acc.invoice_count,
      quotation_count: acc.quotation_count,
      delivery_form_count: acc.delivery_form_count,
      ca_ht: acc.ca_ht,
      ca_ttc: acc.ca_ttc,
      unique_products: acc.product_ids.size,
    }));
    for (let i = 0; i < clientRows.length; i += STATS_BATCH) {
      const chunk = clientRows.slice(i, i + STATS_BATCH);
      await ctx.runMutation(
        internal.legacy.mutations.bulkInsertClientMonthlyStats,
        { rows: chunk },
      );
    }

    // Flush product_monthly_stats in batches.
    const productRows = [...productAcc.values()].map((acc) => ({
      product_id: acc.product_id,
      year: acc.year,
      month: acc.month,
      quantity_sold: acc.quantity_sold,
      ca_ht: acc.ca_ht,
      margin_ht: acc.margin_ht,
      unique_clients: acc.client_ids.size,
    }));
    for (let i = 0; i < productRows.length; i += STATS_BATCH) {
      const chunk = productRows.slice(i, i + STATS_BATCH);
      await ctx.runMutation(
        internal.legacy.mutations.bulkInsertProductMonthlyStats,
        { rows: chunk },
      );
    }

    return {
      client_periods_written: clientRows.length,
      product_periods_written: productRows.length,
      documents_scanned: documentsScanned,
      lines_scanned: linesScanned,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────
// Internal paginated scan helpers (used by computeMonthlyStats)
// ─────────────────────────────────────────────────────────────────────

type DocScanRow = {
  client_id: Id<"clients"> | null;
  kind: "invoice" | "quotation" | "delivery_form";
  document_date: number;
  total_ht: number;
  total_ttc: number;
};

type LineScanRow = {
  client_id: Id<"clients"> | null;
  product_id: Id<"products"> | null;
  document_kind: "invoice" | "quotation" | "delivery_form";
  document_date: number;
  quantity: number;
  line_total_ht: number;
  unit_cost_pmp: number;
};

export const scanLegacyDocumentsPage = internalQuery({
  args: {
    cursor: v.union(v.string(), v.null()),
    limit: v.number(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ docs: DocScanRow[]; cursor: string | null }> => {
    const result = await ctx.db
      .query("legacy_documents")
      .withIndex("by_organization", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .paginate({ cursor: args.cursor, numItems: args.limit });
    return {
      docs: result.page.map((d) => ({
        client_id: d.client_id,
        kind: d.kind,
        document_date: d.document_date,
        total_ht: d.total_ht,
        total_ttc: d.total_ttc,
      })),
      cursor: result.isDone ? null : result.continueCursor,
    };
  },
});

export const scanLegacyLinesPage = internalQuery({
  args: {
    cursor: v.union(v.string(), v.null()),
    limit: v.number(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ lines: LineScanRow[]; cursor: string | null }> => {
    const result = await ctx.db
      .query("legacy_document_lines")
      .withIndex("by_organization", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .paginate({ cursor: args.cursor, numItems: args.limit });
    return {
      lines: result.page.map((l) => ({
        client_id: l.client_id,
        product_id: l.product_id,
        document_kind: l.document_kind,
        document_date: l.document_date,
        quantity: l.quantity,
        line_total_ht: l.line_total_ht,
        unit_cost_pmp: l.unit_cost_pmp,
      })),
      cursor: result.isDone ? null : result.continueCursor,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────
// PUBLIC WRAPPERS — POC only, no auth. Mirror the seedCatalogPublic pattern.
// External Bun script calls these via ConvexHttpClient.
// ─────────────────────────────────────────────────────────────────────

export const wipeLegacyAllPublic = action({
  args: {},
  handler: async (ctx): Promise<{ deleted: Record<LegacyTable, number> }> => {
    return ctx.runAction(internal.legacy.actions.wipeLegacyAll, {});
  },
});

export const computeMonthlyStatsPublic = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    client_periods_written: number;
    product_periods_written: number;
    documents_scanned: number;
    lines_scanned: number;
  }> => {
    return ctx.runAction(internal.legacy.actions.computeMonthlyStats, {});
  },
});

const clientRowArg = v.object({
  code: v.string(),
  name: v.string(),
  type: v.string(),
  email: v.union(v.string(), v.null()),
  phone: v.union(v.string(), v.null()),
  address: addressArg,
  payment_terms_days: v.number(),
  payment_terms_label: v.string(),
  correspondent: v.union(v.string(), v.null()),
  vendor: v.union(v.string(), v.null()),
  sector: v.union(v.string(), v.null()),
  depot_cafe: v.union(v.string(), v.null()),
  accounting_code: v.union(v.string(), v.null()),
  credit_limit: v.union(v.number(), v.null()),
  outstanding_amount: v.number(),
  global_discount_pct: v.number(),
  tariff_level: v.number(),
  vat_intra: v.union(v.string(), v.null()),
  is_visible: v.boolean(),
  notes: v.string(),
});

export const bulkUpsertClientsPublic = mutation({
  args: { rows: v.array(clientRowArg) },
  handler: async (ctx, args): Promise<LegacyImportReportDto> => {
    const res = await ctx.runMutation(
      internal.legacy.mutations.bulkUpsertClients,
      args,
    );
    return toLegacyImportReportDto(res);
  },
});

const supplierRowArg = v.object({
  code: v.string(),
  name: v.string(),
  email: v.union(v.string(), v.null()),
  phone: v.union(v.string(), v.null()),
});

export const bulkUpsertSuppliersPublic = mutation({
  args: { rows: v.array(supplierRowArg) },
  handler: async (ctx, args): Promise<LegacyImportReportDto> => {
    const res = await ctx.runMutation(
      internal.legacy.mutations.bulkUpsertSuppliers,
      args,
    );
    return toLegacyImportReportDto(res);
  },
});

const productRowArg = v.object({
  code: v.string(),
  name: v.string(),
  description: v.string(),
  category: v.string(),
  price_ht: v.number(),
  vat_rate: v.number(),
  stock_qty: v.number(),
  stock_threshold: v.union(v.number(), v.null()),
  is_active: v.boolean(),
  conditioning: v.union(v.string(), v.null()),
  sub_family: v.union(v.string(), v.null()),
  family_code: v.union(v.string(), v.null()),
  supplier_id: v.union(v.id("suppliers"), v.null()),
  supplier_ref: v.union(v.string(), v.null()),
  accounting_sale_code: v.union(v.string(), v.null()),
  accounting_purchase_code: v.union(v.string(), v.null()),
  purchase_price_ht: v.number(),
  price_2_ttc: v.number(),
  price_3_ttc: v.number(),
});

export const bulkUpsertProductsPublic = mutation({
  args: { rows: v.array(productRowArg) },
  handler: async (ctx, args): Promise<LegacyImportReportDto> => {
    const res = await ctx.runMutation(
      internal.legacy.mutations.bulkUpsertProducts,
      args,
    );
    return toLegacyImportReportDto(res);
  },
});

const documentRowArg = v.object({
  kind: kindArg,
  source_file: v.string(),
  legacy_number: v.string(),
  client_id: v.union(v.id("clients"), v.null()),
  client_legacy_name: v.string(),
  client_match_method: matchMethodArg,
  document_date: v.number(),
  due_date: v.union(v.number(), v.null()),
  amount_paid: v.union(v.number(), v.null()),
  total_ht: v.number(),
  total_vat: v.number(),
  total_ttc: v.number(),
  comment: v.union(v.string(), v.null()),
  is_credit_note: v.optional(v.boolean()),
});

type DocumentReturn = {
  legacy_number: string;
  kind: "invoice" | "quotation" | "delivery_form";
  id: Id<"legacy_documents">;
};

export const bulkInsertDocumentsPublic = mutation({
  args: { rows: v.array(documentRowArg) },
  handler: async (
    ctx,
    args,
  ): Promise<{ inserted: number; ids: DocumentReturn[] }> => {
    return ctx.runMutation(internal.legacy.mutations.bulkInsertDocuments, args);
  },
});

const lineRowArg = v.object({
  document_id: v.id("legacy_documents"),
  document_kind: kindArg,
  document_date: v.number(),
  client_id: v.union(v.id("clients"), v.null()),
  product_id: v.union(v.id("products"), v.null()),
  product_legacy_code: v.string(),
  product_legacy_name: v.string(),
  quantity: v.number(),
  unit_price_ttc: v.number(),
  unit_cost_pmp: v.number(),
  line_total_ht: v.number(),
  vat_rate: v.number(),
  vat_amount: v.number(),
});

export const bulkInsertLinesPublic = mutation({
  args: { rows: v.array(lineRowArg) },
  handler: async (ctx, args): Promise<LegacyImportReportDto> => {
    const res = await ctx.runMutation(
      internal.legacy.mutations.bulkInsertLines,
      args,
    );
    return toLegacyImportReportDto(res);
  },
});

const archiveRowArg = v.object({
  client_id: v.union(v.id("clients"), v.null()),
  client_legacy_name: v.string(),
  year: v.number(),
  invoice_count: v.number(),
  ca_ht: v.number(),
  ca_ttc: v.number(),
});

export const bulkUpsertArchiveSummaryPublic = mutation({
  args: { rows: v.array(archiveRowArg) },
  handler: async (ctx, args): Promise<LegacyImportReportDto> => {
    const res = await ctx.runMutation(
      internal.legacy.mutations.bulkUpsertArchiveSummary,
      args,
    );
    return toLegacyImportReportDto(res);
  },
});

const unknownRowArg = v.object({
  raw_name: v.string(),
  normalized_name: v.string(),
  occurrence_count: v.number(),
  total_ca_ht: v.number(),
  first_seen: v.number(),
  last_seen: v.number(),
  resolved_client_id: v.union(v.id("clients"), v.null()),
  resolution_method: resolutionArg,
});

// ─────────────────────────────────────────────────────────────────────
// LOOKUP HELPERS — used by the Bun script to map Heritage codes → Convex Ids
// after the upsert pass. Paginated.
// ─────────────────────────────────────────────────────────────────────

const LOOKUP_PAGE = 500;

export const listClientIdsByCodePublic = query({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (
    ctx,
    args,
  ): Promise<{
    rows: { code: string; id: Id<"clients"> }[];
    cursor: string | null;
  }> => {
    const result = await ctx.db
      .query("clients")
      .withIndex("by_organization", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .paginate({ cursor: args.cursor, numItems: LOOKUP_PAGE });
    return {
      rows: result.page.map((r) => ({ code: r.code, id: r._id })),
      cursor: result.isDone ? null : result.continueCursor,
    };
  },
});

export const listProductIdsByCodePublic = query({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (
    ctx,
    args,
  ): Promise<{
    rows: { code: string; id: Id<"products"> }[];
    cursor: string | null;
  }> => {
    const result = await ctx.db
      .query("products")
      .withIndex("by_organization", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .paginate({ cursor: args.cursor, numItems: LOOKUP_PAGE });
    return {
      rows: result.page.map((r) => ({ code: r.code, id: r._id })),
      cursor: result.isDone ? null : result.continueCursor,
    };
  },
});

export const listSupplierIdsByCodePublic = query({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (
    ctx,
    args,
  ): Promise<{
    rows: { code: string; id: Id<"suppliers"> }[];
    cursor: string | null;
  }> => {
    const result = await ctx.db
      .query("suppliers")
      .withIndex("by_organization", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .paginate({ cursor: args.cursor, numItems: LOOKUP_PAGE });
    return {
      rows: result.page.map((r) => ({ code: r.code, id: r._id })),
      cursor: result.isDone ? null : result.continueCursor,
    };
  },
});

export const bulkUpsertUnknownAliasesPublic = mutation({
  args: { rows: v.array(unknownRowArg) },
  handler: async (ctx, args): Promise<LegacyImportReportDto> => {
    const res = await ctx.runMutation(
      internal.legacy.mutations.bulkUpsertUnknownAliases,
      args,
    );
    return toLegacyImportReportDto(res);
  },
});
