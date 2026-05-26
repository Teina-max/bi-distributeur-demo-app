const round2 = (n: number): number => Math.round(n * 100) / 100;

export type ClientYearRow = {
  year: number;
  ca_ht: number;
  invoice_count: number;
  is_archive: boolean; // pre-2011 aggregated archive
};

export type ClientYearlyRevenueDto = {
  rows: ClientYearRow[];
  best_year: number | null;
  best_year_ca_ht: number;
  worst_year_with_activity: number | null;
  worst_year_ca_ht: number;
  growth_pct_last_year: number | null;
  total_ca_ht: number;
};

export const buildClientYearRow = (input: ClientYearRow): ClientYearRow => ({
  ...input,
  ca_ht: round2(input.ca_ht),
});
