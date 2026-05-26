/* eslint-disable no-await-in-loop -- bulk upsert chunking is intentionally sequential to bound Convex write budget */
import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { buildSearchTokens } from "../utils/searchTokens";
import { isCommentLikeLine } from "../utils/legacyLineFilter";
import { TOSCANA_ORG_ID } from "../seeds/users";
import type { Id } from "../_generated/dataModel";

const CHUNK_DELETE = 500;

const addressArg = v.object({
  street: v.string(),
  postal_code: v.string(),
  city: v.string(),
  country: v.string(),
});

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

// ─────────────────────────────────────────────────────────────────────
// WIPE — paginated chunk delete (caller loops until hasMore === false)
// ─────────────────────────────────────────────────────────────────────

export const wipeLegacyChunk = internalMutation({
  args: {
    table: v.union(
      v.literal("legacy_documents"),
      v.literal("legacy_document_lines"),
      v.literal("legacy_archive_summary"),
      v.literal("legacy_unknown_aliases"),
      v.literal("client_monthly_stats"),
      v.literal("product_monthly_stats"),
    ),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ deleted: number; hasMore: boolean }> => {
    const rows = await ctx.db
      .query(args.table)
      .withIndex("by_organization", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .take(CHUNK_DELETE);
    await Promise.all(rows.map(async (r) => ctx.db.delete(r._id)));
    return { deleted: rows.length, hasMore: rows.length === CHUNK_DELETE };
  },
});

// ─────────────────────────────────────────────────────────────────────
// CLIENTS — bulk upsert (patch existing by code, insert otherwise)
// ─────────────────────────────────────────────────────────────────────

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

export const bulkUpsertClients = internalMutation({
  args: { rows: v.array(clientRowArg) },
  handler: async (
    ctx,
    args,
  ): Promise<{ inserted: number; updated: number }> => {
    let inserted = 0;
    let updated = 0;
    const now = Date.now();
    for (const row of args.rows) {
      const existing = await ctx.db
        .query("clients")
        .withIndex("by_organization_and_code", (q) =>
          q.eq("organization_id", TOSCANA_ORG_ID).eq("code", row.code),
        )
        .unique();
      const search_tokens = buildSearchTokens(
        row.code,
        row.name,
        row.address.city,
        row.type,
      );
      const patch = {
        name: row.name,
        type: row.type,
        email: row.email,
        phone: row.phone,
        address: row.address,
        payment_terms_days: row.payment_terms_days,
        payment_terms_label: row.payment_terms_label,
        search_tokens,
        correspondent: row.correspondent,
        vendor: row.vendor,
        sector: row.sector,
        depot_cafe: row.depot_cafe,
        accounting_code: row.accounting_code,
        credit_limit: row.credit_limit,
        outstanding_amount: row.outstanding_amount,
        global_discount_pct: row.global_discount_pct,
        tariff_level: row.tariff_level,
        vat_intra: row.vat_intra,
        is_visible: row.is_visible,
        notes: row.notes,
        legacy_imported_at: now,
      };
      if (existing) {
        await ctx.db.patch(existing._id, patch);
        updated++;
      } else {
        await ctx.db.insert("clients", {
          organization_id: TOSCANA_ORG_ID,
          code: row.code,
          ...patch,
        });
        inserted++;
      }
    }
    return { inserted, updated };
  },
});

// ─────────────────────────────────────────────────────────────────────
// PRODUCTS — bulk upsert (supplier_id pre-resolved by caller)
// ─────────────────────────────────────────────────────────────────────

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

export const bulkUpsertProducts = internalMutation({
  args: { rows: v.array(productRowArg) },
  handler: async (
    ctx,
    args,
  ): Promise<{ inserted: number; updated: number }> => {
    let inserted = 0;
    let updated = 0;
    const now = Date.now();
    for (const row of args.rows) {
      const existing = await ctx.db
        .query("products")
        .withIndex("by_organization_and_code", (q) =>
          q.eq("organization_id", TOSCANA_ORG_ID).eq("code", row.code),
        )
        .unique();
      const search_tokens = buildSearchTokens(row.code, row.name, row.category);
      const patch = {
        name: row.name,
        description: row.description,
        category: row.category,
        price_ht: row.price_ht,
        vat_rate: row.vat_rate,
        stock_qty: row.stock_qty,
        stock_threshold: row.stock_threshold,
        is_active: row.is_active,
        search_tokens,
        conditioning: row.conditioning,
        sub_family: row.sub_family,
        family_code: row.family_code,
        supplier_id: row.supplier_id,
        supplier_ref: row.supplier_ref,
        accounting_sale_code: row.accounting_sale_code,
        accounting_purchase_code: row.accounting_purchase_code,
        purchase_price_ht: row.purchase_price_ht,
        price_2_ttc: row.price_2_ttc,
        price_3_ttc: row.price_3_ttc,
        legacy_imported_at: now,
      };
      if (existing) {
        await ctx.db.patch(existing._id, patch);
        updated++;
      } else {
        await ctx.db.insert("products", {
          organization_id: TOSCANA_ORG_ID,
          code: row.code,
          ...patch,
        });
        inserted++;
      }
    }
    return { inserted, updated };
  },
});

// ─────────────────────────────────────────────────────────────────────
// SUPPLIERS — bulk upsert
// ─────────────────────────────────────────────────────────────────────

const supplierRowArg = v.object({
  code: v.string(),
  name: v.string(),
  email: v.union(v.string(), v.null()),
  phone: v.union(v.string(), v.null()),
});

export const bulkUpsertSuppliers = internalMutation({
  args: { rows: v.array(supplierRowArg) },
  handler: async (
    ctx,
    args,
  ): Promise<{ inserted: number; updated: number }> => {
    let inserted = 0;
    let updated = 0;
    for (const row of args.rows) {
      const existing = await ctx.db
        .query("suppliers")
        .withIndex("by_organization_and_code", (q) =>
          q.eq("organization_id", TOSCANA_ORG_ID).eq("code", row.code),
        )
        .unique();
      const search_tokens = buildSearchTokens(row.code, row.name);
      const patch = {
        name: row.name,
        email: row.email,
        phone: row.phone,
        search_tokens,
      };
      if (existing) {
        await ctx.db.patch(existing._id, patch);
        updated++;
      } else {
        await ctx.db.insert("suppliers", {
          organization_id: TOSCANA_ORG_ID,
          code: row.code,
          ...patch,
        });
        inserted++;
      }
    }
    return { inserted, updated };
  },
});

// ─────────────────────────────────────────────────────────────────────
// LEGACY DOCUMENTS — bulk insert (no check; caller wipes upstream)
// Returns array of { legacy_number, kind, id } so the caller can map lines.
// ─────────────────────────────────────────────────────────────────────

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
  // Optional: caller (import script) flags credit notes via detectCreditNote.
  is_credit_note: v.optional(v.boolean()),
});

