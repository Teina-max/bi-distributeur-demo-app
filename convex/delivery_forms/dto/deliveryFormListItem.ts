import type { Doc } from "@convex/_generated/dataModel";

export const toDeliveryFormListItemDto = (
  doc: Doc<"delivery_forms">,
  client: Pick<Doc<"clients">, "code" | "name">,
) => ({
  id: doc._id,
  number: doc.number,
  clientCode: client.code,
  clientName: client.name,
  total_ht: doc.total_ht,
  total_ttc: doc.total_ttc,
  status: doc.status,
  deliveredAt: doc.delivered_at,
  createdAt: doc._creationTime,
});

export type DeliveryFormListItemDto = ReturnType<
  typeof toDeliveryFormListItemDto
>;
