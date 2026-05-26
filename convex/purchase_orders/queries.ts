import { v } from "convex/values";
import type { Doc } from "@convex/_generated/dataModel";
import { orgQuery } from "@convex/auth/functions";
import { matchesTokens } from "@convex/utils/searchTokens";
import {
  toPurchaseOrderListItemDto,
  type PurchaseOrderListItemDto,
} from "./dto/purchaseOrderListItem";
import {
  toPurchaseOrderDetailDto,
  type PurchaseOrderDetailDto,
} from "./dto/purchaseOrderDetail";

const LIST_LIMIT = 50;
const SUGGESTION_LIMIT = 8;
const MIN_PRODUCT_QUERY_LENGTH = 2;

export const listRecent = orgQuery({
  roles: ["owner", "admin", "member"],
  args: {},
  handler: async (ctx, args): Promise<PurchaseOrderListItemDto[]> => {
    const rows = await ctx.db
      .query("purchase_orders")
      .withIndex("by_organization_and_creation", (q) =>
        q.eq("organization_id", args.organizationId),
      )
      .order("desc")
      .take(LIST_LIMIT);

    const supplierById = new Map<string, Doc<"suppliers"> | null>();
    const result: PurchaseOrderListItemDto[] = [];
    for (const row of rows) {
      let supplier = supplierById.get(String(row.supplier_id));
      if (supplier === undefined) {
        // eslint-disable-next-line no-await-in-loop -- sequential reads required (Convex transaction)
        supplier = await ctx.db.get(row.supplier_id);
        supplierById.set(String(row.supplier_id), supplier);
      }
      if (!supplier) continue;
      result.push(
        toPurchaseOrderListItemDto(row, {
          code: supplier.code,
          name: supplier.name,
        }),
      );
    }
    return result;
  },
});

export const getById = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { id: v.id("purchase_orders") },
  handler: async (ctx, args): Promise<PurchaseOrderDetailDto | null> => {
    const doc = await ctx.db.get(args.id);
    if (doc?.organization_id !== args.organizationId) return null;
    const supplier = await ctx.db.get(doc.supplier_id);
    if (!supplier) return null;
    return toPurchaseOrderDetailDto(doc, {
      _id: supplier._id,
      code: supplier.code,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
    });
  },
});

export const listProductSuggestionsForSupply = orgQuery({
  roles: ["owner", "admin", "member"],
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const trimmed = args.query.trim();
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
        vat_rate: product.vat_rate,
      }));
  },
});
