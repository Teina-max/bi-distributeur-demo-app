const round2 = (n: number): number => Math.round(n * 100) / 100;

export type BasketBin = {
  label: string;
  min: number;
  max: number | null;
  count: number;
  ca_ht: number;
  share_pct: number;
};

export type BasketHistogramDto = {
  months_back: number;
  total_invoices: number;
  total_ca_ht: number;
  avg_basket_ht: number;
  median_basket_ht: number;
  bins: BasketBin[];
};

// Bins from low-ticket retail to high-ticket B2B for an Toscano distributor.
export const BASKET_BIN_RANGES: readonly {
  min: number;
  max: number | null;
  label: string;
}[] = [
  { min: 0, max: 100, label: "< 100 €" },
  { min: 100, max: 500, label: "100 – 500 €" },
  { min: 500, max: 1000, label: "500 – 1 000 €" },
  { min: 1000, max: 5000, label: "1 000 – 5 000 €" },
  { min: 5000, max: null, label: "> 5 000 €" },
] as const;

export const buildBasketBin = (bin: BasketBin, totalCa: number): BasketBin => ({
  ...bin,
  ca_ht: round2(bin.ca_ht),
  share_pct: totalCa > 0 ? round2((bin.ca_ht / totalCa) * 100) : 0,
});
