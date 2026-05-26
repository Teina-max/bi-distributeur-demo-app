import type { Doc } from "@convex/_generated/dataModel";

export type ClientMonthlyTimelineEntry = {
  year: number;
  month: number;
  ca_ht: number;
  ca_ttc: number;
  invoice_count: number;
  quotation_count: number;
  delivery_form_count: number;
  unique_products: number;
};

export type ClientMonthlyTimelineArchiveYear = {
  year: number;
  invoice_count: number;
  ca_ht: number;
  ca_ttc: number;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

export const toClientMonthlyTimelineDto = ({
  monthly,
  archive,
}: {
  monthly: readonly Doc<"client_monthly_stats">[];
  archive: readonly Doc<"legacy_archive_summary">[];
}) => ({
  monthly: monthly
    .map<ClientMonthlyTimelineEntry>((row) => ({
      year: row.year,
      month: row.month,
      ca_ht: round2(row.ca_ht),
      ca_ttc: round2(row.ca_ttc),
      invoice_count: row.invoice_count,
      quotation_count: row.quotation_count,
      delivery_form_count: row.delivery_form_count,
      unique_products: row.unique_products,
    }))
    .sort((a, b) => a.year - b.year || a.month - b.month),
  archive: archive
    .map<ClientMonthlyTimelineArchiveYear>((row) => ({
      year: row.year,
      invoice_count: row.invoice_count,
      ca_ht: round2(row.ca_ht),
      ca_ttc: round2(row.ca_ttc),
    }))
    .sort((a, b) => a.year - b.year),
});

export type ClientMonthlyTimelineDto = ReturnType<
  typeof toClientMonthlyTimelineDto
>;
