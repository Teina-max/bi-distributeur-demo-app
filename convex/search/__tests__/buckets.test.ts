import { describe, expect, test } from "vitest";
import { buildBucketsResponse } from "../buckets";
import type { Doc } from "@convex/_generated/dataModel";

const makeClient = (id: string, name: string): Doc<"clients"> =>
  ({
    _id: id,
    _creationTime: 0,
    organization_id: "toscana-beverages",
    code: `C${id}`,
    name,
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
    payment_terms_label: "30j",
    search_tokens: [],
  }) as unknown as Doc<"clients">;

const makeProduct = (id: string, name: string): Doc<"products"> =>
  ({
    _id: id,
    _creationTime: 0,
    organization_id: "toscana-beverages",
    code: `P${id}`,
    name,
    description: "",
    category: "cafe",
    price_ht: 10,
    vat_rate: 20,
    stock_qty: 1,
    stock_threshold: null,
    is_active: true,
    search_tokens: [],
  }) as unknown as Doc<"products">;

describe("buildBucketsResponse", () => {
  test("global scope returns both buckets mapped to DTOs", () => {
    const result = buildBucketsResponse({
      scope: "global",
      clientsRaw: [makeClient("1", "Bar Du Port")],
      productsRaw: [makeProduct("1", "Café Toscano Classico")],
    });
    expect(result.clients).toHaveLength(1);
    expect(result.products).toHaveLength(1);
    expect(result.clients[0]?.name).toBe("Bar Du Port");
    expect(result.products[0]?.name).toBe("Café Toscano Classico");
  });

  test("clients scope returns empty products bucket", () => {
    const result = buildBucketsResponse({
      scope: "clients",
      clientsRaw: [makeClient("1", "Bar")],
      productsRaw: [makeProduct("1", "Café")],
    });
    expect(result.clients).toHaveLength(1);
    expect(result.products).toEqual([]);
  });

  test("products scope returns empty clients bucket", () => {
    const result = buildBucketsResponse({
      scope: "products",
      clientsRaw: [makeClient("1", "Bar")],
      productsRaw: [makeProduct("1", "Café")],
    });
    expect(result.clients).toEqual([]);
    expect(result.products).toHaveLength(1);
  });

  test("preserves order from raw arrays", () => {
    const result = buildBucketsResponse({
      scope: "global",
      clientsRaw: [
        makeClient("a", "A"),
        makeClient("b", "B"),
        makeClient("c", "C"),
      ],
      productsRaw: [],
    });
    expect(result.clients.map((c) => c.name)).toEqual(["A", "B", "C"]);
  });
});
