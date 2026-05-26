import type { Doc } from "@convex/_generated/dataModel";

type StatusDoc =
  | Doc<"quotations">
  | Doc<"delivery_forms">
  | Doc<"invoices">;

const countByStatus = (docs: readonly StatusDoc[]): Record<string, number> =>
  docs.reduce<Record<string, number>>((acc, doc) => {
    acc[doc.status] = (acc[doc.status] ?? 0) + 1;
    return acc;
  }, {});

const round2 = (value: number): number => Math.round(value * 100) / 100;

export const toClientActivitySummaryDto = ({
  quotations,
  deliveryForms,
  invoices,
}: {
  quotations: readonly Doc<"quotations">[];
  deliveryForms: readonly Doc<"delivery_forms">[];
  invoices: readonly Doc<"invoices">[];
}) => ({
  totalRevenueHt: round2(
    invoices
      .filter((invoice) => invoice.status === "sent" || invoice.status === "paid")
      .reduce((sum, invoice) => sum + invoice.total_ht, 0),
  ),
  pendingRevenueHt: round2(
    invoices
      .filter(
        (invoice) => invoice.status === "draft" || invoice.status === "overdue",
      )
      .reduce((sum, invoice) => sum + invoice.total_ht, 0),
  ),
  countQuotations: countByStatus(quotations),
  countDeliveryForms: countByStatus(deliveryForms),
  countInvoices: countByStatus(invoices),
});

export type ClientActivitySummaryDto = ReturnType<
  typeof toClientActivitySummaryDto
>;
