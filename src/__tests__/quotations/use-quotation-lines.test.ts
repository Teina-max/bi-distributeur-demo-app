import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { Id } from "@convex/_generated/dataModel";
import type { ProductSuggestion } from "@/features/quotations/types";
import { useQuotationLines } from "@/features/quotations/use-quotation-lines";

const fakeProduct = (
  overrides: Partial<ProductSuggestion> = {},
): ProductSuggestion => ({
  id: "prod_test" as unknown as Id<"products">,
  code: "CAF-001-1KG",
  name: "Café Toscano Classico 1kg",
  price_ht: 24.5,
  vat_rate: 20,
  ...overrides,
});

describe("useQuotationLines", () => {
  test("initial state has exactly one empty line", () => {
    const { result } = renderHook(() => useQuotationLines());
    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0]?.kind).toBe("empty");
    expect(result.current.filled).toHaveLength(0);
  });

  test("setProduct fills the slot and auto-appends a new empty line", () => {
    const { result } = renderHook(() => useQuotationLines());
    act(() => {
      result.current.setProduct(0, fakeProduct(), 5);
    });
    expect(result.current.lines).toHaveLength(2);
    expect(result.current.lines[0]?.kind).toBe("filled");
    expect(result.current.lines[1]?.kind).toBe("empty");
    expect(result.current.filled[0]?.line_total_ht).toBe(122.5);
  });

  test("removeLine never removes the last empty line", () => {
    const { result } = renderHook(() => useQuotationLines());
    act(() => {
      result.current.removeLine(0);
    });
    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0]?.kind).toBe("empty");
  });

  test("removeLine on a filled row keeps the trailing empty line", () => {
    const { result } = renderHook(() => useQuotationLines());
    act(() => {
      result.current.setProduct(0, fakeProduct(), 5);
    });
    act(() => {
      result.current.removeLine(0);
    });
    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0]?.kind).toBe("empty");
    expect(result.current.filled).toHaveLength(0);
  });

  test("setVatOverride changes the vat_rate of the row without touching unit_price_ht", () => {
    const { result } = renderHook(() => useQuotationLines());
    act(() => {
      result.current.setProduct(0, fakeProduct(), 2);
    });
    expect(result.current.filled[0]?.vat_rate).toBe(20);
    act(() => {
      result.current.setVatOverride(0, 5.5);
    });
    expect(result.current.filled[0]?.vat_rate).toBe(5.5);
    expect(result.current.filled[0]?.unit_price_ht).toBe(24.5);
  });

  test("setQuantity recomputes line_total_ht", () => {
    const { result } = renderHook(() => useQuotationLines());
    act(() => {
      result.current.setProduct(0, fakeProduct(), 1);
    });
    act(() => {
      result.current.setQuantity(0, 7);
    });
    expect(result.current.filled[0]?.quantity).toBe(7);
    expect(result.current.filled[0]?.line_total_ht).toBe(171.5);
  });

  test("payload exposes filled-only data ready for Convex create", () => {
    const { result } = renderHook(() => useQuotationLines());
    act(() => {
      result.current.setProduct(
        0,
        fakeProduct({ code: "X", price_ht: 10, vat_rate: 20 }),
        3,
      );
    });
    expect(result.current.payload).toHaveLength(1);
    expect(result.current.payload[0]?.product_code).toBe("X");
    expect(result.current.payload[0]?.line_total_ht).toBe(30);
  });
});
