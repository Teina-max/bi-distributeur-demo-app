import type { Id } from "@convex/_generated/dataModel";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export type MonthClientRow = {
  client_id: Id<"clients">;
  code: string;
  name: string;
  ca_ht: number;
  invoice_count: number;
};

export type MonthFamilyRow = {
  family_code: string;
  ca_ht: number;
  qty_sold: number;
  share_pct: number;
};

export type MonthDetailsDrilldownDto = {
  year: number;
  month: number;
  total_ca_ht: number;
  total_invoices: number;
  active_clients: number;
  top_clients: MonthClientRow[];
  family_breakdown: MonthFamilyRow[];
};

export const buildMonthFamilyRow = (
  family_code: string,
  ca_ht: number,
  qty_sold: number,
  total_ca_ht: number,
): MonthFamilyRow => ({
  family_code,
  ca_ht: round2(ca_ht),
  qty_sold: round2(qty_sold),
  share_pct: total_ca_ht > 0 ? round2((ca_ht / total_ca_ht) * 100) : 0,
});

export const buildMonthClientRow = (input: MonthClientRow): MonthClientRow => ({
  ...input,
  ca_ht: round2(input.ca_ht),
});
