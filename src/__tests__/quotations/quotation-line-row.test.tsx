import { describe, expect, test, vi } from "vitest";
import { fireEvent } from "@testing-library/react";
import type { Id } from "@convex/_generated/dataModel";
import { QuotationLineRow } from "@/routes/app/quotations/_components/quotation-line-row";
import { setup } from "@/test/setup";
import type { DraftLine, ProductSuggestion } from "@/features/quotations/types";

const PROD: ProductSuggestion = {
  id: "prod_1" as unknown as Id<"products">,
  code: "CAF-001-1KG",
  name: "Café Toscano Classico 1kg",
  price_ht: 24.5,
  vat_rate: 20,
};

const PROD2: ProductSuggestion = {
  id: "prod_2" as unknown as Id<"products">,
  code: "CAF-002-1KG",
  name: "Café Toscano Decaf 1kg",
  price_ht: 26,
  vat_rate: 20,
};

const renderEmpty = (overrides: Partial<{ codeDraft: string }> = {}) => {
  const onCodeChange = vi.fn();
  const onPickProduct = vi.fn();
  const onQuantityChange = vi.fn();
  const onRemove = vi.fn();
  const onVatOverride = vi.fn();
  const utils = setup(
    <table>
      <tbody>
        <QuotationLineRow
          index={0}
          line={{ kind: "empty" }}
          suggestions={[PROD, PROD2]}
          onCodeChange={onCodeChange}
          onPickProduct={onPickProduct}
          onQuantityChange={onQuantityChange}
          onRemove={onRemove}
          onVatOverride={onVatOverride}
          codeDraft={overrides.codeDraft ?? ""}
        />
      </tbody>
    </table>,
  );
  return {
    ...utils,
    onCodeChange,
    onPickProduct,
    onQuantityChange,
    onRemove,
    onVatOverride,
  };
};

describe("QuotationLineRow (empty)", () => {
  test("Tab on exact code match calls onPickProduct with the matching product", () => {
    const { getByTestId, onPickProduct } = renderEmpty({
      codeDraft: "CAF-001-1KG",
    });
    const input = getByTestId("line-0-code-input") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Tab" });
    expect(onPickProduct).toHaveBeenCalledTimes(1);
    expect(onPickProduct.mock.calls[0]?.[0]).toBe(0);
    expect(onPickProduct.mock.calls[0]?.[1].code).toBe("CAF-001-1KG");
  });

  test("Tab with no exact match falls back to first suggestion", () => {
    const { getByTestId, onPickProduct } = renderEmpty({ codeDraft: "caf" });
    const input = getByTestId("line-0-code-input") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Tab" });
    expect(onPickProduct).toHaveBeenCalledTimes(1);
    expect(onPickProduct.mock.calls[0]?.[1].code).toBe("CAF-001-1KG");
  });

  test("Ctrl+D on empty line calls onRemove (parent decides if no-op)", () => {
    const { getByTestId, onRemove } = renderEmpty();
    const input = getByTestId("line-0-code-input") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "d", ctrlKey: true });
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove.mock.calls[0]?.[0]).toBe(0);
  });

  test("Enter on exact code match calls onPickProduct (same as Tab)", () => {
    const { getByTestId, onPickProduct } = renderEmpty({
      codeDraft: "CAF-001-1KG",
    });
    const input = getByTestId("line-0-code-input") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onPickProduct).toHaveBeenCalledTimes(1);
    expect(onPickProduct.mock.calls[0]?.[1].code).toBe("CAF-001-1KG");
  });

  test("Enter with no suggestions does nothing (no pick, no preventDefault crash)", () => {
    const onCodeChange = vi.fn();
    const onPickProduct = vi.fn();
    const { getByTestId } = setup(
      <table>
        <tbody>
          <QuotationLineRow
            index={0}
            line={{ kind: "empty" }}
            suggestions={[]}
            onCodeChange={onCodeChange}
            onPickProduct={onPickProduct}
            onQuantityChange={vi.fn()}
            onRemove={vi.fn()}
            onVatOverride={vi.fn()}
            codeDraft="zzz"
          />
        </tbody>
      </table>,
    );
    const input = getByTestId("line-0-code-input") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onPickProduct).not.toHaveBeenCalled();
  });

  test("Click on first item in suggestions list calls onPickProduct", () => {
    const { getByTestId, onPickProduct } = renderEmpty({ codeDraft: "caf" });
    fireEvent.mouseDown(getByTestId("line-0-suggestion-item-CAF-001-1KG"));
    expect(onPickProduct).toHaveBeenCalledTimes(1);
    expect(onPickProduct.mock.calls[0]?.[0]).toBe(0);
    expect(onPickProduct.mock.calls[0]?.[1].code).toBe("CAF-001-1KG");
  });

  test("placeholder mentions Tab/Entrée", () => {
    const { getByTestId } = renderEmpty();
    const input = getByTestId("line-0-code-input") as HTMLInputElement;
    expect(input.placeholder).toContain("Tab");
    expect(input.placeholder).toContain("Entrée");
  });

  test("hint visible when empty draft and no suggestions", () => {
    const onCodeChange = vi.fn();
    const { getByTestId } = setup(
      <table>
        <tbody>
          <QuotationLineRow
            index={0}
            line={{ kind: "empty" }}
            suggestions={[]}
            onCodeChange={onCodeChange}
            onPickProduct={vi.fn()}
            onQuantityChange={vi.fn()}
            onRemove={vi.fn()}
            onVatOverride={vi.fn()}
            codeDraft=""
          />
        </tbody>
      </table>,
    );
    expect(getByTestId("line-0-hint-empty").textContent).toMatch(/Tab\/Entrée/);
  });

  test("nomatch hint shown when draft has value but no suggestions", () => {
    const { getByTestId } = setup(
      <table>
        <tbody>
          <QuotationLineRow
            index={0}
            line={{ kind: "empty" }}
            suggestions={[]}
            onCodeChange={vi.fn()}
            onPickProduct={vi.fn()}
            onQuantityChange={vi.fn()}
            onRemove={vi.fn()}
            onVatOverride={vi.fn()}
            codeDraft="zzz"
          />
        </tbody>
      </table>,
    );
    expect(getByTestId("line-0-hint-nomatch").textContent).toContain("zzz");
  });

  test("multi-suggestion dropdown lists each product when suggestions.length > 1", () => {
    const { getByTestId, onPickProduct } = renderEmpty({ codeDraft: "caf" });
    expect(getByTestId("line-0-suggestions-list")).toBeInTheDocument();
    const second = getByTestId("line-0-suggestion-item-CAF-002-1KG");
    fireEvent.mouseDown(second);
    expect(onPickProduct).toHaveBeenCalledTimes(1);
    expect(onPickProduct.mock.calls[0]?.[1].code).toBe("CAF-002-1KG");
  });

  test("dropdown shown even with a single suggestion", () => {
    const { getByTestId } = setup(
      <table>
        <tbody>
          <QuotationLineRow
            index={0}
            line={{ kind: "empty" }}
            suggestions={[PROD]}
            onCodeChange={vi.fn()}
            onPickProduct={vi.fn()}
            onQuantityChange={vi.fn()}
            onRemove={vi.fn()}
            onVatOverride={vi.fn()}
            codeDraft="caf-001"
          />
        </tbody>
      </table>,
    );
    expect(getByTestId("line-0-suggestions-list")).toBeInTheDocument();
    expect(
      getByTestId("line-0-suggestion-item-CAF-001-1KG"),
    ).toBeInTheDocument();
  });
});

