import { describe, expect, test } from "vitest";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { toQuotationListItemDto } from "../dto/quotationListItem";
import { toQuotationDraftDto } from "../dto/quotationDraft";

const fakeId = (kind: string, n: number) =>
  `${kind}_${n}` as unknown as Id<"quotations">;

const fakeClientId = (n: number) => `cli_${n}` as unknown as Id<"clients">;

const makeDoc = (): Doc<"quotations"> => ({
  _id: fakeId("quot", 1),
  _creationTime: 1747500000000,
  organization_id: "org-test",
  client_id: fakeClientId(7),
  number: "D26-0042",
  status: "draft",
  lines: [
    {
      product_id: "prod_1" as unknown as Id<"products">,
      product_code: "CAF-001-1KG",
      product_name: "Café Toscano Classico 1kg",
      quantity: 5,
      unit_price_ht: 24.5,
      vat_rate: 20,
      line_total_ht: 122.5,
    },
  ],
  total_ht: 122.5,
  total_vat: 24.5,
  total_ttc: 147,
  created_by: "operator@toscana.local",
});

describe("toQuotationListItemDto", () => {
  test("flattens doc + client into list item shape", () => {
    const dto = toQuotationListItemDto(makeDoc(), {
      code: "C001234",
      name: "BISTROT DU PORT",
    });
    expect(dto).toMatchObject({
      number: "D26-0042",
      clientCode: "C001234",
      clientName: "BISTROT DU PORT",
      total_ht: 122.5,
      total_ttc: 147,
      status: "draft",
      createdAt: 1747500000000,
    });
  });
});

describe("toQuotationDraftDto", () => {
  test("returns full draft shape with client embedded", () => {
    const dto = toQuotationDraftDto(makeDoc(), {
      _id: fakeClientId(7),
      code: "C001234",
      name: "BISTROT DU PORT",
    });
    expect(dto.client).toEqual({
      id: fakeClientId(7),
      code: "C001234",
      name: "BISTROT DU PORT",
    });
    expect(dto.lines).toHaveLength(1);
    expect(dto.lines[0]?.product_code).toBe("CAF-001-1KG");
    expect(dto.total_ttc).toBe(147);
    expect(dto.status).toBe("draft");
  });
});
