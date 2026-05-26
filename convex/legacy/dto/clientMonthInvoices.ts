import type { Id } from "@convex/_generated/dataModel";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export type ClientMonthInvoiceRow = {
  id: Id<"legacy_documents">;
  legacy_number: string;
  document_date: number;
  total_ht: number;
  total_ttc: number;
  comment: string | null;
  line_count: number;
};

export type ClientMonthInvoicesDto = {
  year: number;
  month: number;
  total_ca_ht: number;
  total_ttc: number;
  invoice_count: number;
  invoices: ClientMonthInvoiceRow[];
};

export const buildClientMonthInvoiceRow = (
  input: ClientMonthInvoiceRow,
): ClientMonthInvoiceRow => ({
  ...input,
  total_ht: round2(input.total_ht),
  total_ttc: round2(input.total_ttc),
});
