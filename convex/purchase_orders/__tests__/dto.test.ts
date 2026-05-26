import { describe, expect, test } from "vitest";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { toPurchaseOrderListItemDto } from "../dto/purchaseOrderListItem";
import { toPurchaseOrderDetailDto } from "../dto/purchaseOrderDetail";

const supplierId = (n: number) => `sup_${n}` as unknown as Id<"suppliers">;
const productId = (n: number) => `prod_${n}` as unknown as Id<"products">;

const makeDoc = (
  overrides: Partial<Doc<"purchase_orders">> = {},
): Doc<"purchase_orders"> => ({
  _id: "po_1" as unknown as Id<"purchase_orders">,
  _creationTime: 1747500000000,
  organization_id: "toscana-beverages-demo",
  supplier_id: supplierId(1),
  number: "BC26-0042",
  status: "draft",
  lines: [
    {
      product_id: productId(1),
      product_code: "CAF-001",
      product_name: "Café Toscano 1kg",
      quantity_ordered: 10,
      quantity_received: 0,
      unit_purchase_price_ht: 8,
      vat_rate: 20,
    },
  ],
  total_ht: 80,
  total_ttc: 96,
  received_at: null,
  created_by: "operator@toscana.local",
  ...overrides,
});

describe("toPurchaseOrderListItemDto", () => {
  test("flattens doc + supplier code/name into list item shape", () => {
    const dto = toPurchaseOrderListItemDto(makeDoc(), {
      code: "FRN-001",
      name: "Toscano Italia Distribuzione",
    });
    expect(dto).toMatchObject({
      number: "BC26-0042",
      supplierCode: "FRN-001",
      supplierName: "Toscano Italia Distribuzione",
      total_ht: 80,
      total_ttc: 96,
      status: "draft",
      receivedAt: null,
      createdAt: 1747500000000,
    });
  });

  test("exposes received_at when set", () => {
    const dto = toPurchaseOrderListItemDto(
      makeDoc({ status: "received", received_at: 1747500999000 }),
      { code: "FRN-001", name: "Toscano" },
    );
    expect(dto.status).toBe("received");
    expect(dto.receivedAt).toBe(1747500999000);
  });
});

describe("toPurchaseOrderDetailDto", () => {
  test("returns full detail shape with supplier embedded + lines mapped", () => {
    const dto = toPurchaseOrderDetailDto(makeDoc(), {
      _id: supplierId(1),
      code: "FRN-001",
      name: "Toscano Italia Distribuzione",
      email: "commandes@toscano.fr",
      phone: null,
    });
    expect(dto.id).toBeDefined();
    expect(dto.number).toBe("BC26-0042");
    expect(dto.status).toBe("draft");
    expect(dto.supplier).toEqual({
      id: supplierId(1),
      code: "FRN-001",
      name: "Toscano Italia Distribuzione",
      email: "commandes@toscano.fr",
      phone: null,
    });
    expect(dto.lines).toHaveLength(1);
    expect(dto.lines[0]?.product_code).toBe("CAF-001");
    expect(dto.lines[0]?.quantity_ordered).toBe(10);
    expect(dto.lines[0]?.quantity_received).toBe(0);
    expect(dto.lines[0]?.unit_purchase_price_ht).toBe(8);
    expect(dto.total_ht).toBe(80);
    expect(dto.total_ttc).toBe(96);
  });
});
