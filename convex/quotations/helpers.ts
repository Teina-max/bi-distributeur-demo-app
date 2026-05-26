import type { Doc, Id } from "@convex/_generated/dataModel";
import { computeVatBreakdown } from "@convex/utils/vatBreakdown";

export type ProductSnapshotInput = {
  _id: Id<"products">;
  code: string;
  name: string;
  price_ht: number;
  vat_rate: number;
};

export type QuotationLineSnapshot = Doc<"quotations">["lines"][number];

type SnapshotOptions = {
  vat_rate_override?: number;
};

const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export function buildLineSnapshot(
  product: ProductSnapshotInput,
  quantity: number,
  options: SnapshotOptions = {},
): QuotationLineSnapshot {
  const vat_rate = options.vat_rate_override ?? product.vat_rate;
  return {
    product_id: product._id,
    product_code: product.code,
    product_name: product.name,
    quantity,
    unit_price_ht: product.price_ht,
    vat_rate,
    line_total_ht: round2(quantity * product.price_ht),
  };
}

type RecomputedTotals = {
  total_ht: number;
  total_vat: number;
  total_ttc: number;
};

export function recomputeTotals(
  lines: readonly QuotationLineSnapshot[],
): RecomputedTotals {
  const breakdown = computeVatBreakdown(lines);
  return {
    total_ht: breakdown.total_ht,
    total_vat: breakdown.total_vat,
    total_ttc: breakdown.total_ttc,
  };
}
