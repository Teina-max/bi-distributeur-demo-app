import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

const PREFIX_BY_KIND = {
  quotation: "D",
  delivery_form: "B",
  invoice: "F",
  purchase_order: "BC",
  support_ticket: "T",
} as const;

export type DocumentKind = keyof typeof PREFIX_BY_KIND;

const pad = (value: number): string => value.toString().padStart(4, "0");

export const formatDocumentNumber = (
  kind: DocumentKind,
  year_prefix: string,
  n: number,
): string => `${PREFIX_BY_KIND[kind]}${year_prefix}-${pad(n)}`;

export const allocateNumber = internalMutation({
  args: {
    organization_id: v.string(),
    kind: v.union(
      v.literal("quotation"),
      v.literal("delivery_form"),
      v.literal("invoice"),
      v.literal("purchase_order"),
      v.literal("support_ticket"),
    ),
    year_prefix: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const counter = await ctx.db
      .query("document_counters")
      .withIndex("by_organization_kind_year", (q) =>
        q
          .eq("organization_id", args.organization_id)
          .eq("kind", args.kind)
          .eq("year_prefix", args.year_prefix),
      )
      .unique();

    if (counter === null) {
      await ctx.db.insert("document_counters", {
        organization_id: args.organization_id,
        kind: args.kind,
        year_prefix: args.year_prefix,
        next_number: 2,
      });
      return formatDocumentNumber(args.kind, args.year_prefix, 1);
    }

    const allocated = counter.next_number;
    await ctx.db.patch(counter._id, { next_number: allocated + 1 });
    return formatDocumentNumber(args.kind, args.year_prefix, allocated);
  },
});
