import type { Id } from "@convex/_generated/dataModel";
import type { ClientStatus } from "@convex/utils/clientStatus";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export type TopClientDto = {
  client_id: Id<"clients">;
  code: string;
  name: string;
  vendor: string | null;
  sector: string | null;
  ca_12m_ht: number;
  ca_total_ht: number;
  last_invoice_at: number | null;
  sparkline_12m: number[];
  status: ClientStatus;
};

export const toTopClientDto = (input: {
  client_id: Id<"clients">;
  code: string;
  name: string;
  vendor: string | null;
  sector: string | null;
  ca_12m_ht: number;
  ca_total_ht: number;
  last_invoice_at: number | null;
  sparkline_12m: number[];
  status: ClientStatus;
}): TopClientDto => ({
  client_id: input.client_id,
  code: input.code,
  name: input.name,
  vendor: input.vendor,
  sector: input.sector,
  ca_12m_ht: round2(input.ca_12m_ht),
  ca_total_ht: round2(input.ca_total_ht),
  last_invoice_at: input.last_invoice_at,
  sparkline_12m: input.sparkline_12m.map(round2),
  status: input.status,
});
