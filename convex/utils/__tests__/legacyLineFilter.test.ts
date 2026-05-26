import { describe, expect, test } from "vitest";
import { isCommentLikeLine } from "../legacyLineFilter";

describe("isCommentLikeLine", () => {
  test("flags fully empty row (comment line)", () => {
    expect(
      isCommentLikeLine({
        product_legacy_code: "",
        quantity: 0,
        unit_price_ttc: 0,
        unit_cost_pmp: 0,
        line_total_ht: 0,
      }),
    ).toBe(true);
  });

  test("flags whitespace-only product code as empty", () => {
    expect(
      isCommentLikeLine({
        product_legacy_code: "   ",
        quantity: 0,
        unit_price_ttc: 0,
        unit_cost_pmp: 0,
        line_total_ht: 0,
      }),
    ).toBe(true);
  });

  test("keeps row with a real product code even when amounts are zero", () => {
    expect(
      isCommentLikeLine({
        product_legacy_code: "ART001",
        quantity: 0,
        unit_price_ttc: 0,
        unit_cost_pmp: 0,
        line_total_ht: 0,
      }),
    ).toBe(false);
  });

  test("keeps unkeyed row that still carries a quantity", () => {
    expect(
      isCommentLikeLine({
        product_legacy_code: "",
        quantity: 1,
        unit_price_ttc: 0,
        unit_cost_pmp: 0,
        line_total_ht: 0,
      }),
    ).toBe(false);
  });

  test("keeps unkeyed row that still carries a price", () => {
    expect(
      isCommentLikeLine({
        product_legacy_code: "",
        quantity: 0,
        unit_price_ttc: 12.5,
        unit_cost_pmp: 0,
        line_total_ht: 0,
      }),
    ).toBe(false);
  });

  test("keeps unkeyed row that still carries a line total", () => {
    expect(
      isCommentLikeLine({
        product_legacy_code: "",
        quantity: 0,
        unit_price_ttc: 0,
        unit_cost_pmp: 0,
        line_total_ht: -42,
      }),
    ).toBe(false);
  });
});
