import type { Doc } from "@convex/_generated/dataModel";

type SupplyLineDto = {
  product_id: string;
  product_code: string;
  product_name: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_purchase_price_ht: number;
  vat_rate: number;
};

export function toPurchaseOrderDetailDto(
  doc: Doc<"purchase_orders">,
  supplier: Pick<Doc<"suppliers">, "_id" | "code" | "name" | "email" | "phone">,
) {
  return {
    id: doc._id,
    number: doc.number,
    status: doc.status,
    supplier: {
      id: supplier._id,
      code: supplier.code,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
    },
    lines: doc.lines.map<SupplyLineDto>((line) => ({
      product_id: String(line.product_id),
      product_code: line.product_code,
      product_name: line.product_name,
      quantity_ordered: line.quantity_ordered,
      quantity_received: line.quantity_received,
      unit_purchase_price_ht: line.unit_purchase_price_ht,
      vat_rate: line.vat_rate,
    })),
    total_ht: doc.total_ht,
    total_ttc: doc.total_ttc,
    receivedAt: doc.received_at,
    createdAt: doc._creationTime,
  };
}

export type PurchaseOrderDetailDto = ReturnType<
  typeof toPurchaseOrderDetailDto
>;
