import { describe, expect, test } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { Id } from "@convex/_generated/dataModel";
import { usePurchaseOrderLines } from "@/features/supply/use-purchase-order-lines";
import type { ProductSupplySuggestion } from "@/features/supply/types";

const PROD1: ProductSupplySuggestion = {
  id: "prod_1" as unknown as Id<"products">,
  code: "CAF-001",
  name: "Café Toscano 1kg",
  vat_rate: 20,
};

const PROD2: ProductSupplySuggestion = {
  id: "prod_2" as unknown as Id<"products">,
  code: "ACC-001",
  name: "Filtre permanent",
  vat_rate: 20,
};

describe("usePurchaseOrderLines", () => {
  test("starts with a single empty trailing line", () => {
    const { result } = renderHook(() => usePurchaseOrderLines([]));
    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0].kind).toBe("empty");
    expect(result.current.filled).toHaveLength(0);
    expect(result.current.payload).toHaveLength(0);
  });

  test("setProduct fills the line and appends a trailing empty", () => {
    const { result } = renderHook(() => usePurchaseOrderLines([]));
    act(() => {
      result.current.setProduct(0, PROD1, {
        quantity_ordered: 10,
        unit_purchase_price_ht: 8,
      });
    });
    expect(result.current.lines).toHaveLength(2);
    expect(result.current.lines[0].kind).toBe("filled");
    expect(result.current.lines[1].kind).toBe("empty");
    expect(result.current.filled).toHaveLength(1);
    const filled = result.current.filled[0];
    expect(filled.product_code).toBe("CAF-001");
    expect(filled.quantity_ordered).toBe(10);
    expect(filled.unit_purchase_price_ht).toBe(8);
    expect(filled.vat_rate).toBe(20);
  });

  test("setQuantity / setPurchasePrice update only the targeted filled line", () => {
    const { result } = renderHook(() => usePurchaseOrderLines([]));
    act(() => {
      result.current.setProduct(0, PROD1, {
        quantity_ordered: 10,
        unit_purchase_price_ht: 8,
      });
    });
    act(() => {
      result.current.setQuantity(0, 25);
    });
    act(() => {
      result.current.setPurchasePrice(0, 7.5);
    });
    const filled = result.current.filled[0];
    expect(filled.quantity_ordered).toBe(25);
    expect(filled.unit_purchase_price_ht).toBe(7.5);
  });

  test("setVatOverride mutates only vat_rate", () => {
    const { result } = renderHook(() => usePurchaseOrderLines([]));
    act(() => {
      result.current.setProduct(0, PROD1, {
        quantity_ordered: 10,
        unit_purchase_price_ht: 8,
      });
    });
    act(() => {
      result.current.setVatOverride(0, 5.5);
    });
    expect(result.current.filled[0].vat_rate).toBe(5.5);
    expect(result.current.filled[0].unit_purchase_price_ht).toBe(8);
  });

  test("removeLine removes a filled line and preserves trailing empty", () => {
    const { result } = renderHook(() => usePurchaseOrderLines([]));
    act(() => {
      result.current.setProduct(0, PROD1, {
        quantity_ordered: 10,
        unit_purchase_price_ht: 8,
      });
    });
    act(() => {
      result.current.setProduct(1, PROD2, {
        quantity_ordered: 5,
        unit_purchase_price_ht: 12,
      });
    });
    expect(result.current.filled).toHaveLength(2);
    act(() => {
      result.current.removeLine(0);
    });
    expect(result.current.filled).toHaveLength(1);
    expect(result.current.filled[0].product_code).toBe("ACC-001");
    // Trailing empty always preserved
    expect(result.current.lines[result.current.lines.length - 1].kind).toBe(
      "empty",
    );
  });

  test("removeLine on the only empty trailing line is a no-op", () => {
    const { result } = renderHook(() => usePurchaseOrderLines([]));
    act(() => {
      result.current.removeLine(0);
    });
    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0].kind).toBe("empty");
  });

  test("payload mirrors filled lines without `kind`", () => {
    const { result } = renderHook(() => usePurchaseOrderLines([]));
    act(() => {
      result.current.setProduct(0, PROD1, {
        quantity_ordered: 10,
        unit_purchase_price_ht: 8,
      });
    });
    expect(result.current.payload).toEqual([
      {
        product_id: PROD1.id,
        product_code: "CAF-001",
        product_name: "Café Toscano 1kg",
        quantity_ordered: 10,
        unit_purchase_price_ht: 8,
        vat_rate: 20,
      },
    ]);
  });

  test("reset replaces lines with provided initial payload + trailing empty", () => {
    const { result } = renderHook(() => usePurchaseOrderLines([]));
    act(() => {
      result.current.reset([
        {
          product_id: PROD2.id,
          product_code: "ACC-001",
          product_name: "Filtre permanent",
          quantity_ordered: 3,
          unit_purchase_price_ht: 11,
          vat_rate: 20,
        },
      ]);
    });
    expect(result.current.filled).toHaveLength(1);
    expect(result.current.filled[0].product_code).toBe("ACC-001");
    expect(result.current.filled[0].quantity_ordered).toBe(3);
    expect(result.current.lines[result.current.lines.length - 1].kind).toBe(
      "empty",
    );
  });

  test("initial lines passed to constructor are hydrated", () => {
    const { result } = renderHook(() =>
      usePurchaseOrderLines([
        {
          product_id: PROD1.id,
          product_code: "CAF-001",
          product_name: "Café Toscano 1kg",
          quantity_ordered: 5,
          unit_purchase_price_ht: 8,
          vat_rate: 20,
        },
      ]),
    );
    expect(result.current.filled).toHaveLength(1);
    expect(result.current.filled[0].product_code).toBe("CAF-001");
  });
});
