import type { Doc } from "@convex/_generated/dataModel";

export function toSupplierSuggestionDto(doc: Doc<"suppliers">) {
  return {
    id: doc._id,
    code: doc.code,
    name: doc.name,
  };
}

export type SupplierSuggestionDto = ReturnType<typeof toSupplierSuggestionDto>;
