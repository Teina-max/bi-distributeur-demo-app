import { v } from "convex/values";
import type { QueryCtx } from "@convex/_generated/server";
import { orgQuery } from "@convex/auth/functions";
import {
  toProductListItemDto,
  type ProductListItemDto,
} from "./dto/productListItem";
import { toProductDetailDto, type ProductDetailDto } from "./dto/productDetail";

const DEFAULT_LIST_LIMIT = 50;

export async function listCatalogHandler(
  ctx: QueryCtx,
  args: {
    organizationId: string;
    query?: string;
    limit?: number;
    include_inactive?: boolean;
  },
): Promise<ProductListItemDto[]> {
  const limit = args.limit ?? DEFAULT_LIST_LIMIT;
  const trimmed = (args.query ?? "").trim();
  const includeInactive = args.include_inactive ?? false;

  if (trimmed.length < 1) {
    if (includeInactive) {
      const rows = await ctx.db
        .query("products")
        .withIndex("by_organization", (q) =>
          q.eq("organization_id", args.organizationId),
        )
        .order("desc")
        .take(limit);
      return rows.map(toProductListItemDto);
    }

    const rows = await ctx.db
      .query("products")
      .withIndex("by_organization_and_active", (q) =>
        q.eq("organization_id", args.organizationId).eq("is_active", true),
      )
      .order("desc")
      .take(limit);
    return rows.map(toProductListItemDto);
  }

  if (includeInactive) {
    const rows = await ctx.db
      .query("products")
      .withSearchIndex("by_search_tokens", (q) =>
        q.search("name", trimmed).eq("organization_id", args.organizationId),
      )
      .take(limit);
    return rows.map(toProductListItemDto);
  }

  const rows = await ctx.db
    .query("products")
    .withSearchIndex("by_search_tokens", (q) =>
      q
        .search("name", trimmed)
        .eq("organization_id", args.organizationId)
        .eq("is_active", true),
    )
    .take(limit);
  return rows.map(toProductListItemDto);
}

export const listCatalog = orgQuery({
  roles: ["owner", "admin", "member"],
  args: {
    query: v.optional(v.string()),
    limit: v.optional(v.number()),
    include_inactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<ProductListItemDto[]> =>
    listCatalogHandler(ctx, args),
});

export const getById = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { id: v.id("products") },
  handler: async (ctx, args): Promise<ProductDetailDto | null> => {
    const doc = await ctx.db.get(args.id);
    if (doc === null) return null;
    if (doc.organization_id !== args.organizationId) return null;
    return toProductDetailDto(doc);
  },
});
