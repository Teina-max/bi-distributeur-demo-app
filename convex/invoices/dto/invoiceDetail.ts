import type { Doc, Id } from "@convex/_generated/dataModel";

type LineDto = {
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price_ht: number;
  vat_rate: number;
  line_total_ht: number;
};

type DeliveryFormSnapshot = {
  id: Id<"delivery_forms">;
  number: string;
  lines: Doc<"delivery_forms">["lines"];
  delivered_at: number | null;
  total_ht: number;
  total_ttc: number;
};

type DeliveryFormDto = {
  id: string;
  number: string;
  deliveredAt: number | null;
  total_ht: number;
  total_ttc: number;
  lines: LineDto[];
};

const toLineDto = (line: Doc<"delivery_forms">["lines"][number]): LineDto => ({
  product_id: String(line.product_id),
  product_code: line.product_code,
  product_name: line.product_name,
  quantity: line.quantity,
  unit_price_ht: line.unit_price_ht,
  vat_rate: line.vat_rate,
  line_total_ht: line.line_total_ht,
});

export const toInvoiceDetailDto = (
  doc: Doc<"invoices">,
  client: Pick<Doc<"clients">, "code" | "name" | "email" | "phone">,
  deliveryForms: readonly DeliveryFormSnapshot[],
) => ({
  id: doc._id,
  number: doc.number,
  status: doc.status,
  client: {
    id: doc.client_id,
    code: client.code,
    name: client.name,
    email: client.email,
    phone: client.phone,
  },
  deliveryForms: deliveryForms.map<DeliveryFormDto>((df) => ({
    id: String(df.id),
    number: df.number,
    deliveredAt: df.delivered_at,
    total_ht: df.total_ht,
    total_ttc: df.total_ttc,
    lines: df.lines.map(toLineDto),
  })),
  total_ht: doc.total_ht,
  total_ttc: doc.total_ttc,
  dueDate: doc.due_date,
  sentAt: doc.sent_at,
  createdAt: doc._creationTime,
});

export type InvoiceDetailDto = ReturnType<typeof toInvoiceDetailDto>;
