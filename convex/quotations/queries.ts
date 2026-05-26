import { v } from "convex/values";
import { orgQuery } from "@convex/auth/functions";
import { matchesTokens } from "@convex/utils/searchTokens";
import { throwNotFound } from "@convex/utils/errors";
import { toQuotationListItemDto } from "./dto/quotationListItem";
import { toQuotationDraftDto } from "./dto/quotationDraft";

const RECENT_QUOTATION_LIMIT = 50;
const SUGGESTION_LIMIT = 8;
const MIN_QUERY_LENGTH = 2;

export const listRecent = orgQuery({
  args: {},
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("quotations")
      .withIndex("by_organization_and_creation", (q) =>
        q.eq("organization_id", args.organizationId),
      )
      .order("desc")
      .take(RECENT_QUOTATION_LIMIT);

    const dtos = await Promise.all(
      docs.map(async (doc) => {
        const client = await ctx.db.get(doc.client_id);
        if (!client) return null;
        return toQuotationListItemDto(doc, {
          code: client.code,
          name: client.name,
        });
      }),
    );

    return dtos.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );
  },
});

export const getById = orgQuery({
  args: { id: v.id("quotations") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (doc?.organization_id !== args.organizationId) {
      throwNotFound("Devis introuvable");
    }
    const client = await ctx.db.get(doc.client_id);
    if (!client) {
      throwNotFound("Client introuvable");
    }
    return toQuotationDraftDto(doc, {
      _id: client._id,
      code: client.code,
      name: client.name,
    });
  },
});

export const listClientSuggestions = orgQuery({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const trimmed = args.query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) return [];

    const all = await ctx.db
      .query("clients")
      .withIndex("by_organization", (q) =>
        q.eq("organization_id", args.organizationId),
      )
      .collect();

    const limit = args.limit ?? SUGGESTION_LIMIT;
    return all
      .filter((client) => matchesTokens(client.search_tokens, trimmed))
      .slice(0, limit)
      .map((client) => ({
        id: client._id,
        code: client.code,
        name: client.name,
        city: client.address.city,
      }));
  },
});

export const listProductSuggestions = orgQuery({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const trimmed = args.query.trim();
    const MIN_PRODUCT_QUERY_LENGTH = 2;
    if (trimmed.length < MIN_PRODUCT_QUERY_LENGTH) return [];

    const all = await ctx.db
      .query("products")
      .withIndex("by_organization_and_active", (q) =>
        q.eq("organization_id", args.organizationId).eq("is_active", true),
      )
      .collect();

    const limit = args.limit ?? SUGGESTION_LIMIT;
    return all
      .filter((product) => matchesTokens(product.search_tokens, trimmed))
      .slice(0, limit)
      .map((product) => ({
        id: product._id,
        code: product.code,
        name: product.name,
        price_ht: product.price_ht,
        vat_rate: product.vat_rate,
      }));
  },
});
