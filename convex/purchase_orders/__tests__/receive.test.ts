/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { MutationCtx } from "@convex/_generated/server";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { receivePurchaseOrderHandler } from "../mutations";

const ORG = "toscana-beverages-demo";
const PO_ID = "po_fixture_001" as unknown as Id<"purchase_orders">;
const SUPPLIER_ID = "sup_001" as unknown as Id<"suppliers">;

type WriteOp =
  | {
      op: "patch";
      table: "purchase_orders" | "products";
      id: string;
      data: unknown;
    }
  | { op: "insert"; table: "stock_movements"; data: unknown };

function productFixture(
  code: string,
  stockQty: number,
  overrides: Partial<Doc<"products">> = {},
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
    ...overrides,
  };
}

function poFixture(
  lines: readonly {
    product_id: Id<"products">;
    product_code: string;
    quantity_ordered: number;
    quantity_received: number;
    unit_purchase_price_ht?: number;
    vat_rate?: number;
  }[],
  overrides: Partial<Doc<"purchase_orders">> = {},
): Doc<"purchase_orders"> {
  const fullLines = lines.map((l) => ({
    product_id: l.product_id,
    product_code: l.product_code,
    product_name: `${l.product_code} name`,
    quantity_ordered: l.quantity_ordered,
    quantity_received: l.quantity_received,
    unit_purchase_price_ht: l.unit_purchase_price_ht ?? 8,
    vat_rate: l.vat_rate ?? 20,
  }));
  return {
    _id: PO_ID,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    supplier_id: SUPPLIER_ID,
    number: "BC26-0001",
    status: "draft",
    lines: fullLines,
    total_ht: 0,
    total_ttc: 0,
    received_at: null,
    created_by: "operator@toscana.local",
    ...overrides,
  };
}

