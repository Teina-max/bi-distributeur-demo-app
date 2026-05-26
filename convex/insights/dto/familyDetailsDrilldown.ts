import type { Id } from "@convex/_generated/dataModel";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export type FamilyProductRow = {
  product_id: Id<"products">;
  code: string;
  name: string;
  ca_ht: number;
  qty_sold: number;
  unique_clients: number;
};

export type FamilyClientRow = {
  client_id: Id<"clients">;
  code: string;
  name: string;
  ca_ht: number;
  qty_purchased: number;
};

export type FamilyDetailsDrilldownDto = {
  family_code: string;
  months_back: number;
  total_ca_ht: number;
  total_qty: number;
  product_count: number;
  client_count: number;
  top_products: FamilyProductRow[];
  top_clients: FamilyClientRow[];
};

export const buildFamilyProductRow = (
  input: FamilyProductRow,
): FamilyProductRow => ({
  ...input,
  ca_ht: round2(input.ca_ht),
  qty_sold: round2(input.qty_sold),
});

export const buildFamilyClientRow = (
  input: FamilyClientRow,
): FamilyClientRow => ({
  ...input,
  ca_ht: round2(input.ca_ht),
  qty_purchased: round2(input.qty_purchased),
});
