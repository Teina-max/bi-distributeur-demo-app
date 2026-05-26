import { describe, expect, test } from "vitest";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { toProductListItemDto } from "../dto/productListItem";
import { toProductDetailDto } from "../dto/productDetail";

const makeProductDoc = (
  override: Partial<Doc<"products">> = {},
): Doc<"products"> => ({
  _id: "prod_001" as unknown as Id<"products">,
  _creationTime: 1747500000000,
  organization_id: "toscana-beverages-demo",
  code: "CAF-001-1KG",
  name: "Café Toscano Classico 1kg",
  description: "Grains 1kg - arabica 100%",
  category: "café",
  price_ht: 18.5,
  vat_rate: 20,
  stock_qty: 92,
  stock_threshold: 10,
  is_active: true,
  search_tokens: ["cafe", "toscano", "classico"],
  ...override,
});

describe("toProductListItemDto", () => {
  test("flattens product doc to list-item shape", () => {
    const dto = toProductListItemDto(makeProductDoc());
    expect(dto).toEqual({
      id: "prod_001",
      code: "CAF-001-1KG",
      name: "Café Toscano Classico 1kg",
      category: "café",
      priceHT: 18.5,
      vatRate: 20,
      stockQty: 92,
      stockThreshold: 10,
      isActive: true,
    });
  });

  test("preserves null stockThreshold", () => {
    const dto = toProductListItemDto(makeProductDoc({ stock_threshold: null }));
    expect(dto.stockThreshold).toBeNull();
  });

  test("preserves isActive false", () => {
    const dto = toProductListItemDto(makeProductDoc({ is_active: false }));
    expect(dto.isActive).toBe(false);
  });
});

describe("toProductDetailDto", () => {
  test("returns full detail shape with description and createdAt", () => {
    const dto = toProductDetailDto(makeProductDoc());
    expect(dto).toEqual({
      id: "prod_001",
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
    });
  });

  test("preserves null stockThreshold", () => {
    const dto = toProductDetailDto(makeProductDoc({ stock_threshold: null }));
    expect(dto.stockThreshold).toBeNull();
  });
});

const fakeId = (s: string) => s as unknown as Id<"products">;
const fakeSupplierId = (s: string) => s as unknown as Id<"suppliers">;

const baseDoc: Doc<"products"> = {
  _id: fakeId("prod-1"),
  _creationTime: 1_700_000_000_000,
  organization_id: "org-1",
  code: "P001",
  name: "Café Toscano 1kg",
  description: "Grains",
  category: "café",
  price_ht: 12.5,
  vat_rate: 5.5,
  stock_qty: 42,
  stock_threshold: 10,
  is_active: true,
  search_tokens: ["cafe", "toscano"],
  conditioning: "Sachet 1kg",
  sub_family: "Espresso",
  family_code: "CAFE",
  supplier_id: fakeSupplierId("sup-1"),
  supplier_ref: "TOSCANO-001",
  accounting_sale_code: "701000",
  accounting_purchase_code: "601000",
  purchase_price_ht: 8.0,
  price_2_ttc: 14.0,
  price_3_ttc: 15.5,
  legacy_imported_at: 1_690_000_000_000,
};

describe("toProductDetailDto Heritage fields", () => {
  test("expose tous les champs Heritage", () => {
    const dto = toProductDetailDto(baseDoc);
    expect(dto.conditioning).toBe("Sachet 1kg");
    expect(dto.subFamily).toBe("Espresso");
    expect(dto.familyCode).toBe("CAFE");
    expect(dto.supplierId).toBe(fakeSupplierId("sup-1"));
    expect(dto.supplierRef).toBe("TOSCANO-001");
    expect(dto.accountingSaleCode).toBe("701000");
    expect(dto.accountingPurchaseCode).toBe("601000");
    expect(dto.purchasePriceHT).toBe(8.0);
    expect(dto.price2TTC).toBe(14.0);
    expect(dto.price3TTC).toBe(15.5);
  });

  test("gère les nulls Heritage", () => {
    const dto = toProductDetailDto({
      ...baseDoc,
      conditioning: null,
      sub_family: null,
    });
    expect(dto.conditioning).toBeNull();
    expect(dto.subFamily).toBeNull();
  });

  test("gère les champs Heritage undefined (produit non importé)", () => {
    const stripped = { ...baseDoc };
    delete (stripped as Record<string, unknown>).conditioning;
    delete (stripped as Record<string, unknown>).purchase_price_ht;
    const dto = toProductDetailDto(stripped as Doc<"products">);
    expect(dto.conditioning).toBeNull();
    expect(dto.purchasePriceHT).toBeNull();
  });
});