function makeFixtureDb({
  po,
  products,
}: {
  po: Doc<"purchase_orders">;
  products: readonly Doc<"products">[];
}) {
  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const writes: WriteOp[] = [];

  const ctx = {
    db: {
      get: vi.fn(async (id: unknown) => {
        if (String(id) === String(po._id)) return po;
        const p = productMap.get(String(id));
        if (p) return p;
        return null;
      }),
      patch: vi.fn(async (id: unknown, data: unknown) => {
        const table = productMap.has(String(id))
          ? "products"
          : "purchase_orders";
        writes.push({ op: "patch", table, id: String(id), data });
      }),
      insert: vi.fn(async (table: unknown, data: unknown) => {
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
    runMutation: vi.fn(),
    runQuery: vi.fn(),
    runAction: vi.fn(),
    scheduler: { runAfter: vi.fn(), runAt: vi.fn(), cancel: vi.fn() },
    auth: {} as never,
    storage: {} as never,
  } as unknown as MutationCtx;

  return { ctx, writes };
}

describe("receivePurchaseOrderHandler — atomicity & status transitions", () => {
  beforeEach(() => vi.clearAllMocks());

  test("happy path: réception totale 2 lignes (deltas 10/5) → stocks incrémentés, 2 stock_movements, statut received, received_at set", async () => {
    const products = [
      productFixture("CAF-001", 100),
      productFixture("ACC-001", 50),
    ];
    const po = poFixture([
      {
        product_id: products[0]!._id,
        product_code: "CAF-001",
        quantity_ordered: 10,
        quantity_received: 0,
      },
      {
        product_id: products[1]!._id,
        product_code: "ACC-001",
        quantity_ordered: 5,
        quantity_received: 0,
      },
    ]);
    const { ctx, writes } = makeFixtureDb({ po, products });

    const result = await receivePurchaseOrderHandler(ctx, {
      organizationId: ORG,
      id: po._id,
      receipts: [
        { product_id: products[0]!._id, delta: 10 },
        { product_id: products[1]!._id, delta: 5 },
      ],
    });

    expect(result.status).toBe("received");

    // BC patched: lines updated, status=received, received_at set (truthy number)
    const poPatches = writes.filter(
      (w) => w.op === "patch" && w.table === "purchase_orders",
    );
    expect(poPatches).toHaveLength(1);
    const poPatchData = (poPatches[0] as { data: Doc<"purchase_orders"> }).data;
    expect(poPatchData.status).toBe("received");
    expect(typeof poPatchData.received_at).toBe("number");
    expect(poPatchData.lines![0]!.quantity_received).toBe(10);
    expect(poPatchData.lines![1]!.quantity_received).toBe(5);

    // Product stocks: 100+10=110, 50+5=55
    const productPatches = writes.filter(
      (w) => w.op === "patch" && w.table === "products",
    );
    expect(productPatches).toHaveLength(2);
    expect(
      (productPatches[0] as { data: { stock_qty: number } }).data.stock_qty,
    ).toBe(110);
    expect(
      (productPatches[1] as { data: { stock_qty: number } }).data.stock_qty,
    ).toBe(55);

    // Stock movements: 2 inserts with reason=purchase_order_in
    const movements = writes.filter(
      (w) => w.op === "insert",
    );
    expect(movements).toHaveLength(2);
    const m0 = (movements[0] as { data: Doc<"stock_movements"> }).data;
    expect(m0.delta).toBe(10);
    expect(m0.reason).toBe("purchase_order_in");
    expect(m0.reference_kind).toBe("purchase_order");
    expect(String(m0.reference_id)).toBe(String(po._id));
    expect(m0.organization_id).toBe(ORG);
    expect((movements[1] as { data: Doc<"stock_movements"> }).data.delta).toBe(
      5,
    );
  });

  test("réception partielle ligne 1 seulement (delta 7/0) → stock ligne 1 +7, 1 stock_movement, statut partially_received, received_at=null", async () => {
    const products = [
      productFixture("CAF-001", 100),
      productFixture("ACC-001", 50),
    ];
    const po = poFixture([
      {
        product_id: products[0]!._id,
        product_code: "CAF-001",
        quantity_ordered: 10,
        quantity_received: 0,
      },
      {
        product_id: products[1]!._id,
        product_code: "ACC-001",
        quantity_ordered: 5,
        quantity_received: 0,
      },
    ]);
    const { ctx, writes } = makeFixtureDb({ po, products });

    const result = await receivePurchaseOrderHandler(ctx, {
      organizationId: ORG,
      id: po._id,
      receipts: [{ product_id: products[0]!._id, delta: 7 }],
    });

    expect(result.status).toBe("partially_received");

    const poPatch = writes.find(
      (w) => w.op === "patch" && w.table === "purchase_orders",
    ) as { data: Doc<"purchase_orders"> };
    expect(poPatch.data.status).toBe("partially_received");
    expect(poPatch.data.received_at).toBeNull();
    expect(poPatch.data.lines![0]!.quantity_received).toBe(7);
    expect(poPatch.data.lines![1]!.quantity_received).toBe(0);

    const productPatches = writes.filter(
      (w) => w.op === "patch" && w.table === "products",
    );
    expect(productPatches).toHaveLength(1);
    expect(
      (productPatches[0] as { data: { stock_qty: number } }).data.stock_qty,
    ).toBe(107);

    const movements = writes.filter(
      (w) => w.op === "insert",
    );
    expect(movements).toHaveLength(1);
  });

  test("re-receive after partial: starting from qty_received=7/0, deltas 3/5 → stocks complets, 2 movements, statut received", async () => {
    const products = [
      productFixture("CAF-001", 107), // already +7 from prior receipt
      productFixture("ACC-001", 50),
    ];
    const po = poFixture(
      [
        {
          product_id: products[0]!._id,
          product_code: "CAF-001",
          quantity_ordered: 10,
          quantity_received: 7,
        },
        {
          product_id: products[1]!._id,
          product_code: "ACC-001",
          quantity_ordered: 5,
          quantity_received: 0,
        },
      ],
      { status: "partially_received" },
    );
    const { ctx, writes } = makeFixtureDb({ po, products });

    const result = await receivePurchaseOrderHandler(ctx, {
      organizationId: ORG,
      id: po._id,
      receipts: [
        { product_id: products[0]!._id, delta: 3 },
        { product_id: products[1]!._id, delta: 5 },
      ],
    });

    expect(result.status).toBe("received");
    const poPatch = writes.find(
      (w) => w.op === "patch" && w.table === "purchase_orders",
    ) as { data: Doc<"purchase_orders"> };
    expect(poPatch.data.lines![0]!.quantity_received).toBe(10);
    expect(poPatch.data.lines![1]!.quantity_received).toBe(5);
    expect(typeof poPatch.data.received_at).toBe("number");

    expect(
      writes.filter((w) => w.op === "insert"),
    ).toHaveLength(2);
    expect(
      writes.filter((w) => w.op === "patch" && w.table === "products"),
    ).toHaveLength(2);
  });

  test("CRITICAL: overflow ligne 2 (delta 5/9999) → throws BEFORE any write (atomic rollback proof)", async () => {
    const products = [
      productFixture("CAF-001", 100),
      productFixture("ACC-001", 50),
    ];
    const po = poFixture([
      {
        product_id: products[0]!._id,
        product_code: "CAF-001",
        quantity_ordered: 10,
        quantity_received: 0,
      },
      {
        product_id: products[1]!._id,
        product_code: "ACC-001",
        quantity_ordered: 5,
        quantity_received: 0,
      },
    ]);
    const { ctx, writes } = makeFixtureDb({ po, products });

    await expect(
      receivePurchaseOrderHandler(ctx, {
        organizationId: ORG,
        id: po._id,
        receipts: [
          { product_id: products[0]!._id, delta: 5 },
          { product_id: products[1]!._id, delta: 9999 },
        ],
      }),
    ).rejects.toThrow(/Réception ligne ACC-001 excède commandé/);

    // ATOMICITY GUARANTEE: zero writes anywhere
    expect(writes).toEqual([]);
    expect(ctx.db.patch).not.toHaveBeenCalled();
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });

  test("BC déjà reçu → throws 'BC déjà reçu', no read of products, no write", async () => {
    const products = [productFixture("CAF-001", 100)];
    const po = poFixture(
      [
        {
          product_id: products[0]!._id,
          product_code: "CAF-001",
          quantity_ordered: 10,
          quantity_received: 10,
        },
      ],
      { status: "received" },
    );
    const { ctx, writes } = makeFixtureDb({ po, products });

    await expect(
      receivePurchaseOrderHandler(ctx, {
        organizationId: ORG,
        id: po._id,
        receipts: [{ product_id: products[0]!._id, delta: 1 }],
      }),
    ).rejects.toThrow("BC déjà reçu");

    expect(writes).toEqual([]);
    // Only the BC was read; products MUST NOT have been queried.
    expect(ctx.db.get).toHaveBeenCalledTimes(1);
    expect(ctx.db.get).toHaveBeenCalledWith(po._id);
  });

  test("status cancelled → throws", async () => {
    const products = [productFixture("CAF-001", 100)];
    const po = poFixture(
      [
        {
          product_id: products[0]!._id,
          product_code: "CAF-001",
          quantity_ordered: 10,
          quantity_received: 0,
        },
      ],
      { status: "cancelled" },
    );
    const { ctx, writes } = makeFixtureDb({ po, products });

    await expect(
      receivePurchaseOrderHandler(ctx, {
        organizationId: ORG,
        id: po._id,
        receipts: [{ product_id: products[0]!._id, delta: 1 }],
      }),
    ).rejects.toThrow(/BC annulé/);
    expect(writes).toEqual([]);
  });

  test("cross-org isolation: BC org A, called with org B → throws 'BC introuvable'", async () => {
    const products = [productFixture("CAF-001", 100)];
    const po = poFixture(
      [
        {
          product_id: products[0]!._id,
          product_code: "CAF-001",
          quantity_ordered: 10,
          quantity_received: 0,
        },
      ],
      { organization_id: "other-org" },
    );
    const { ctx, writes } = makeFixtureDb({ po, products });

    await expect(
      receivePurchaseOrderHandler(ctx, {
        organizationId: ORG,
        id: po._id,
        receipts: [{ product_id: products[0]!._id, delta: 1 }],
      }),
    ).rejects.toThrow("BC introuvable");
    expect(writes).toEqual([]);
  });

  test("delta 0 entries are ignored (no movement, no patch)", async () => {
    const products = [
      productFixture("CAF-001", 100),
      productFixture("ACC-001", 50),
    ];
    const po = poFixture([
      {
        product_id: products[0]!._id,
        product_code: "CAF-001",
        quantity_ordered: 10,
        quantity_received: 0,
      },
      {
        product_id: products[1]!._id,
        product_code: "ACC-001",
        quantity_ordered: 5,
        quantity_received: 0,
      },
    ]);
    const { ctx, writes } = makeFixtureDb({ po, products });

    await receivePurchaseOrderHandler(ctx, {
      organizationId: ORG,
      id: po._id,
      receipts: [
        { product_id: products[0]!._id, delta: 10 },
        { product_id: products[1]!._id, delta: 0 },
      ],
    });

    // Only one stock_movement (for line 1)
    expect(
      writes.filter((w) => w.op === "insert"),
    ).toHaveLength(1);
    // Only line 1 product patched
    expect(
      writes.filter((w) => w.op === "patch" && w.table === "products"),
    ).toHaveLength(1);
  });

  test("delta négatif → throws", async () => {
    const products = [productFixture("CAF-001", 100)];
    const po = poFixture([
      {
        product_id: products[0]!._id,
        product_code: "CAF-001",
        quantity_ordered: 10,
        quantity_received: 0,
      },
    ]);
    const { ctx, writes } = makeFixtureDb({ po, products });

    await expect(
      receivePurchaseOrderHandler(ctx, {
        organizationId: ORG,
        id: po._id,
        receipts: [{ product_id: products[0]!._id, delta: -1 }],
      }),
    ).rejects.toThrow(/Delta négatif/);
    expect(writes).toEqual([]);
  });
});
