import type { Doc } from "@convex/_generated/dataModel";

export function toQuotationListItemDto(
  doc: Doc<"quotations">,
  client: Pick<Doc<"clients">, "code" | "name">,
) {
  return {
    id: doc._id,
    number: doc.number,
    clientCode: client.code,
    clientName: client.name,
    total_ht: doc.total_ht,
    total_ttc: doc.total_ttc,
    status: doc.status,
    createdAt: doc._creationTime,
  };
}

export type QuotationListItemDto = ReturnType<typeof toQuotationListItemDto>;
