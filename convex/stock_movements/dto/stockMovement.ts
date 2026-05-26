import type { Doc } from "@convex/_generated/dataModel";

export const toStockMovementDto = (
  doc: Doc<"stock_movements">,
  product: Pick<Doc<"products">, "code" | "name">,
) => ({
  id: doc._id,
  productId: doc.product_id,
  productCode: product.code,
  productName: product.name,
  delta: doc.delta,
  reason: doc.reason,
  referenceKind: doc.reference_kind,
  referenceId: doc.reference_id,
  note: doc.note,
  createdAt: doc._creationTime,
});

export type StockMovementDto = ReturnType<typeof toStockMovementDto>;
