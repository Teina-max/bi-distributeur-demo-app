import type { Doc } from "@convex/_generated/dataModel";

export function toPurchaseOrderListItemDto(
  doc: Doc<"purchase_orders">,
  supplier: Pick<Doc<"suppliers">, "code" | "name">,
) {
  return {
    id: doc._id,
    number: doc.number,
    supplierCode: supplier.code,
    supplierName: supplier.name,
    total_ht: doc.total_ht,
    total_ttc: doc.total_ttc,
    status: doc.status,
    receivedAt: doc.received_at,
    createdAt: doc._creationTime,
  };
}

export type PurchaseOrderListItemDto = ReturnType<
  typeof toPurchaseOrderListItemDto
>;
