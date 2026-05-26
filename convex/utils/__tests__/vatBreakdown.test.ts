import { describe, expect, test } from "vitest";
import { computeVatBreakdown } from "../vatBreakdown";

describe("computeVatBreakdown", () => {
  test("groups lines by VAT rate and computes per-rate totals", () => {
    const result = computeVatBreakdown([
      { quantity: 5, unit_price_ht: 18.5, vat_rate: 20 },
      { quantity: 2, unit_price_ht: 19.8, vat_rate: 20 },
      { quantity: 1, unit_price_ht: 4.0, vat_rate: 5.5 },
    ]);

    expect(result.lines).toEqual([
      { vat_rate: 5.5, total_ht: 4, vat_amount: 0.22 },
      { vat_rate: 20, total_ht: 132.1, vat_amount: 26.42 },
    ]);
    expect(result.total_ht).toBe(136.1);
    expect(result.total_vat).toBe(26.64);
    expect(result.total_ttc).toBe(162.74);
  });

  test("returns zero totals on empty input", () => {
    const result = computeVatBreakdown([]);
    expect(result.lines).toEqual([]);
    expect(result.total_ht).toBe(0);
    expect(result.total_vat).toBe(0);
    expect(result.total_ttc).toBe(0);
  });

  test("rounds to 2 decimals", () => {
    const result = computeVatBreakdown([
      { quantity: 3, unit_price_ht: 1.333, vat_rate: 20 },
    ]);
    expect(result.total_ht).toBe(4);
    expect(result.total_vat).toBe(0.8);
    expect(result.total_ttc).toBe(4.8);
  });
});
