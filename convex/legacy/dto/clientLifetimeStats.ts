import type { Doc } from "@convex/_generated/dataModel";
import {
  computeClientStatus,
  type ClientStatus,
} from "@convex/utils/clientStatus";

const round2 = (n: number): number => Math.round(n * 100) / 100;
const DAY_MS = 24 * 60 * 60 * 1000;

export type ClientLifetimeStatsDto = {
  ltv_ht: number;
  ltv_ttc: number;
  archive_pre_2011_ht: number;
  first_invoice_at: number | null;
  last_invoice_at: number | null;
  total_invoices: number;
  total_quotations: number;
  total_delivery_forms: number;
  avg_days_between_invoices: number | null;
  avg_basket_ht: number | null;
  ca_12m_ht: number;
  status: ClientStatus;
  days_since_last: number | null;
};

export const toClientLifetimeStatsDto = ({
  monthly,
  archive,
  legacyDocsSample,
  now,
}: {
  monthly: readonly Doc<"client_monthly_stats">[];
  archive: readonly Doc<"legacy_archive_summary">[];
  // First & last invoice dates need a small sample of legacy_documents to be
  // precise (monthly stats give us month granularity but not the actual day).
  legacyDocsSample: readonly Doc<"legacy_documents">[];
  now: number;
}): ClientLifetimeStatsDto => {
  let ltvHt = 0;
  let ltvTtc = 0;
  let totalInvoices = 0;
  let totalQuotations = 0;
  let totalDeliveryForms = 0;
  let ca12mHt = 0;
  const oneYearAgoMs = now - 365 * DAY_MS;
  let firstFromMonthly: number | null = null;
  let lastFromMonthly: number | null = null;

  for (const row of monthly) {
    ltvHt += row.ca_ht;
    ltvTtc += row.ca_ttc;
    totalInvoices += row.invoice_count;
    totalQuotations += row.quotation_count;
    totalDeliveryForms += row.delivery_form_count;
    const periodStart = Date.UTC(row.year, row.month - 1, 1);
    if (firstFromMonthly === null || periodStart < firstFromMonthly) {
      firstFromMonthly = periodStart;
    }
    if (lastFromMonthly === null || periodStart > lastFromMonthly) {
      lastFromMonthly = periodStart;
    }
    if (row.invoice_count > 0 && periodStart >= oneYearAgoMs) {
      ca12mHt += row.ca_ht;
    }
  }

  let archivePre2011Ht = 0;
  for (const row of archive) {
    archivePre2011Ht += row.ca_ht;
  }

  // Sharpen first/last to daily precision when sample is available.
  let firstInvoiceAt: number | null = firstFromMonthly;
  let lastInvoiceAt: number | null = lastFromMonthly;
  for (const doc of legacyDocsSample) {
    if (doc.kind !== "invoice") continue;
    if (firstInvoiceAt === null || doc.document_date < firstInvoiceAt) {
      firstInvoiceAt = doc.document_date;
    }
    if (lastInvoiceAt === null || doc.document_date > lastInvoiceAt) {
      lastInvoiceAt = doc.document_date;
    }
  }

  const avgDaysBetween =
    totalInvoices > 1 && firstInvoiceAt !== null && lastInvoiceAt !== null
      ? Math.round(
          (lastInvoiceAt - firstInvoiceAt) / DAY_MS / (totalInvoices - 1),
        )
      : null;

  const avgBasketHt = totalInvoices > 0 ? round2(ltvHt / totalInvoices) : null;

  const daysSinceLast =
    lastInvoiceAt !== null ? Math.floor((now - lastInvoiceAt) / DAY_MS) : null;

  const status = computeClientStatus({
    last_invoice_at: lastInvoiceAt,
    ca_12m_ht: ca12mHt,
    total_invoices: totalInvoices,
    now,
  });

  return {
    ltv_ht: round2(ltvHt + archivePre2011Ht),
    ltv_ttc: round2(ltvTtc),
    archive_pre_2011_ht: round2(archivePre2011Ht),
    first_invoice_at: firstInvoiceAt,
    last_invoice_at: lastInvoiceAt,
    total_invoices: totalInvoices,
    total_quotations: totalQuotations,
    total_delivery_forms: totalDeliveryForms,
    avg_days_between_invoices: avgDaysBetween,
    avg_basket_ht: avgBasketHt,
    ca_12m_ht: round2(ca12mHt),
    status,
    days_since_last: daysSinceLast,
  };
};
