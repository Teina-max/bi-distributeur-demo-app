import { describe, expect, test } from "vitest";
import { toClientSearchDto } from "../dto/clientSearch";
import { toProductSearchDto } from "../dto/productSearch";
import type { Doc } from "@convex/_generated/dataModel";

describe("toClientSearchDto", () => {
  test("maps client doc to compact DTO", () => {
    const doc = {
      _id: "client_001",
      _creationTime: 0,
      organization_id: "toscana-beverages",
      code: "C001",
      name: "Bar du Port",
      type: "bar",
      email: null,
      phone: null,
      address: {
        street: "1 quai",
        postal_code: "06000",
        city: "Nice",
        country: "FR",
      },
      payment_terms_days: 30,
      payment_terms_label: "30 jours",
      search_tokens: ["bar"],
    } as unknown as Doc<"clients">;
    expect(toClientSearchDto(doc)).toEqual({
      id: "client_001",
      code: "C001",
      name: "Bar du Port",
      city: "Nice",
    });
  });
});

describe("toProductSearchDto", () => {
  test("maps product doc to compact DTO with price and stock", () => {
    const doc = {
      _id: "prod_001",
      _creationTime: 0,
      organization_id: "toscana-beverages",
      code: "CAF-001",
      name: "Café Toscano Classico 1kg",
      description: "",
      category: "cafe",
      price_ht: 24.5,
      vat_rate: 20,
      stock_qty: 12,
      stock_threshold: null,
      is_active: true,
      search_tokens: ["cafe", "toscano"],
    } as unknown as Doc<"products">;
    expect(toProductSearchDto(doc)).toEqual({
      id: "prod_001",
      code: "CAF-001",
      name: "Café Toscano Classico 1kg",
      price_ht: 24.5,
      vat_rate: 20,
      stock_qty: 12,
    });
  });
});
