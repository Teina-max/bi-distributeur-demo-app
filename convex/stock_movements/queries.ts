import { v } from "convex/values";
import type { Doc } from "@convex/_generated/dataModel";
import { orgQuery } from "@convex/auth/functions";
import { toStockMovementDto, type StockMovementDto } from "./dto/stockMovement";

const LIST_LIMIT = 100;

export const listByDeliveryForm = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { delivery_form_id: v.id("delivery_forms") },
  handler: async (ctx, args): Promise<StockMovementDto[]> => {
    const deliveryForm = await ctx.db.get(args.delivery_form_id);
    if (deliveryForm?.organization_id !== args.organizationId) {
      return [];
    }

    const rows = await ctx.db
      .query("stock_movements")
      .withIndex("by_organization_and_creation", (q) =>
        q.eq("organization_id", args.organizationId),
      )
      .order("desc")
      .take(LIST_LIMIT);

    const matching = rows.filter(
      (r) =>
        r.reference_kind === "delivery_form" &&
        r.reference_id !== null &&
        String(r.reference_id) === String(args.delivery_form_id),
    );

    const productById = new Map<string, Doc<"products"> | null>();
    const result: StockMovementDto[] = [];
    for (const row of matching) {
      let product = productById.get(String(row.product_id));
      if (product === undefined) {
        // eslint-disable-next-line no-await-in-loop -- sequential reads required (Convex transaction)
        product = await ctx.db.get(row.product_id);
        productById.set(String(row.product_id), product);
      }
      if (!product) continue;
      result.push(
        toStockMovementDto(row, { code: product.code, name: product.name }),
      );
    }
    return result;
  },
});

export const listByProduct = orgQuery({
  roles: ["owner", "admin", "member"],
  args: {
    product_id: v.id("products"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<StockMovementDto[]> => {
    const product = await ctx.db.get(args.product_id);
    if (product === null) return [];
    if (product.organization_id !== args.organizationId) return [];

    const rows = await ctx.db
      .query("stock_movements")
      .withIndex("by_product_and_creation", (q) =>
        q.eq("product_id", args.product_id),
      )
      .order("desc")
      .take(args.limit ?? 50);

    return rows.map((row) =>
      toStockMovementDto(row, { code: product.code, name: product.name }),
    );
  },
});
