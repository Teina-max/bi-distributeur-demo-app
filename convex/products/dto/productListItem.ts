import type { Doc } from "@convex/_generated/dataModel";

export const toProductListItemDto = (doc: Doc<"products">) => ({
  id: doc._id,
  code: doc.code,
  name: doc.name,
  category: doc.category,
  priceHT: doc.price_ht,
  vatRate: doc.vat_rate,
  stockQty: doc.stock_qty,
  stockThreshold: doc.stock_threshold,
  isActive: doc.is_active,
});

export type ProductListItemDto = ReturnType<typeof toProductListItemDto>;
