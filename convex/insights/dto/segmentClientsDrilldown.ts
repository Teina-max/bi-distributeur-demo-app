import type { Id } from "@convex/_generated/dataModel";
import type { ClientStatus } from "@convex/utils/clientStatus";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export type SegmentClientRow = {
  client_id: Id<"clients">;
  code: string;
  name: string;
  vendor: string | null;
  sector: string | null;
  ca_12m_ht: number;
  ca_total_ht: number;
  last_invoice_at: number | null;
  total_invoices: number;
};

export type SegmentClientsDrilldownDto = {
  status: ClientStatus;
  count: number;
  rows: SegmentClientRow[];
};

export const toSegmentClientRow = (
  input: SegmentClientRow,
): SegmentClientRow => ({
  ...input,
  ca_12m_ht: round2(input.ca_12m_ht),
  ca_total_ht: round2(input.ca_total_ht),
});
