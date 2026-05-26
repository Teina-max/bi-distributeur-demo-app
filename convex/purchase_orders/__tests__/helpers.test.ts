import { describe, expect, test } from "vitest";
import type { Id } from "@convex/_generated/dataModel";
import {
  buildPurchaseLineSnapshot,
  recomputeSupplyTotals,
  nextPurchaseOrderStatusAfterReceipts,
  assertReceivablePurchaseOrderStatus,
  type SupplyLineSnapshot,
} from "../helpers";

const productId = (n: number) => `prod_${n}` as unknown as Id<"products">;

const makeLine = (
  overrides: Partial<SupplyLineSnapshot> = {},
): SupplyLineSnapshot => ({
  product_id: productId(1),
  product_code: "CAF-001",
  product_name: "Café Toscano 1kg",
  quantity_ordered: 10,
  quantity_received: 0,
  unit_purchase_price_ht: 8,
  vat_rate: 20,
  ...overrides,
});

describe("buildPurchaseLineSnapshot", () => {
  test("freezes product code/name/qty_ordered/PU/VAT, sets qty_received=0", () => {
    const line = buildPurchaseLineSnapshot({
      product_id: productId(7),
      product_code: "CAF-007",
      product_name: "Café Decaf 1kg",
      quantity_ordered: 25,
      unit_purchase_price_ht: 9.5,
      vat_rate: 20,
    });
    expect(line.product_id).toBe(productId(7));
    expect(line.product_code).toBe("CAF-007");
    expect(line.product_name).toBe("Café Decaf 1kg");
    expect(line.quantity_ordered).toBe(25);
    expect(line.quantity_received).toBe(0);
    expect(line.unit_purchase_price_ht).toBe(9.5);
    expect(line.vat_rate).toBe(20);
  });
});

describe("recomputeSupplyTotals", () => {
  test("single rate: 10 * 8.00 HT @ 20% → ht 80, vat 16, ttc 96", () => {
    const t = recomputeSupplyTotals([makeLine()]);
    expect(t.total_ht).toBe(80);
    expect(t.total_vat).toBe(16);
    expect(t.total_ttc).toBe(96);
  });

  test("multi-rate (5.5 + 20)", () => {
    const t = recomputeSupplyTotals([
      makeLine({
        quantity_ordered: 10,
        unit_purchase_price_ht: 8,
        vat_rate: 20,
      }),
      makeLine({
        product_id: productId(2),
        product_code: "SNK-001",
        quantity_ordered: 5,
        unit_purchase_price_ht: 3.2,
        vat_rate: 5.5,
      }),
    ]);
    // 80 @ 20 + 16 @ 5.5 → vat = 16 + 0.88 = 16.88
    expect(t.total_ht).toBe(96);
    expect(t.total_vat).toBe(16.88);
    expect(t.total_ttc).toBe(112.88);
  });
});

describe("nextPurchaseOrderStatusAfterReceipts", () => {
  test("all received → received", () => {
    const lines = [
      makeLine({ quantity_ordered: 10, quantity_received: 10 }),
      makeLine({
        product_id: productId(2),
        quantity_ordered: 5,
        quantity_received: 5,
      }),
    ];
    expect(nextPurchaseOrderStatusAfterReceipts(lines, "draft")).toBe(
      "received",
    );
  });

  test("partial → partially_received", () => {
    const lines = [
      makeLine({ quantity_ordered: 10, quantity_received: 7 }),
      makeLine({
        product_id: productId(2),
        quantity_ordered: 5,
        quantity_received: 0,
      }),
    ];
    expect(nextPurchaseOrderStatusAfterReceipts(lines, "draft")).toBe(
      "partially_received",
    );
  });

  test("none received → keeps current status", () => {
    const lines = [makeLine({ quantity_ordered: 10, quantity_received: 0 })];
    expect(nextPurchaseOrderStatusAfterReceipts(lines, "draft")).toBe("draft");
    expect(nextPurchaseOrderStatusAfterReceipts(lines, "sent")).toBe("sent");
  });

  test("only ordered=0 lines (degenerate, all 'received' trivially)", () => {
    const lines = [makeLine({ quantity_ordered: 0, quantity_received: 0 })];
    expect(nextPurchaseOrderStatusAfterReceipts(lines, "draft")).toBe(
      "received",
    );
  });
});

describe("assertReceivablePurchaseOrderStatus", () => {
  test("draft / sent / partially_received → OK (no throw)", () => {
    expect(() => assertReceivablePurchaseOrderStatus("draft")).not.toThrow();
    expect(() => assertReceivablePurchaseOrderStatus("sent")).not.toThrow();
    expect(() =>
      assertReceivablePurchaseOrderStatus("partially_received"),
    ).not.toThrow();
  });

  test("received → throws 'BC déjà reçu'", () => {
    expect(() => assertReceivablePurchaseOrderStatus("received")).toThrow(
      "BC déjà reçu",
    );
  });

  test("cancelled → throws", () => {
    expect(() => assertReceivablePurchaseOrderStatus("cancelled")).toThrow(
      /BC annulé/,
    );
  });
});
