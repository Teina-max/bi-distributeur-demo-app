import type { Doc } from "@convex/_generated/dataModel";

export const toDeliveryFormInvoiceableDto = (doc: Doc<"delivery_forms">) => ({
  id: doc._id,
  number: doc.number,
  deliveredAt: doc.delivered_at,
  total_ht: doc.total_ht,
  total_ttc: doc.total_ttc,
  createdAt: doc._creationTime,
});

export type DeliveryFormInvoiceableDto = ReturnType<
  typeof toDeliveryFormInvoiceableDto
>;
