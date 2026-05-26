import type { Doc } from "@convex/_generated/dataModel";

type LineDto = {
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price_ht: number;
  vat_rate: number;
  line_total_ht: number;
};

export const toDeliveryFormDetailDto = (
  doc: Doc<"delivery_forms">,
  client: Pick<Doc<"clients">, "code" | "name" | "email" | "phone">,
) => ({
  id: doc._id,
  number: doc.number,
  status: doc.status,
  quotation_id: doc.quotation_id,
  client: {
    id: doc.client_id,
    code: client.code,
    name: client.name,
    email: client.email,
    phone: client.phone,
  },
  lines: doc.lines.map<LineDto>((line) => ({
    product_id: String(line.product_id),
    product_code: line.product_code,
    product_name: line.product_name,
    quantity: line.quantity,
    unit_price_ht: line.unit_price_ht,
    vat_rate: line.vat_rate,
    line_total_ht: line.line_total_ht,
  })),
  total_ht: doc.total_ht,
  total_ttc: doc.total_ttc,
  deliveredAt: doc.delivered_at,
  createdAt: doc._creationTime,
});

export type DeliveryFormDetailDto = ReturnType<typeof toDeliveryFormDetailDto>;
