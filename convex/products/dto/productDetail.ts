import type { Doc } from "@convex/_generated/dataModel";

export const toProductDetailDto = (doc: Doc<"products">) => ({
  id: doc._id,
  code: doc.code,
  name: doc.name,
  description: doc.description,
  category: doc.category,
  priceHT: doc.price_ht,
  vatRate: doc.vat_rate,
  stockQty: doc.stock_qty,
  stockThreshold: doc.stock_threshold,
  isActive: doc.is_active,
  createdAt: doc._creationTime,
  // Champs Heritage (toujours exposés, normalisés en null si absents).
  conditioning: doc.conditioning ?? null,
  subFamily: doc.sub_family ?? null,
  familyCode: doc.family_code ?? null,
  supplierId: doc.supplier_id ?? null,
  supplierRef: doc.supplier_ref ?? null,
  accountingSaleCode: doc.accounting_sale_code ?? null,
  accountingPurchaseCode: doc.accounting_purchase_code ?? null,
  purchasePriceHT: doc.purchase_price_ht ?? null,
  price2TTC: doc.price_2_ttc ?? null,
  price3TTC: doc.price_3_ttc ?? null,
});

export type ProductDetailDto = ReturnType<typeof toProductDetailDto>;
