import type { Doc } from "@convex/_generated/dataModel";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export const toClientLegacyDocumentDto = (doc: Doc<"legacy_documents">) => ({
  id: doc._id,
  kind: doc.kind,
  legacy_number: doc.legacy_number,
  document_date: doc.document_date,
  due_date: doc.due_date,
  total_ht: round2(doc.total_ht),
  total_ttc: round2(doc.total_ttc),
  comment: doc.comment,
  source_file: doc.source_file,
});

export type ClientLegacyDocumentDto = ReturnType<
  typeof toClientLegacyDocumentDto
>;
