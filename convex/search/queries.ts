import { v } from "convex/values";
import { orgQuery } from "@convex/auth/functions";
import {
  buildBucketsResponse,
  EMPTY_BUCKETS,
  type BucketsResponse,
} from "./buckets";

const BUCKET_LIMIT = 8;

export const searchAll = orgQuery({
  args: {
    query: v.string(),
    scope: v.union(
      v.literal("clients"),
      v.literal("products"),
      v.literal("global"),
    ),
  },
  handler: async (ctx, args): Promise<BucketsResponse> => {
    const trimmed = args.query.trim();
    if (trimmed.length < 1) return EMPTY_BUCKETS;

    const orgId = args.organizationId;

    const clientsRaw =
      args.scope === "products"
        ? []
        : await ctx.db
            .query("clients")
            .withSearchIndex("by_search_tokens", (q) =>
              q.search("name", trimmed).eq("organization_id", orgId),
            )
            .take(BUCKET_LIMIT);

    const productsRaw =
      args.scope === "clients"
        ? []
        : await ctx.db
            .query("products")
            .withSearchIndex("by_search_tokens", (q) =>
              q
                .search("name", trimmed)
                .eq("organization_id", orgId)
                .eq("is_active", true),
            )
            .take(BUCKET_LIMIT);

    return buildBucketsResponse({
      scope: args.scope,
      clientsRaw,
      productsRaw,
    });
  },
});
