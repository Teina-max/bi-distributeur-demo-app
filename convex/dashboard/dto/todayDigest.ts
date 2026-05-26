import type { Doc } from "@convex/_generated/dataModel";

export const toDashboardQuotationRowDto = (
  doc: Doc<"quotations">,
  client: Pick<Doc<"clients">, "code" | "name">,
) => ({
  id: doc._id,
  number: doc.number,
  clientCode: client.code,
  clientName: client.name,
  totalHT: doc.total_ht,
  status: doc.status,
  createdAt: doc._creationTime,
});
export type DashboardQuotationRowDto = ReturnType<
  typeof toDashboardQuotationRowDto
>;

export const toDashboardDeliveryFormRowDto = (
  doc: Doc<"delivery_forms">,
  client: Pick<Doc<"clients">, "code" | "name">,
) => ({
  id: doc._id,
  number: doc.number,
  clientCode: client.code,
  clientName: client.name,
  totalHT: doc.total_ht,
  status: doc.status,
  createdAt: doc._creationTime,
});
export type DashboardDeliveryFormRowDto = ReturnType<
  typeof toDashboardDeliveryFormRowDto
>;

export const toDashboardInvoiceRowDto = (
  doc: Doc<"invoices">,
  client: Pick<Doc<"clients">, "code" | "name">,
) => ({
  id: doc._id,
  number: doc.number,
  clientCode: client.code,
  clientName: client.name,
  totalTTC: doc.total_ttc,
  status: doc.status,
  createdAt: doc._creationTime,
});
export type DashboardInvoiceRowDto = ReturnType<
  typeof toDashboardInvoiceRowDto
>;

export type DashboardTodayDigestDto = {
  quotations: DashboardQuotationRowDto[];
  deliveryForms: DashboardDeliveryFormRowDto[];
  invoices: DashboardInvoiceRowDto[];
};
