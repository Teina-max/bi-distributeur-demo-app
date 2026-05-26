import { v } from "convex/values";
import { orgQuery } from "@convex/auth/functions";
import { matchesTokens } from "@convex/utils/searchTokens";
import {
  toSupplierSuggestionDto,
  type SupplierSuggestionDto,
} from "./dto/supplierSuggestion";

const SUGGESTION_LIMIT = 8;
const MIN_QUERY_LENGTH = 2;

export const listSuggestions = orgQuery({
  roles: ["owner", "admin", "member"],
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<SupplierSuggestionDto[]> => {
    const trimmed = args.query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) return [];

    const all = await ctx.db
      .query("suppliers")
      .withIndex("by_organization", (q) =>
        q.eq("organization_id", args.organizationId),
      )
      .collect();

    const limit = args.limit ?? SUGGESTION_LIMIT;
    return all
      .filter((supplier) => matchesTokens(supplier.search_tokens, trimmed))
      .slice(0, limit)
      .map(toSupplierSuggestionDto);
  },
});