describe("QuotationLineRow (filled)", () => {
  const filledLine: DraftLine = {
    kind: "filled",
    product_id: PROD.id,
    product_code: PROD.code,
    product_name: PROD.name,
    quantity: 5,
    unit_price_ht: PROD.price_ht,
    vat_rate: PROD.vat_rate,
    line_total_ht: 122.5,
  };

  test("displays product info + total amount", () => {
    const { getByTestId, getByText } = setup(
      <table>
        <tbody>
          <QuotationLineRow
            index={1}
            line={filledLine}
            suggestions={[]}
            onCodeChange={vi.fn()}
            onPickProduct={vi.fn()}
            onQuantityChange={vi.fn()}
            onRemove={vi.fn()}
            onVatOverride={vi.fn()}
            codeDraft=""
          />
        </tbody>
      </table>,
    );
    expect(getByText("Café Toscano Classico 1kg")).toBeTruthy();
    expect(getByTestId("line-1-total").textContent).toContain("122,50");
  });

  test("delete button click on filled line calls onRemove", () => {
    const onRemove = vi.fn();
    const { getByTestId } = setup(
      <table>
        <tbody>
          <QuotationLineRow
            index={3}
            line={filledLine}
            suggestions={[]}
            onCodeChange={vi.fn()}
            onPickProduct={vi.fn()}
            onQuantityChange={vi.fn()}
            onRemove={onRemove}
            onVatOverride={vi.fn()}
            codeDraft=""
          />
        </tbody>
      </table>,
    );
    fireEvent.click(getByTestId("line-3-remove"));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(3);
  });

  test("Ctrl+T on quantity input calls onVatOverride", () => {
    const onVatOverride = vi.fn();
    const { getByTestId } = setup(
      <table>
        <tbody>
          <QuotationLineRow
            index={2}
            line={filledLine}
            suggestions={[]}
            onCodeChange={vi.fn()}
            onPickProduct={vi.fn()}
            onQuantityChange={vi.fn()}
            onRemove={vi.fn()}
            onVatOverride={onVatOverride}
            codeDraft=""
          />
        </tbody>
      </table>,
    );
    const qty = getByTestId("line-2-qty-input") as HTMLInputElement;
    fireEvent.keyDown(qty, { key: "t", ctrlKey: true });
    expect(onVatOverride).toHaveBeenCalledTimes(1);
    expect(onVatOverride.mock.calls[0]?.[0]).toBe(2);
  });
});
