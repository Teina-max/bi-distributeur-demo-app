/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { MutationCtx } from "@convex/_generated/server";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { createDirectHandler } from "../mutations";

const ORG = "toscana-beverages-demo";
const CLIENT_ID = "c_fixture_001" as unknown as Id<"clients">;
const CREATED_BY = "operator@toscana.local";

type WriteOp =
  | {
      op: "patch";
      table: "products" | "quotations";
      id: string;
      data: unknown;
    }
  | { op: "insert"; table: "delivery_forms" | "stock_movements"; data: unknown }
  | { op: "runMutation"; name: string };

function makeFixtureDb({
  client,
  products,
}: {
  client: Doc<"clients"> | null;
  products: readonly Doc<"products">[];
}) {
  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const writes: WriteOp[] = [];
  const insertedDeliveryFormId =
    "df_inserted_001" as unknown as Id<"delivery_forms">;

  const ctx = {
    db: {
      get: vi.fn(async (id: unknown) => {
        if (client && String(id) === String(client._id)) return client;
        const p = productMap.get(String(id));
        if (p) return p;
        return null;
      }),
      patch: vi.fn(async (id: unknown, data: unknown) => {
        const table = productMap.has(String(id)) ? "products" : "quotations";
        writes.push({ op: "patch", table, id: String(id), data });
      }),
      insert: vi.fn(async (table: unknown, data: unknown) => {
        if (table === "delivery_forms") {
          writes.push({ op: "insert", table: "delivery_forms", data });
          return insertedDeliveryFormId;
        }
        if (table === "stock_movements") {
          writes.push({ op: "insert", table: "stock_movements", data });
          return "sm_x" as unknown as Id<"stock_movements">;
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
      return "B26-0042";
    }),
    runQuery: vi.fn(),
    runAction: vi.fn(),
    scheduler: { runAfter: vi.fn(), runAt: vi.fn(), cancel: vi.fn() },
    auth: {} as never,
    storage: {} as never,
  } as unknown as MutationCtx;

  return { ctx, writes };
}

function clientFixture(override: Partial<Doc<"clients">> = {}): Doc<"clients"> {
  return {
    _id: CLIENT_ID,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    code: "BAR-DU-PORT",
    name: "Bar du Port",
    type: "B2B",
    email: null,
    phone: null,
    address: {
      street: "1 quai des Pêcheurs",
      postal_code: "06200",
      city: "Toulon",
      country: "FR",
    },
    payment_terms_days: 30,
    payment_terms_label: "30j fin de mois",
    search_tokens: [],
    ...override,
  };
}

function productFixture(
  code: string,
  stockQty: number,
  override: Partial<Doc<"products">> = {},
): Doc<"products"> {
  return {
    _id: `p_${code}` as unknown as Id<"products">,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    code,
    name: `${code} name`,
    description: "",
    category: "test",
    price_ht: 10,
    vat_rate: 20,
    stock_qty: stockQty,
    stock_threshold: null,
    is_active: true,
    search_tokens: [],
    ...override,
  };
}

describe("createDirectHandler — atomicity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("happy path 2 lines → BL in_preparation, NO stock movement, NO product patch, NO quotation patch", async () => {
    const client = clientFixture();
    const products = [
      productFixture("CAF-001", 100),
      productFixture("ACC-FILT-01", 50),
    ];
    const { ctx, writes } = makeFixtureDb({ client, products });

    const result = await createDirectHandler(ctx, {
      organizationId: ORG,
      client_id: client._id,
      lines: [
        { product_id: products[0]!._id, quantity: 5 },
        { product_id: products[1]!._id, quantity: 2 },
      ],
      created_by: CREATED_BY,
    });

    expect(result.number).toBe("B26-0042");

    const insertsBL = writes.filter(
      (w) => w.op === "insert" && w.table === "delivery_forms",
    );
    expect(insertsBL).toHaveLength(1);
    const blData = (insertsBL[0] as { data: Doc<"delivery_forms"> }).data;
    expect(blData.status).toBe("in_preparation");
    expect(blData.quotation_id).toBeNull();
    expect(blData.client_id).toBe(client._id);
    expect(blData.organization_id).toBe(ORG);
    expect(blData.created_by).toBe(CREATED_BY);
    expect(blData.delivered_at).toBeNull();
    expect(blData.lines).toHaveLength(2);
    expect(blData.lines[0]!.product_code).toBe("CAF-001");
    expect(blData.lines[0]!.quantity).toBe(5);
    expect(blData.lines[0]!.unit_price_ht).toBe(10);
    expect(blData.lines[0]!.line_total_ht).toBe(50);
    expect(blData.lines[1]!.product_code).toBe("ACC-FILT-01");
    expect(blData.lines[1]!.quantity).toBe(2);
    expect(blData.total_ht).toBe(70);
    expect(blData.total_ttc).toBeCloseTo(84, 2);

    // Stock is NOT touched at creation — it leaves inventory at shipped.
    const stockMovements = writes.filter(
      (w) => w.op === "insert" && w.table === "stock_movements",
    );
    expect(stockMovements).toHaveLength(0);

    const productPatches = writes.filter(
      (w) => w.op === "patch" && w.table === "products",
    );
    expect(productPatches).toHaveLength(0);

    // CRITICAL: no quotation table write
    const quotationPatches = writes.filter(
      (w) => w.op === "patch" && w.table === "quotations",
    );
    expect(quotationPatches).toHaveLength(0);
  });

  test("happy path 1 line → BL in_preparation, NO stock_movement", async () => {
    const client = clientFixture();
    const products = [productFixture("CAF-001-1KG", 30)];
    const { ctx, writes } = makeFixtureDb({ client, products });

    const result = await createDirectHandler(ctx, {
      organizationId: ORG,
      client_id: client._id,
      lines: [{ product_id: products[0]!._id, quantity: 3 }],
      created_by: CREATED_BY,
    });

    expect(result.number).toBe("B26-0042");
    const insertsBL = writes.filter(
      (w) => w.op === "insert" && w.table === "delivery_forms",
    );
    expect(insertsBL).toHaveLength(1);
    const blData = (insertsBL[0] as { data: Doc<"delivery_forms"> }).data;
    expect(blData.status).toBe("in_preparation");
    expect(blData.delivered_at).toBeNull();
    expect(blData.lines).toHaveLength(1);
    expect(blData.lines[0]!.quantity).toBe(3);
    expect(blData.lines[0]!.line_total_ht).toBe(30);
    expect(blData.quotation_id).toBeNull();

    const stockMovements = writes.filter(
      (w) => w.op === "insert" && w.table === "stock_movements",
    );
    expect(stockMovements).toHaveLength(0);
  });

  test("creation does NOT check stock — under-stocked lines accepted (validated at shipped transition)", async () => {
    const client = clientFixture();
    const products = [productFixture("CAF-001", 2)];
    const { ctx, writes } = makeFixtureDb({ client, products });

    const result = await createDirectHandler(ctx, {
      organizationId: ORG,
      client_id: client._id,
      lines: [{ product_id: products[0]!._id, quantity: 5 }],
      created_by: CREATED_BY,
    });

    expect(result.number).toBe("B26-0042");
    const insertsBL = writes.filter(
      (w) => w.op === "insert" && w.table === "delivery_forms",
    );
    expect(insertsBL).toHaveLength(1);
    const blData = (insertsBL[0] as { data: Doc<"delivery_forms"> }).data;
    expect(blData.status).toBe("in_preparation");
    expect(blData.lines[0]!.quantity).toBe(5);
  });

  test("0 lines → throws 'Au moins une ligne requise', ZERO write", async () => {
    const client = clientFixture();
    const { ctx, writes } = makeFixtureDb({ client, products: [] });

    await expect(
      createDirectHandler(ctx, {
        organizationId: ORG,
        client_id: client._id,
        lines: [],
        created_by: CREATED_BY,
      }),
    ).rejects.toThrow("Au moins une ligne requise");

    expect(writes).toEqual([]);
    expect(ctx.db.patch).not.toHaveBeenCalled();
    expect(ctx.db.insert).not.toHaveBeenCalled();
    expect(ctx.runMutation).not.toHaveBeenCalled();
  });

  test("cross-org isolation: client belongs to org B, called with org A → throws 'Client introuvable'", async () => {
    const client = clientFixture({ organization_id: "other-org" });
    const products = [productFixture("CAF-001", 100)];
    const { ctx, writes } = makeFixtureDb({ client, products });

    await expect(
      createDirectHandler(ctx, {
        organizationId: ORG,
        client_id: client._id,
        lines: [{ product_id: products[0]!._id, quantity: 5 }],
        created_by: CREATED_BY,
      }),
    ).rejects.toThrow("Client introuvable");

    expect(writes).toEqual([]);
  });

  test("cross-org isolation: product belongs to org B → throws 'Produit introuvable pour la ligne ...'", async () => {
    const client = clientFixture();
    const products = [
      productFixture("CAF-001", 100, { organization_id: "other-org" }),
    ];
    const { ctx, writes } = makeFixtureDb({ client, products });

    await expect(
      createDirectHandler(ctx, {
        organizationId: ORG,
        client_id: client._id,
        lines: [{ product_id: products[0]!._id, quantity: 5 }],
        created_by: CREATED_BY,
      }),
    ).rejects.toThrow(/Produit introuvable/);

    expect(writes).toEqual([]);
  });

  test("snapshots: unit_price_ht / vat_rate / product_name are taken from the product fetched at create-time", async () => {
    const client = clientFixture();
    const products = [
      productFixture("CAF-001", 100, {
        price_ht: 24.5,
        vat_rate: 5.5,
        name: "Café Toscano Classico 1kg (catalogue)",
      }),
    ];
    const { ctx, writes } = makeFixtureDb({ client, products });

    await createDirectHandler(ctx, {
      organizationId: ORG,
      client_id: client._id,
      lines: [{ product_id: products[0]!._id, quantity: 2 }],
      created_by: CREATED_BY,
    });

    const blInsert = writes.find(
      (w) => w.op === "insert" && w.table === "delivery_forms",
    ) as { data: Doc<"delivery_forms"> };
    expect(blInsert.data.lines[0]!.unit_price_ht).toBe(24.5);
    expect(blInsert.data.lines[0]!.vat_rate).toBe(5.5);
    expect(blInsert.data.lines[0]!.product_name).toBe(
      "Café Toscano Classico 1kg (catalogue)",
    );
    expect(blInsert.data.lines[0]!.product_code).toBe("CAF-001");
    expect(blInsert.data.lines[0]!.line_total_ht).toBe(49);
  });

  test("vat_rate_override honoured per line in snapshot", async () => {
    const client = clientFixture();
    const products = [productFixture("CAF-001", 100, { vat_rate: 20 })];
    const { ctx, writes } = makeFixtureDb({ client, products });

    await createDirectHandler(ctx, {
      organizationId: ORG,
      client_id: client._id,
      lines: [
        { product_id: products[0]!._id, quantity: 1, vat_rate_override: 5.5 },
      ],
      created_by: CREATED_BY,
    });

    const blInsert = writes.find(
      (w) => w.op === "insert" && w.table === "delivery_forms",
    ) as { data: Doc<"delivery_forms"> };
    expect(blInsert.data.lines[0]!.vat_rate).toBe(5.5);
    expect(blInsert.data.total_ttc).toBeCloseTo(10.55, 2);
  });
});
