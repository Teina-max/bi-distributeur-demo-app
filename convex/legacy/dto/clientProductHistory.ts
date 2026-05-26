import type { Id } from "@convex/_generated/dataModel";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export type ProductTimelineEntry = {
  year: number;
  month: number;
  qty: number;
  ca_ht: number;
  avg_unit_price_ttc: number;
};

export type SimilarClientRow = {
  client_id: Id<"clients">;
  code: string;
  name: string;
  qty_purchased: number;
  ca_ht: number;
};

export type ClientProductHistoryDto = {
  product_id: Id<"products"> | null;
  code: string;
  name: string;
  family_code: string | null;
  total_qty: number;
  total_ca_ht: number;
  avg_unit_price_ttc: number;
  first_purchase_at: number | null;
  last_purchase_at: number | null;
  purchase_count: number;
  timeline: ProductTimelineEntry[];
  similar_clients: SimilarClientRow[];
};

export const buildTimelineEntry = (
  input: ProductTimelineEntry,
): ProductTimelineEntry => ({
  ...input,
  qty: round2(input.qty),
  ca_ht: round2(input.ca_ht),
  avg_unit_price_ttc: round2(input.avg_unit_price_ttc),
});

export const buildSimilarClient = (
  input: SimilarClientRow,
): SimilarClientRow => ({
  ...input,
  qty_purchased: round2(input.qty_purchased),
  ca_ht: round2(input.ca_ht),
});
