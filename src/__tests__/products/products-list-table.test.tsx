import { act } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { useNavigate } from "@tanstack/react-router";
import type { Id } from "@convex/_generated/dataModel";
import type { ProductListItemDto } from "@convex/products/dto/productListItem";
import { ProductsListTable } from "@/routes/app/products/_components/products-list-table";
import { setup } from "@/test/setup";

const id = (s: string) => s as unknown as Id<"products">;

const PRODUCT: ProductListItemDto = {
  id: id("prod_001"),
  code: "CAF-001-1KG",
  name: "Café Toscano Classico 1kg",
  category: "café",
  priceHT: 18.5,
  vatRate: 20,
  stockQty: 92,
  stockThreshold: null,
  isActive: true,
};

const ROWS: ProductListItemDto[] = [
  PRODUCT,
  { ...PRODUCT, id: id("prod_002"), code: "CAF-002-1KG", name: "Décaf" },
  { ...PRODUCT, id: id("prod_003"), code: "CAF-003-1KG", name: "Forte" },
  {
    ...PRODUCT,
    id: id("prod_004"),
    code: "CAF-004-1KG",
    name: "Doux",
    isActive: false,
  },
  { ...PRODUCT, id: id("prod_005"), code: "CAF-005-1KG", name: "Light" },
];

const press = (key: string) => {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
};

describe("ProductsListTable", () => {
  test("renders empty state when items array is empty", () => {
    const { getByText } = setup(<ProductsListTable items={[]} />);
    expect(getByText("Aucun produit trouvé.")).toBeTruthy();
  });

  test("renders one row per item with code and name", () => {
    const { getByTestId } = setup(<ProductsListTable items={ROWS} />);
    expect(getByTestId("product-row-prod_001")).toBeTruthy();
    expect(getByTestId("product-row-prod_005")).toBeTruthy();
    expect(getByTestId("product-row-prod_001").textContent).toContain(
      "CAF-001-1KG",
    );
    expect(getByTestId("product-row-prod_001").textContent).toContain(
      "Café Toscano Classico 1kg",
    );
  });

  test("first row is active by default", () => {
    const { getByTestId } = setup(<ProductsListTable items={ROWS} />);
    expect(
      getByTestId("product-row-prod_001").getAttribute("data-active"),
    ).toBe("true");
    expect(
      getByTestId("product-row-prod_002").getAttribute("data-active"),
    ).toBe("false");
  });

  test("ArrowDown moves active row", () => {
    const { getByTestId } = setup(<ProductsListTable items={ROWS} />);
    act(() => press("ArrowDown"));
    expect(
      getByTestId("product-row-prod_002").getAttribute("data-active"),
    ).toBe("true");
  });

  test("Enter navigates to product detail", () => {
    const navigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigate);
    setup(<ProductsListTable items={ROWS} />);
    act(() => press("ArrowDown"));
    act(() => press("Enter"));
    expect(navigate).toHaveBeenCalledWith({
      to: "/app/products/$productId",
      params: { productId: "prod_002" },
    });
  });

  test("renders Actif/Inactif badge correctly", () => {
    const { getByTestId } = setup(<ProductsListTable items={ROWS} />);
    expect(getByTestId("product-row-prod_001").textContent).toContain("Oui");
    expect(getByTestId("product-row-prod_004").textContent).toContain("Non");
  });
});
