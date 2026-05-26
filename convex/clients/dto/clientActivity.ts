import type { Doc } from "@convex/_generated/dataModel";
import { toDeliveryFormListItemDto } from "@convex/delivery_forms/dto/deliveryFormListItem";
import { toInvoiceListItemDto } from "@convex/invoices/dto/invoiceListItem";
import { toQuotationListItemDto } from "@convex/quotations/dto/quotationListItem";
import { toClientDetailDto } from "@convex/clients/dto/clientDetail";

export const toClientActivityDto = (
  client: Doc<"clients">,
  recentQuotations: readonly Doc<"quotations">[],
  recentDeliveryForms: readonly Doc<"delivery_forms">[],
  recentInvoices: readonly Doc<"invoices">[],
) => ({
  client: toClientDetailDto(client),
  recentQuotations: recentQuotations.map((quotation) =>
    toQuotationListItemDto(quotation, {
      code: client.code,
      name: client.name,
    }),
  ),
  recentDeliveryForms: recentDeliveryForms.map((deliveryForm) =>
    toDeliveryFormListItemDto(deliveryForm, {
      code: client.code,
      name: client.name,
    }),
  ),
  recentInvoices: recentInvoices.map((invoice) =>
    toInvoiceListItemDto(invoice, {
      code: client.code,
      name: client.name,
    }),
  ),
});

export type ClientActivityDto = ReturnType<typeof toClientActivityDto>;
