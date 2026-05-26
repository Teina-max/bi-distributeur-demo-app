import { describe, expect, test, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { Id } from "@convex/_generated/dataModel";
import type { ProductDetailDto } from "@convex/products/dto/productDetail";
import { ProductDetailCard } from "@/routes/app/products/_components/product-detail-card";
import { setup } from "@/test/setup";

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
}));

const baseProduct: ProductDetailDto = {
  id: "prod_001" as unknown as Id<"products">,
  code: "CAF-001-1KG",
  name: "Café Toscano Classico 1kg",
  description: "Grains 1kg - arabica 100%",
  category: "café",
  priceHT: 18.5,
  vatRate: 20,
  stockQty: 92,
  stockThreshold: 10,
  isActive: true,
  createdAt: 1747500000000,
  conditioning: null,
  subFamily: null,
  familyCode: null,
  supplierId: null,
  supplierRef: null,
  accountingSaleCode: null,
  accountingPurchaseCode: null,
  purchasePriceHT: null,
  price2TTC: null,
  price3TTC: null,
};

describe("ProductDetailCard", () => {
  test("renders all DTO fields", () => {
    setup(<ProductDetailCard product={baseProduct} isAdmin={false} />);
    expect(screen.getByText("CAF-001-1KG")).toBeInTheDocument();
    expect(screen.getByText("Café Toscano Classico 1kg")).toBeInTheDocument();
    expect(screen.getByTestId("product-detail-category")).toHaveTextContent(
      "café",
    );
    expect(screen.getByTestId("product-detail-price")).toHaveTextContent(
      "18,50 €",
    );
    expect(screen.getByTestId("product-detail-vat")).toHaveTextContent("20");
    expect(screen.getByTestId("product-detail-stock")).toHaveTextContent("92");
    expect(screen.getByTestId("product-detail-threshold")).toHaveTextContent(
      "10",
    );
  });

  test("renders 'Actif' badge when is_active is true", () => {
    setup(<ProductDetailCard product={baseProduct} isAdmin={false} />);
    expect(screen.getByText("Actif")).toBeInTheDocument();
  });

  test("renders 'Inactif' badge when is_active is false", () => {
    setup(
      <ProductDetailCard
        product={{ ...baseProduct, isActive: false }}
        isAdmin={false}
      />,
    );
    expect(screen.getByText("Inactif")).toBeInTheDocument();
  });

  test("renders em-dash when stockThreshold is null", () => {
    setup(
      <ProductDetailCard
        product={{ ...baseProduct, stockThreshold: null }}
        isAdmin={false}
      />,
    );
    expect(screen.getByTestId("product-detail-threshold")).toHaveTextContent(
      "—",
    );
  });

  test("does not render description when empty", () => {
    setup(
      <ProductDetailCard
        product={{ ...baseProduct, description: "" }}
        isAdmin={false}
      />,
    );
    expect(
      screen.queryByText("Grains 1kg - arabica 100%"),
    ).not.toBeInTheDocument();
  });
});
