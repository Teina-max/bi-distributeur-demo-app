import type { Id } from "@convex/_generated/dataModel";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export type ActiveClientRow = {
  client_id: Id<"clients">;
  code: string;
  name: string;
  vendor: string | null;
  ca_period_ht: number;
  invoice_count: number;
  last_invoice_at: number | null;
};

export type ActiveClientsDrilldownDto = {
  months_back: number;
  count: number;
  rows: ActiveClientRow[];
};

export const buildActiveClientRow = (
  input: ActiveClientRow,
): ActiveClientRow => ({
  ...input,
  ca_period_ht: round2(input.ca_period_ht),
});