type DocumentReturn = {
  legacy_number: string;
  kind: "invoice" | "quotation" | "delivery_form";
  id: Id<"legacy_documents">;
};

export const bulkInsertDocuments = internalMutation({
  args: { rows: v.array(documentRowArg) },
  handler: async (
    ctx,
    args,
  ): Promise<{ inserted: number; ids: DocumentReturn[] }> => {
    const ids: DocumentReturn[] = [];
    for (const row of args.rows) {
      const id = await ctx.db.insert("legacy_documents", {
        organization_id: TOSCANA_ORG_ID,
        ...row,
      });
      ids.push({ legacy_number: row.legacy_number, kind: row.kind, id });
    }
    return { inserted: ids.length, ids };
  },
});

// ─────────────────────────────────────────────────────────────────────
// LEGACY DOCUMENT LINES — bulk insert
// ─────────────────────────────────────────────────────────────────────

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

export const bulkInsertLines = internalMutation({
  args: { rows: v.array(lineRowArg) },
  handler: async (
    ctx,
    args,
  ): Promise<{ inserted: number; filtered: number }> => {
    let inserted = 0;
    let filtered = 0;
    for (const row of args.rows) {
      if (isCommentLikeLine(row)) {
        filtered++;
        continue;
      }
      await ctx.db.insert("legacy_document_lines", {
        organization_id: TOSCANA_ORG_ID,
        ...row,
      });
      inserted++;
    }
    return { inserted, filtered };
  },
});

// ─────────────────────────────────────────────────────────────────────
// ARCHIVE SUMMARY — bulk upsert
// ─────────────────────────────────────────────────────────────────────

const archiveRowArg = v.object({
  client_id: v.union(v.id("clients"), v.null()),
  client_legacy_name: v.string(),
  year: v.number(),
  invoice_count: v.number(),
  ca_ht: v.number(),
  ca_ttc: v.number(),
});

export const bulkUpsertArchiveSummary = internalMutation({
  args: { rows: v.array(archiveRowArg) },
  handler: async (ctx, args): Promise<{ inserted: number }> => {
    for (const row of args.rows) {
      await ctx.db.insert("legacy_archive_summary", {
        organization_id: TOSCANA_ORG_ID,
        ...row,
      });
    }
    return { inserted: args.rows.length };
  },
});

// ─────────────────────────────────────────────────────────────────────
// UNKNOWN ALIASES — bulk insert
// ─────────────────────────────────────────────────────────────────────

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

export const bulkUpsertUnknownAliases = internalMutation({
  args: { rows: v.array(unknownRowArg) },
  handler: async (ctx, args): Promise<{ inserted: number }> => {
    for (const row of args.rows) {
      await ctx.db.insert("legacy_unknown_aliases", {
        organization_id: TOSCANA_ORG_ID,
        ...row,
      });
    }
    return { inserted: args.rows.length };
  },
});

// ─────────────────────────────────────────────────────────────────────
// MONTHLY STATS — bulk insert (called by computeMonthlyStats action)
// ─────────────────────────────────────────────────────────────────────

const clientStatRowArg = v.object({
  client_id: v.id("clients"),
  year: v.number(),
  month: v.number(),
  invoice_count: v.number(),
  quotation_count: v.number(),
  delivery_form_count: v.number(),
  ca_ht: v.number(),
  ca_ttc: v.number(),
  unique_products: v.number(),
});

export const bulkInsertClientMonthlyStats = internalMutation({
  args: { rows: v.array(clientStatRowArg) },
  handler: async (ctx, args): Promise<{ inserted: number }> => {
    for (const row of args.rows) {
      await ctx.db.insert("client_monthly_stats", {
        organization_id: TOSCANA_ORG_ID,
        ...row,
      });
    }
    return { inserted: args.rows.length };
  },
});

const productStatRowArg = v.object({
  product_id: v.id("products"),
  year: v.number(),
  month: v.number(),
  quantity_sold: v.number(),
  ca_ht: v.number(),
  margin_ht: v.number(),
  unique_clients: v.number(),
});

export const bulkInsertProductMonthlyStats = internalMutation({
  args: { rows: v.array(productStatRowArg) },
  handler: async (ctx, args): Promise<{ inserted: number }> => {
    for (const row of args.rows) {
      await ctx.db.insert("product_monthly_stats", {
        organization_id: TOSCANA_ORG_ID,
        ...row,
      });
    }
    return { inserted: args.rows.length };
  },
});
