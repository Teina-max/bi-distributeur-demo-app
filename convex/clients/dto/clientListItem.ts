import type { Doc } from "@convex/_generated/dataModel";

export const toClientListItemDto = (doc: Doc<"clients">) => ({
  id: doc._id,
  code: doc.code,
  name: doc.name,
  type: doc.type,
  city: doc.address.city,
  email: doc.email,
  phone: doc.phone,
  paymentTermsLabel: doc.payment_terms_label,
});

export type ClientListItemDto = ReturnType<typeof toClientListItemDto>;
