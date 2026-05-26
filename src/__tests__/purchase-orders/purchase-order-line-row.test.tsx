import { describe, expect, test, vi } from "vitest";
import { fireEvent } from "@testing-library/react";
import type { Id } from "@convex/_generated/dataModel";
import { PurchaseOrderLineRow } from "@/routes/app/purchase-orders/_components/purchase-order-line-row";
import { setup } from "@/test/setup";
import type {
  ProductSupplySuggestion,
  SupplyDraftLine,
} from "@/features/supply/types";

const PROD: ProductSupplySuggestion = {
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

const renderEmpty = (overrides: Partial<{ codeDraft: string }> = {}) => {
  const onCodeChange = vi.fn();
  const onPickProduct = vi.fn();
  const onQuantityChange = vi.fn();
  const onPurchasePriceChange = vi.fn();
  const onRemove = vi.fn();
  const onVatOverride = vi.fn();
  const utils = setup(
    <table>
      <tbody>
        <PurchaseOrderLineRow
          index={0}
          line={{ kind: "empty" }}
          suggestions={[PROD, PROD2]}
          onCodeChange={onCodeChange}
          onPickProduct={onPickProduct}
          onQuantityChange={onQuantityChange}
          onPurchasePriceChange={onPurchasePriceChange}
          onRemove={onRemove}
          onVatOverride={onVatOverride}
          codeDraft={overrides.codeDraft ?? ""}
        />
      </tbody>
    </table>,
  );
  return { ...utils, onCodeChange, onPickProduct, onQuantityChange, onRemove };
};

describe("PurchaseOrderLineRow (empty)", () => {
  test("Tab on exact code match calls onPickProduct with the matching product", () => {
    const { getByTestId, onPickProduct } = renderEmpty({
      codeDraft: "CAF-001",
    });
    const input = getByTestId("supply-line-0-code-input") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Tab" });
    expect(onPickProduct).toHaveBeenCalledTimes(1);
    expect(onPickProduct.mock.calls[0]?.[0]).toBe(0);
    expect(onPickProduct.mock.calls[0]?.[1].code).toBe("CAF-001");
  });

  test("Tab with no exact match falls back to first suggestion", () => {
    const { getByTestId, onPickProduct } = renderEmpty({ codeDraft: "caf" });
    const input = getByTestId("supply-line-0-code-input") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Tab" });
    expect(onPickProduct).toHaveBeenCalledTimes(1);
    expect(onPickProduct.mock.calls[0]?.[1].code).toBe("CAF-001");
  });

  test("Ctrl+D on empty line calls onRemove", () => {
    const { getByTestId, onRemove } = renderEmpty();
    const input = getByTestId("supply-line-0-code-input") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "d", ctrlKey: true });
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove.mock.calls[0]?.[0]).toBe(0);
  });

  test("Enter on exact code match calls onPickProduct (same as Tab)", () => {
    const { getByTestId, onPickProduct } = renderEmpty({
      codeDraft: "CAF-001",
    });
    const input = getByTestId("supply-line-0-code-input") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onPickProduct).toHaveBeenCalledTimes(1);
    expect(onPickProduct.mock.calls[0]?.[1].code).toBe("CAF-001");
  });

  test("Click on first item in suggestions list calls onPickProduct", () => {
    const { getByTestId, onPickProduct } = renderEmpty({ codeDraft: "caf" });
    fireEvent.mouseDown(getByTestId("supply-line-0-suggestion-item-CAF-001"));
    expect(onPickProduct).toHaveBeenCalledTimes(1);
    expect(onPickProduct.mock.calls[0]?.[1].code).toBe("CAF-001");
  });

  test("multi-suggestion dropdown lets pick a non-first item", () => {
    const { getByTestId, onPickProduct } = renderEmpty({ codeDraft: "caf" });
    fireEvent.mouseDown(getByTestId("supply-line-0-suggestion-item-ACC-001"));
    expect(onPickProduct).toHaveBeenCalledTimes(1);
    expect(onPickProduct.mock.calls[0]?.[1].code).toBe("ACC-001");
  });

  test("placeholder mentions Tab/Entrée", () => {
    const { getByTestId } = renderEmpty();
    const input = getByTestId("supply-line-0-code-input") as HTMLInputElement;
    expect(input.placeholder).toContain("Tab");
    expect(input.placeholder).toContain("Entrée");
  });
});

