/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { MutationCtx } from "@convex/_generated/server";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { createPurchaseOrderHandler } from "../mutations";

const ORG = "toscana-beverages-demo";
const SUPPLIER_ID = "sup_001" as unknown as Id<"suppliers">;

type WriteOp =
  | { op: "insert"; table: "purchase_orders"; data: unknown }
  | { op: "runMutation"; name: string };

function supplierFixture(
  overrides: Partial<Doc<"suppliers">> = {},
): Doc<"suppliers"> {
  return {
    _id: SUPPLIER_ID,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    code: "FRN-001",
    name: "Toscano Italia Distribuzione",
    email: "commandes@toscano.fr",
    phone: null,
    search_tokens: ["frn-001", "toscano", "france"],
    ...overrides,
  };
}

function productFixture(
  id: string,
  code: string,
  overrides: Partial<Doc<"products">> = {},
): Doc<"products"> {
  return {
    _id: id as unknown as Id<"products">,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    code,
    name: `${code} fixture`,
    description: "",
    category: "test",
    price_ht: 10,
    vat_rate: 20,
    stock_qty: 0,
    stock_threshold: null,
    is_active: true,
    search_tokens: [],
    ...overrides,
  };
}

function makeFixtureDb({
  supplier,
  products = [
    productFixture("prod_1", "CAF-001"),
    productFixture("prod_2", "ACC-001"),
  ],
  insertedId = "po_inserted_001" as unknown as Id<"purchase_orders">,
}: {
  supplier: Doc<"suppliers"> | null;
  products?: readonly Doc<"products">[];
  insertedId?: Id<"purchase_orders">;
}) {
  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const writes: WriteOp[] = [];
  const ctx = {
    db: {
      get: vi.fn(async (id: unknown) => {
        if (String(id) === String(SUPPLIER_ID)) return supplier;
        const p = productMap.get(String(id));
        if (p) return p;
        return null;
      }),
      patch: vi.fn(),
      insert: vi.fn(async (table: unknown, data: unknown) => {
        if (table === "purchase_orders") {
          writes.push({ op: "insert", table: "purchase_orders", data });
          return insertedId;
        }
        throw new Error(`unexpected insert into ${String(table)}`);
      }),
      query: vi.fn(),
      delete: vi.fn(),
      replace: vi.fn(),
      system: {} as never,
      normalizeId: vi.fn(),
    },
    runMutation: vi.fn(async () => {
      writes.push({ op: "runMutation", name: "allocateNumber" });
      return "BC26-0001";
    }),
    runQuery: vi.fn(),
    runAction: vi.fn(),
    scheduler: { runAfter: vi.fn(), runAt: vi.fn(), cancel: vi.fn() },
    auth: {} as never,
    storage: {} as never,
    orgAuth: {
      session: { user: { email: "operator@toscana.local", id: "u1" } },
    },
  } as unknown as MutationCtx & {
    orgAuth: { session: { user: { email: string; id: string } } };
  };
  return { ctx, writes };
}

const linePayload = (
  overrides: Partial<{
    product_id: Id<"products">;
    product_code: string;
    product_name: string;
    quantity_ordered: number;
    unit_purchase_price_ht: number;
    vat_rate: number;
  }> = {},
) => ({
  product_id: "prod_1" as unknown as Id<"products">,
  product_code: "CAF-001",
  product_name: "Café Toscano 1kg",
  quantity_ordered: 10,
  unit_purchase_price_ht: 8,
  vat_rate: 20,
  ...overrides,
});

describe("createPurchaseOrderHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  test("happy path: 2 lines → allocates BC26-0001, inserts status=draft with snapshots + totals", async () => {
    const { ctx, writes } = makeFixtureDb({ supplier: supplierFixture() });
    const id = await createPurchaseOrderHandler(ctx, {
      organizationId: ORG,
      supplier_id: SUPPLIER_ID,
      lines: [
        linePayload({ quantity_ordered: 10, unit_purchase_price_ht: 8 }),
        linePayload({
          product_id: "prod_2" as unknown as Id<"products">,
          product_code: "ACC-001",
          product_name: "Filtre Permanent",
          quantity_ordered: 5,
          unit_purchase_price_ht: 12,
        }),
      ],
    });
    expect(String(id)).toBe("po_inserted_001");

    const allocateCalls = writes.filter((w) => w.op === "runMutation");
    expect(allocateCalls).toHaveLength(1);

    const insertCalls = writes.filter((w) => w.op === "insert");
    expect(insertCalls).toHaveLength(1);
    const data = (insertCalls[0] as { data: Doc<"purchase_orders"> }).data;
    expect(data.number).toBe("BC26-0001");
    expect(data.organization_id).toBe(ORG);
    expect(data.supplier_id).toBe(SUPPLIER_ID);
    expect(data.status).toBe("draft");
    expect(data.received_at).toBeNull();
    expect(data.lines).toHaveLength(2);
    expect(data.lines[0]!.product_code).toBe("CAF-001");
    expect(data.lines[0]!.quantity_ordered).toBe(10);
    expect(data.lines[0]!.quantity_received).toBe(0);
    expect(data.lines[0]!.unit_purchase_price_ht).toBe(8);
    expect(data.lines[1]!.product_code).toBe("ACC-001");
    // totals: 10*8 + 5*12 = 80 + 60 = 140 HT @ 20 → vat 28 → ttc 168
    expect(data.total_ht).toBe(140);
    expect(data.total_ttc).toBe(168);
    expect(data.created_by).toBe("operator@toscana.local");
  });

  test("empty lines → throws, no allocation, no insert", async () => {
    const { ctx, writes } = makeFixtureDb({ supplier: supplierFixture() });
    await expect(
      createPurchaseOrderHandler(ctx, {
        organizationId: ORG,
        supplier_id: SUPPLIER_ID,
        lines: [],
      }),
    ).rejects.toThrow(/au moins une ligne/i);
    expect(writes).toEqual([]);
  });

  test("supplier from another org → throws 'Fournisseur introuvable'", async () => {
    const { ctx, writes } = makeFixtureDb({
      supplier: supplierFixture({ organization_id: "other-org" }),
    });
    await expect(
      createPurchaseOrderHandler(ctx, {
        organizationId: ORG,
        supplier_id: SUPPLIER_ID,
        lines: [linePayload()],
      }),
    ).rejects.toThrow(/Fournisseur introuvable/);
    expect(writes).toEqual([]);
  });

  test("non-existent supplier → throws", async () => {
    const { ctx, writes } = makeFixtureDb({ supplier: null });
    await expect(
      createPurchaseOrderHandler(ctx, {
        organizationId: ORG,
        supplier_id: SUPPLIER_ID,
        lines: [linePayload()],
      }),
    ).rejects.toThrow(/Fournisseur introuvable/);
    expect(writes).toEqual([]);
  });
});
