import { describe, expect, test } from "vitest";
import {
  buildStockPreview,
  formatStockPreviewLine,
} from "@/features/conversions/stock-preview";

describe("buildStockPreview", () => {
  test("computes delta + stockAfter per line", () => {
    expect(
      buildStockPreview([
        { product_code: "CAF-001", quantity: 5, current_stock: 100 },
        { product_code: "CAF-002", quantity: 2, current_stock: 50 },
        { product_code: "ACC-001", quantity: 10, current_stock: 300 },
      ]),
    ).toEqual([
      {
        product_code: "CAF-001",
        delta: -5,
        stockAfter: 95,
        insufficient: false,
      },
      {
        product_code: "CAF-002",
        delta: -2,
        stockAfter: 48,
        insufficient: false,
      },
      {
        product_code: "ACC-001",
        delta: -10,
        stockAfter: 290,
        insufficient: false,
      },
    ]);
  });

  test("flags insufficient when stockAfter < 0", () => {
    const results = buildStockPreview([
      { product_code: "X", quantity: 9999, current_stock: 5 },
    ]);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      product_code: "X",
      delta: -9999,
      stockAfter: -9994,
      insufficient: true,
    });
  });
});

describe("formatStockPreviewLine", () => {
  test("renders 'CODE -N (stock après: M)'", () => {
    expect(
      formatStockPreviewLine({
        product_code: "CAF-001",
        delta: -5,
        stockAfter: 95,
        insufficient: false,
      }),
    ).toBe("CAF-001 -5 (stock après: 95)");
  });
});
