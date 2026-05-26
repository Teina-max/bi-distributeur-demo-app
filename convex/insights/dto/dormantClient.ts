import type { Id } from "@convex/_generated/dataModel";
import type { ClientStatus } from "@convex/utils/clientStatus";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export type DormantClientDto = {
  client_id: Id<"clients">;
  code: string;
  name: string;
  vendor: string | null;
  sector: string | null;
  last_invoice_at: number | null;
  days_since_last: number | null;
  ca_total_ht: number;
  total_invoices: number;
  status: ClientStatus;
};

export const toDormantClientDto = (input: {
  client_id: Id<"clients">;
  code: string;
  name: string;
  vendor: string | null;
  sector: string | null;
  last_invoice_at: number | null;
  days_since_last: number | null;
  ca_total_ht: number;
  total_invoices: number;
  status: ClientStatus;
}): DormantClientDto => ({
  client_id: input.client_id,
  code: input.code,
  name: input.name,
  vendor: input.vendor,
  sector: input.sector,
  last_invoice_at: input.last_invoice_at,
  days_since_last: input.days_since_last,
  ca_total_ht: round2(input.ca_total_ht),
  total_invoices: input.total_invoices,
  status: input.status,
});
