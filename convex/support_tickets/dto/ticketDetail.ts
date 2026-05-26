import type { Doc } from "@convex/_generated/dataModel";

export const toTicketDetailDto = (
  doc: Doc<"support_tickets">,
  client: Pick<Doc<"clients">, "_id" | "code" | "name">,
  linkedDeliveryForm: Pick<Doc<"delivery_forms">, "_id" | "number"> | null,
  linkedInvoice: Pick<Doc<"invoices">, "_id" | "number"> | null,
  linkedProduct: Pick<Doc<"products">, "_id" | "code" | "name"> | null,
) => ({
  id: doc._id,
  number: doc.number,
  title: doc.title,
  description: doc.description,
  status: doc.status,
  category: doc.category,
  priority: doc.priority,
  client: {
    id: client._id,
    code: client.code,
    name: client.name,
  },
  linkedDeliveryForm: linkedDeliveryForm
    ? { id: linkedDeliveryForm._id, number: linkedDeliveryForm.number }
    : null,
  linkedInvoice: linkedInvoice
    ? { id: linkedInvoice._id, number: linkedInvoice.number }
    : null,
  linkedProduct: linkedProduct
    ? {
        id: linkedProduct._id,
        code: linkedProduct.code,
        name: linkedProduct.name,
      }
    : null,
  assignedTo: doc.assigned_to,
  resolvedAt: doc.resolved_at,
  closedAt: doc.closed_at,
  createdBy: doc.created_by,
  createdAt: doc._creationTime,
});

export type TicketDetailDto = ReturnType<typeof toTicketDetailDto>;
