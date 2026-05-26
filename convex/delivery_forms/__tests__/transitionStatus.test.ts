/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { MutationCtx } from "@convex/_generated/server";
import { assertValidTransition, transitionStatusHandler } from "../mutations";

const ORG = "toscana-beverages-demo";
const BL_ID = "df_transition_fixture" as unknown as Id<"delivery_forms">;

type WriteOp =
  | {
      op: "patch";
      table: "delivery_forms" | "products";
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

function blFixture(
  lines: readonly {
    product_id: Id<"products">;
    product_code: string;
    quantity: number;
  }[],
  overrides: Partial<Doc<"delivery_forms">> = {},
): Doc<"delivery_forms"> {
  return {
    _id: BL_ID,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    quotation_id: null,
    client_id: "c_fixture" as unknown as Id<"clients">,
    number: "B26-0001",
    status: "in_preparation",
    lines: lines.map((l) => ({
      product_id: l.product_id,
      product_code: l.product_code,
      product_name: `${l.product_code} name`,
      quantity: l.quantity,
      unit_price_ht: 10,
      vat_rate: 20,
      line_total_ht: l.quantity * 10,
    })),
    total_ht: 100,
    total_ttc: 120,
    delivered_at: null,
    created_by: "operator@toscana.local",
    ...overrides,
  };
}

function makeFixtureDb({
  deliveryForm,
  products,
}: {
  deliveryForm: Doc<"delivery_forms"> | null;
  products: readonly Doc<"products">[];
}) {
  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const writes: WriteOp[] = [];

  const ctx = {
    db: {
      get: vi.fn(async (id: unknown) => {
        if (deliveryForm && String(id) === String(deliveryForm._id)) {
          return deliveryForm;
        }
        return productMap.get(String(id)) ?? null;
      }),
      patch: vi.fn(async (id: unknown, data: unknown) => {
        writes.push({
          op: "patch",
          table: productMap.has(String(id)) ? "products" : "delivery_forms",
          id: String(id),
          data,
        });
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

describe("assertValidTransition — pure state machine", () => {
  test("in_preparation → ready_to_ship is allowed", () => {
    expect(() =>
      assertValidTransition("in_preparation", "ready_to_ship"),
    ).not.toThrow();
  });

  test("ready_to_ship → shipped is allowed", () => {
    expect(() =>
      assertValidTransition("ready_to_ship", "shipped"),
    ).not.toThrow();
  });

  test("shipped → delivered is allowed", () => {
    expect(() => assertValidTransition("shipped", "delivered")).not.toThrow();
  });

  test("in_preparation → shipped is forbidden (skipping ready_to_ship)", () => {
    expect(() => assertValidTransition("in_preparation", "shipped")).toThrow(
      /Transition impossible/,
    );
  });

  test("ready_to_ship → delivered is forbidden (skipping shipped)", () => {
    expect(() => assertValidTransition("ready_to_ship", "delivered")).toThrow(
      /Transition impossible/,
    );
  });

  test("delivered → shipped is forbidden (backward)", () => {
    expect(() => assertValidTransition("delivered", "shipped")).toThrow(
      /Transition impossible/,
    );
  });

  test("terminal statuses cannot transition", () => {
    expect(() => assertValidTransition("invoiced", "delivered")).toThrow(
      /Transition impossible/,
    );
    expect(() => assertValidTransition("cancelled", "ready_to_ship")).toThrow(
      /Transition impossible/,
    );
  });
});

describe("transitionStatusHandler — in_preparation → ready_to_ship", () => {
  beforeEach(() => vi.clearAllMocks());

  test("patches status only, NO stock movement, NO product patch", async () => {
    const products = [productFixture("CAF-001", 10)];
    const deliveryForm = blFixture(
      [{ product_id: products[0]!._id, product_code: "CAF-001", quantity: 3 }],
      { status: "in_preparation" },
    );
    const { ctx, writes } = makeFixtureDb({ deliveryForm, products });

    const result = await transitionStatusHandler(ctx, {
      organizationId: ORG,
      id: deliveryForm._id,
      target: "ready_to_ship",
    });

    expect(result.status).toBe("ready_to_ship");

    const blPatches = writes.filter(
      (w) => w.op === "patch" && w.table === "delivery_forms",
    );
    expect(blPatches).toHaveLength(1);
    expect((blPatches[0] as { data: { status: string } }).data.status).toBe(
      "ready_to_ship",
    );

    expect(writes.filter((w) => w.op === "insert")).toHaveLength(0);
    expect(
      writes.filter((w) => w.op === "patch" && w.table === "products"),
    ).toHaveLength(0);
  });
});

describe("transitionStatusHandler — ready_to_ship → shipped (stock leaves inventory)", () => {
  beforeEach(() => vi.clearAllMocks());

  test("happy path: decrements stock + inserts stock_movements + patches status", async () => {
    const products = [
      productFixture("CAF-001", 100),
      productFixture("ACC-001", 50),
    ];
    const deliveryForm = blFixture(
      [
        { product_id: products[0]!._id, product_code: "CAF-001", quantity: 5 },
        { product_id: products[1]!._id, product_code: "ACC-001", quantity: 2 },
      ],
      { status: "ready_to_ship" },
    );
    const { ctx, writes } = makeFixtureDb({ deliveryForm, products });

    const result = await transitionStatusHandler(ctx, {
      organizationId: ORG,
      id: deliveryForm._id,
      target: "shipped",
    });

    expect(result.status).toBe("shipped");

    const productPatches = writes.filter(
      (w) => w.op === "patch" && w.table === "products",
    );
    expect(productPatches).toHaveLength(2);
    expect(
      (productPatches[0] as { data: { stock_qty: number } }).data.stock_qty,
    ).toBe(95);
    expect(
      (productPatches[1] as { data: { stock_qty: number } }).data.stock_qty,
    ).toBe(48);

    const movements = writes.filter((w) => w.op === "insert");
    expect(movements).toHaveLength(2);
    const movement = (movements[0] as { data: Doc<"stock_movements"> }).data;
    expect(movement.delta).toBe(-5);
    expect(movement.reason).toBe("delivery_form_out");
    expect(movement.reference_kind).toBe("delivery_form");
    expect(movement.reference_id).toBe(deliveryForm._id);

    const blPatches = writes.filter(
      (w) => w.op === "patch" && w.table === "delivery_forms",
    );
    expect(blPatches).toHaveLength(1);
    expect((blPatches[0] as { data: { status: string } }).data.status).toBe(
      "shipped",
    );
  });

  test("CRITICAL: stock insufficient on line 2 → throws BEFORE any write (atomic rollback)", async () => {
    const products = [
      productFixture("CAF-001", 100),
      productFixture("ACC-001", 1), // insufficient: 2 demanded
      productFixture("ACC-EXTRA", 300),
    ];
    const deliveryForm = blFixture(
      [
        { product_id: products[0]!._id, product_code: "CAF-001", quantity: 5 },
        { product_id: products[1]!._id, product_code: "ACC-001", quantity: 2 },
        {
          product_id: products[2]!._id,
          product_code: "ACC-EXTRA",
          quantity: 10,
        },
      ],
      { status: "ready_to_ship" },
    );
    const { ctx, writes } = makeFixtureDb({ deliveryForm, products });

    await expect(
      transitionStatusHandler(ctx, {
        organizationId: ORG,
        id: deliveryForm._id,
        target: "shipped",
      }),
    ).rejects.toThrow("Stock insuffisant: ACC-001 (dispo: 1, demandé: 2)");

    expect(writes).toEqual([]);
    expect(ctx.db.patch).not.toHaveBeenCalled();
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });

  test("cross-org product → throws 'Produit introuvable', zero write", async () => {
    const products = [
      productFixture("CAF-001", 100, { organization_id: "other-org" }),
    ];
    const deliveryForm = blFixture(
      [{ product_id: products[0]!._id, product_code: "CAF-001", quantity: 5 }],
      { status: "ready_to_ship" },
    );
    const { ctx, writes } = makeFixtureDb({ deliveryForm, products });

    await expect(
      transitionStatusHandler(ctx, {
        organizationId: ORG,
        id: deliveryForm._id,
        target: "shipped",
      }),
    ).rejects.toThrow("Produit introuvable");
    expect(writes).toEqual([]);
  });
});

describe("transitionStatusHandler — shipped → delivered", () => {
  beforeEach(() => vi.clearAllMocks());

  test("patches status + delivered_at, NO stock movement (already out at shipped)", async () => {
    const products = [productFixture("CAF-001", 95)]; // already decremented
    const deliveryForm = blFixture(
      [{ product_id: products[0]!._id, product_code: "CAF-001", quantity: 5 }],
      { status: "shipped", delivered_at: null },
    );
    const { ctx, writes } = makeFixtureDb({ deliveryForm, products });

    const before = Date.now();
    const result = await transitionStatusHandler(ctx, {
      organizationId: ORG,
      id: deliveryForm._id,
      target: "delivered",
    });
    const after = Date.now();

    expect(result.status).toBe("delivered");

    const blPatches = writes.filter(
      (w) => w.op === "patch" && w.table === "delivery_forms",
    );
    expect(blPatches).toHaveLength(1);
    const patch = (
      blPatches[0] as {
        data: { status: string; delivered_at: number };
      }
    ).data;
    expect(patch.status).toBe("delivered");
    expect(patch.delivered_at).toBeGreaterThanOrEqual(before);
    expect(patch.delivered_at).toBeLessThanOrEqual(after);

    expect(writes.filter((w) => w.op === "insert")).toHaveLength(0);
    expect(
      writes.filter((w) => w.op === "patch" && w.table === "products"),
    ).toHaveLength(0);
  });
});

describe("transitionStatusHandler — guards", () => {
  beforeEach(() => vi.clearAllMocks());

  test("cross-org BL → throws 'BL introuvable', zero write", async () => {
    const deliveryForm = blFixture([], { organization_id: "other-org" });
    const { ctx, writes } = makeFixtureDb({ deliveryForm, products: [] });

    await expect(
      transitionStatusHandler(ctx, {
        organizationId: ORG,
        id: deliveryForm._id,
        target: "ready_to_ship",
      }),
    ).rejects.toThrow("BL introuvable");
    expect(writes).toEqual([]);
  });

  test("forbidden transition (delivered → ready_to_ship) → throws, zero write", async () => {
    const product = productFixture("CAF-001", 95);
    const deliveryForm = blFixture(
      [{ product_id: product._id, product_code: "CAF-001", quantity: 5 }],
      { status: "delivered" },
    );
    const { ctx, writes } = makeFixtureDb({
      deliveryForm,
      products: [product],
    });

    await expect(
      transitionStatusHandler(ctx, {
        organizationId: ORG,
        id: deliveryForm._id,
        target: "ready_to_ship",
      }),
    ).rejects.toThrow(/Transition impossible/);
    expect(writes).toEqual([]);
  });

  test("from invoiced (terminal) → any target throws, zero write", async () => {
    const product = productFixture("CAF-001", 95);
    const deliveryForm = blFixture(
      [{ product_id: product._id, product_code: "CAF-001", quantity: 5 }],
      { status: "invoiced" },
    );
    const { ctx, writes } = makeFixtureDb({
      deliveryForm,
      products: [product],
    });

    await expect(
      transitionStatusHandler(ctx, {
        organizationId: ORG,
        id: deliveryForm._id,
        target: "delivered",
      }),
    ).rejects.toThrow(/Transition impossible/);
    expect(writes).toEqual([]);
  });
});
