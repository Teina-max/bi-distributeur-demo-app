import type { Doc } from "@convex/_generated/dataModel";

export const toTicketListItemDto = (
  doc: Doc<"support_tickets">,
  client: Pick<Doc<"clients">, "code" | "name">,
) => ({
  id: doc._id,
  number: doc.number,
  title: doc.title,
  status: doc.status,
  category: doc.category,
  priority: doc.priority,
  clientId: doc.client_id,
  clientCode: client.code,
  clientName: client.name,
  assignedTo: doc.assigned_to,
  createdAt: doc._creationTime,
});

export type TicketListItemDto = ReturnType<typeof toTicketListItemDto>;
