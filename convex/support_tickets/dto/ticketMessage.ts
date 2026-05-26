import type { Doc } from "@convex/_generated/dataModel";

export const toTicketMessageDto = (doc: Doc<"ticket_messages">) => ({
  id: doc._id,
  ticketId: doc.ticket_id,
  authorEmail: doc.author_email,
  body: doc.body,
  createdAt: doc._creationTime,
});

export type TicketMessageDto = ReturnType<typeof toTicketMessageDto>;
