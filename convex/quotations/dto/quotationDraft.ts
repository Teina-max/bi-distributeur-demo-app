import type { Doc } from "@convex/_generated/dataModel";

export function toQuotationDraftDto(
  doc: Doc<"quotations">,
  client: Pick<Doc<"clients">, "_id" | "code" | "name">,
) {
  return {
    id: doc._id,
    number: doc.number,
    status: doc.status,
    client: {
      id: client._id,
      code: client.code,
      name: client.name,
    },
    lines: doc.lines,
    total_ht: doc.total_ht,
    total_vat: doc.total_vat,
    total_ttc: doc.total_ttc,
    createdAt: doc._creationTime,
  };
}

export type QuotationDraftDto = ReturnType<typeof toQuotationDraftDto>;
