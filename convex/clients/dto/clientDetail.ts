import type { Doc } from "@convex/_generated/dataModel";

export const toClientDetailDto = (doc: Doc<"clients">) => ({
  id: doc._id,
  code: doc.code,
  name: doc.name,
  type: doc.type,
  email: doc.email,
  phone: doc.phone,
  address: doc.address,
  paymentTermsDays: doc.payment_terms_days,
  paymentTermsLabel: doc.payment_terms_label,
  createdAt: doc._creationTime,
  // Intermédiaires + Heritage
  correspondent: doc.correspondent ?? null,
  vendor: doc.vendor ?? null,
  sector: doc.sector ?? null,
  depotCafe: doc.depot_cafe ?? null,
  accountingCode: doc.accounting_code ?? null,
  creditLimit: doc.credit_limit ?? null,
  outstandingAmount: doc.outstanding_amount ?? 0,
  globalDiscountPct: doc.global_discount_pct ?? 0,
  tariffLevel: doc.tariff_level ?? 1,
  vatIntra: doc.vat_intra ?? null,
  isVisible: doc.is_visible ?? true,
  notes: doc.notes ?? "",
});

export type ClientDetailDto = ReturnType<typeof toClientDetailDto>;
