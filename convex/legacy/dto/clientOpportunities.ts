import type { Id } from "@convex/_generated/dataModel";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export type AbandonedProductRow = {
  product_id: Id<"products"> | null;
  code: string;
  name: string;
  family_code: string | null;
  last_purchase_at: number;
  days_since: number;
  ca_historical_ht: number;
  total_qty_historical: number;
};

export type CrossSellProductRow = {
  product_id: Id<"products">;
  code: string;
  name: string;
  family_code: string | null;
  popularity_score: number;
  top_buyer_count: number;
  avg_unit_price_ttc: number;
};

export type ClientOpportunitiesDto = {
  months_threshold: number;
  abandoned: AbandonedProductRow[];
  cross_sell: CrossSellProductRow[];
};

export const buildAbandonedRow = (
  input: AbandonedProductRow,
): AbandonedProductRow => ({
  ...input,
  ca_historical_ht: round2(input.ca_historical_ht),
  total_qty_historical: round2(input.total_qty_historical),
});

export const buildCrossSellRow = (
  input: CrossSellProductRow,
): CrossSellProductRow => ({
  ...input,
  popularity_score: round2(input.popularity_score),
  avg_unit_price_ttc: round2(input.avg_unit_price_ttc),
});
