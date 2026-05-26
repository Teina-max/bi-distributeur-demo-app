import type { Doc } from "@convex/_generated/dataModel";

export const toProductSearchDto = (doc: Doc<"products">) => ({
  id: doc._id,
  code: doc.code,
  name: doc.name,
  price_ht: doc.price_ht,
  vat_rate: doc.vat_rate,
  stock_qty: doc.stock_qty,
});

export type ProductSearchDto = ReturnType<typeof toProductSearchDto>;
