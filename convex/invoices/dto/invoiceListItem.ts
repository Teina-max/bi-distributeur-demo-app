import type { Doc } from "@convex/_generated/dataModel";

export const toInvoiceListItemDto = (
  doc: Doc<"invoices">,
  client: Pick<Doc<"clients">, "code" | "name">,
) => ({
  id: doc._id,
  number: doc.number,
  clientCode: client.code,
  clientName: client.name,
  total_ht: doc.total_ht,
  total_ttc: doc.total_ttc,
  status: doc.status,
  dueDate: doc.due_date,
  sentAt: doc.sent_at,
  createdAt: doc._creationTime,
});

export type InvoiceListItemDto = ReturnType<typeof toInvoiceListItemDto>;
