import type { Doc } from "@convex/_generated/dataModel";

export const toClientSearchDto = (doc: Doc<"clients">) => ({
  id: doc._id,
  code: doc.code,
  name: doc.name,
  city: doc.address.city,
});

export type ClientSearchDto = ReturnType<typeof toClientSearchDto>;
