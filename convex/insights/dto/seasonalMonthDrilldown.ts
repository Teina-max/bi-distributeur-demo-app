import type { Id } from "@convex/_generated/dataModel";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export type SeasonalYearRow = {
  year: number;
  ca_ht: number;
  invoice_count: number;
  active_clients: number;
};

export type SeasonalClientRow = {
  client_id: Id<"clients">;
  code: string;
  name: string;
  ca_ht: number;
  invoice_count: number;
};

export type SeasonalMonthDrilldownDto = {
  month: number;
  label: string;
  years_back: number;
  avg_ca_ht: number;
  year_breakdown: SeasonalYearRow[];
  top_clients: SeasonalClientRow[];
};

export const buildSeasonalYearRow = (
  input: SeasonalYearRow,
): SeasonalYearRow => ({
  ...input,
  ca_ht: round2(input.ca_ht),
});

export const buildSeasonalClientRow = (
  input: SeasonalClientRow,
): SeasonalClientRow => ({
  ...input,
  ca_ht: round2(input.ca_ht),
});