describe("PurchaseOrderLineRow (filled)", () => {
  const filledLine: SupplyDraftLine = {
    kind: "filled",
    product_id: PROD.id,
    product_code: PROD.code,
    product_name: PROD.name,
    quantity_ordered: 10,
    unit_purchase_price_ht: 8,
    vat_rate: 20,
  };

  test("displays product info, PU achat input, VAT %, total HT", () => {
    const { getByTestId, getByText } = setup(
      <table>
        <tbody>
          <PurchaseOrderLineRow
            index={1}
            line={filledLine}
            suggestions={[]}
            onCodeChange={vi.fn()}
            onPickProduct={vi.fn()}
            onQuantityChange={vi.fn()}
            onPurchasePriceChange={vi.fn()}
            onRemove={vi.fn()}
            onVatOverride={vi.fn()}
            codeDraft=""
          />
        </tbody>
      </table>,
    );
    expect(getByText("Café Toscano 1kg")).toBeTruthy();
    expect(getByTestId("supply-line-1-vat").textContent).toContain("20");
    expect(getByTestId("supply-line-1-total").textContent).toContain("80,00");
    const puInput = getByTestId("supply-line-1-pu-input") as HTMLInputElement;
    expect(puInput.value).toBe("8");
  });

  test("changing PU achat input calls onPurchasePriceChange", () => {
    const onPurchasePriceChange = vi.fn();
    const { getByTestId } = setup(
      <table>
        <tbody>
          <PurchaseOrderLineRow
            index={0}
            line={filledLine}
            suggestions={[]}
            onCodeChange={vi.fn()}
            onPickProduct={vi.fn()}
            onQuantityChange={vi.fn()}
            onPurchasePriceChange={onPurchasePriceChange}
            onRemove={vi.fn()}
            onVatOverride={vi.fn()}
            codeDraft=""
          />
        </tbody>
      </table>,
    );
    const pu = getByTestId("supply-line-0-pu-input") as HTMLInputElement;
    fireEvent.change(pu, { target: { value: "9.5" } });
    expect(onPurchasePriceChange).toHaveBeenCalledWith(0, 9.5);
  });

  test("delete button click on filled line calls onRemove", () => {
    const onRemove = vi.fn();
    const { getByTestId } = setup(
      <table>
        <tbody>
          <PurchaseOrderLineRow
            index={3}
            line={filledLine}
            suggestions={[]}
            onCodeChange={vi.fn()}
            onPickProduct={vi.fn()}
            onQuantityChange={vi.fn()}
            onPurchasePriceChange={vi.fn()}
            onRemove={onRemove}
            onVatOverride={vi.fn()}
            codeDraft=""
          />
        </tbody>
      </table>,
    );
    fireEvent.click(getByTestId("supply-line-3-remove"));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(3);
  });

  test("Ctrl+T on qty input calls onVatOverride", () => {
    const onVatOverride = vi.fn();
    const { getByTestId } = setup(
      <table>
        <tbody>
          <PurchaseOrderLineRow
            index={2}
            line={filledLine}
            suggestions={[]}
            onCodeChange={vi.fn()}
            onPickProduct={vi.fn()}
            onQuantityChange={vi.fn()}
            onPurchasePriceChange={vi.fn()}
            onRemove={vi.fn()}
            onVatOverride={onVatOverride}
            codeDraft=""
          />
        </tbody>
      </table>,
    );
    const qty = getByTestId("supply-line-2-qty-input") as HTMLInputElement;
    fireEvent.keyDown(qty, { key: "t", ctrlKey: true });
    expect(onVatOverride).toHaveBeenCalledTimes(1);
    expect(onVatOverride.mock.calls[0]?.[0]).toBe(2);
  });
});
