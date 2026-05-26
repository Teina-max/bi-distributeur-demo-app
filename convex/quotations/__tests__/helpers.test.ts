import { describe, expect, test } from "vitest";
import {
  buildLineSnapshot,
  recomputeTotals,
  type ProductSnapshotInput,
} from "../helpers";

const cafe: ProductSnapshotInput = {
  _id: "p1" as unknown as ProductSnapshotInput["_id"],
  code: "CAF-001-1KG",
  name: "Café Toscano Classico 1kg",
  price_ht: 24.5,
  vat_rate: 20,
};

const snack: ProductSnapshotInput = {
  _id: "p2" as unknown as ProductSnapshotInput["_id"],
  code: "SNK-BIS-200",
  name: "Biscuit Speculoos 200g",
  price_ht: 3.2,
  vat_rate: 5.5,
};

describe("buildLineSnapshot", () => {
  test("freezes product code/name/price/vat into the line", () => {
    const line = buildLineSnapshot(cafe, 5);
    expect(line.product_id).toBe(cafe._id);
    expect(line.product_code).toBe("CAF-001-1KG");
    expect(line.product_name).toBe("Café Toscano Classico 1kg");
    expect(line.unit_price_ht).toBe(24.5);
    expect(line.vat_rate).toBe(20);
    expect(line.quantity).toBe(5);
  });

  test("computes line_total_ht = quantity * unit_price_ht rounded to 2", () => {
    const line = buildLineSnapshot(cafe, 5);
    expect(line.line_total_ht).toBe(122.5);
  });

  test("supports a vat override at snapshot time", () => {
    const line = buildLineSnapshot(cafe, 2, { vat_rate_override: 5.5 });
    expect(line.vat_rate).toBe(5.5);
    expect(line.unit_price_ht).toBe(24.5);
  });
});

describe("recomputeTotals", () => {
  test("returns totals matching computeVatBreakdown for single rate", () => {
    const t = recomputeTotals([buildLineSnapshot(cafe, 5)]);
    // 5 * 24.50 = 122.50, vat 20% = 24.50, ttc = 147.00
    expect(t.total_ht).toBe(122.5);
    expect(t.total_vat).toBe(24.5);
    expect(t.total_ttc).toBe(147);
  });

  test("recomputes multi-VAT totals (5.5 + 20)", () => {
    const t = recomputeTotals([
      buildLineSnapshot(cafe, 1), // 24.50 HT @ 20
      buildLineSnapshot(snack, 10), // 32.00 HT @ 5.5
    ]);
    expect(t.total_ht).toBe(56.5);
    // 4.90 (20%) + 1.76 (5.5%) = 6.66
    expect(t.total_vat).toBe(6.66);
    expect(t.total_ttc).toBe(63.16);
  });
});
