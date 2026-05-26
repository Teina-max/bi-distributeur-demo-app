/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { MutationCtx } from "@convex/_generated/server";
import { cancelHandler } from "../mutations";

const ORG = "toscana-beverages-demo";
const BL_ID = "df_cancel_fixture" as unknown as Id<"delivery_forms">;
const CLIENT_ID = "c_cancel_fixture" as unknown as Id<"clients">;

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

function deliveryFormFixture(
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
    client_id: CLIENT_ID,
    number: "B26-0042",
    status: "delivered",
    lines: lines.map((line) => ({
      product_id: line.product_id,
      product_code: line.product_code,
      product_name: `${line.product_code} name`,
      quantity: line.quantity,
      unit_price_ht: 10,
      vat_rate: 20,
      line_total_ht: line.quantity * 10,
    })),
    total_ht: 100,
    total_ttc: 120,
    delivered_at: 1_700_000_100_000,
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
          return "sm_cancel_x" as unknown as Id<"stock_movements">;
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

describe("cancelHandler delivery_forms — rollback stock atomicity", () => {
  beforeEach(() => vi.clearAllMocks());

  test("happy path 3 lines: BL delivered -> cancelled, products restored, 3 manual stock movements", async () => {
    const products = [
      productFixture("CAF-001", 10),
      productFixture("ACC-001", 20),
      productFixture("ACC-002", 30),
    ];
    const deliveryForm = deliveryFormFixture([
      { product_id: products[0]!._id, product_code: "CAF-001", quantity: 1 },
      { product_id: products[1]!._id, product_code: "ACC-001", quantity: 2 },
      { product_id: products[2]!._id, product_code: "ACC-002", quantity: 3 },
    ]);
    const { ctx, writes } = makeFixtureDb({ deliveryForm, products });

    const result = await cancelHandler(ctx, {
      organizationId: ORG,
      id: deliveryForm._id,
      reason: "Erreur de saisie",
      cancelled_by: "operator@toscana.local",
    });

    expect(result).toEqual({ id: deliveryForm._id, restoredMovements: 3 });

    const productPatches = writes.filter(
      (w) => w.op === "patch" && w.table === "products",
    );
    expect(productPatches).toHaveLength(3);
    expect(
      (productPatches[0] as { data: { stock_qty: number } }).data.stock_qty,
    ).toBe(11);
    expect(
      (productPatches[1] as { data: { stock_qty: number } }).data.stock_qty,
    ).toBe(22);
    expect(
      (productPatches[2] as { data: { stock_qty: number } }).data.stock_qty,
    ).toBe(33);

    const movements = writes.filter((w) => w.op === "insert");
    expect(movements).toHaveLength(3);
    const firstMovement = (movements[0] as { data: Doc<"stock_movements"> })
      .data;
    expect(firstMovement.delta).toBe(1);
    expect(firstMovement.reason).toBe("manual_adjustment");
    expect(firstMovement.reference_kind).toBe("manual");
    expect(firstMovement.reference_id).toBeNull();
    expect(firstMovement.note).toBe("Annulation BL B26-0042: Erreur de saisie");

    const blPatch = writes.find(
      (w) => w.op === "patch" && w.table === "delivery_forms",
    ) as { data: { status: string } };
    expect(blPatch.data.status).toBe("cancelled");
  });

  test("status invoiced -> throws specific message, zero write", async () => {
    const product = productFixture("CAF-001", 10);
    const deliveryForm = deliveryFormFixture(
      [{ product_id: product._id, product_code: "CAF-001", quantity: 1 }],
      { status: "invoiced" },
    );
    const { ctx, writes } = makeFixtureDb({
      deliveryForm,
      products: [product],
    });

    await expect(
      cancelHandler(ctx, {
        organizationId: ORG,
        id: deliveryForm._id,
        reason: "Erreur",
        cancelled_by: "operator",
      }),
    ).rejects.toThrow("BL déjà facturé — annulez la facture d'abord");

    expect(writes).toEqual([]);
  });

  test("status cancelled -> throws 'BL déjà annulé', zero write", async () => {
    const product = productFixture("CAF-001", 10);
    const deliveryForm = deliveryFormFixture(
      [{ product_id: product._id, product_code: "CAF-001", quantity: 1 }],
      { status: "cancelled" },
    );
    const { ctx, writes } = makeFixtureDb({
      deliveryForm,
      products: [product],
    });

    await expect(
      cancelHandler(ctx, {
        organizationId: ORG,
        id: deliveryForm._id,
        reason: "Erreur",
        cancelled_by: "operator",
      }),
    ).rejects.toThrow("BL déjà annulé");

    expect(writes).toEqual([]);
  });

  test("status in_preparation -> patched to cancelled, NO stock movement, NO product patch (stock never left inventory)", async () => {
    const product = productFixture("CAF-001", 10);
    const deliveryForm = deliveryFormFixture(
      [{ product_id: product._id, product_code: "CAF-001", quantity: 1 }],
      { status: "in_preparation", delivered_at: null },
    );
    const { ctx, writes } = makeFixtureDb({
      deliveryForm,
      products: [product],
    });

    const result = await cancelHandler(ctx, {
      organizationId: ORG,
      id: deliveryForm._id,
      reason: "Erreur de saisie",
      cancelled_by: "operator",
    });

    expect(result).toEqual({ id: deliveryForm._id, restoredMovements: 0 });

    const stockMovements = writes.filter((w) => w.op === "insert");
    expect(stockMovements).toHaveLength(0);

    const productPatches = writes.filter(
      (w) => w.op === "patch" && w.table === "products",
    );
    expect(productPatches).toHaveLength(0);

    const blPatch = writes.find(
      (w) => w.op === "patch" && w.table === "delivery_forms",
    ) as { data: { status: string } };
    expect(blPatch.data.status).toBe("cancelled");
  });

  test("status ready_to_ship -> patched to cancelled, NO stock movement, NO product patch", async () => {
    const product = productFixture("CAF-001", 10);
    const deliveryForm = deliveryFormFixture(
      [{ product_id: product._id, product_code: "CAF-001", quantity: 1 }],
      { status: "ready_to_ship", delivered_at: null },
    );
    const { ctx, writes } = makeFixtureDb({
      deliveryForm,
      products: [product],
    });

    const result = await cancelHandler(ctx, {
      organizationId: ORG,
      id: deliveryForm._id,
      reason: "Erreur",
      cancelled_by: "operator",
    });

    expect(result).toEqual({ id: deliveryForm._id, restoredMovements: 0 });

    expect(writes.filter((w) => w.op === "insert")).toHaveLength(0);
    expect(
      writes.filter((w) => w.op === "patch" && w.table === "products"),
    ).toHaveLength(0);

    const blPatch = writes.find(
      (w) => w.op === "patch" && w.table === "delivery_forms",
    ) as { data: { status: string } };
    expect(blPatch.data.status).toBe("cancelled");
  });

  test("status shipped -> patched to cancelled WITH stock restoration (stock had left inventory)", async () => {
    const products = [
      productFixture("CAF-001", 5),
      productFixture("ACC-001", 8),
    ];
    const deliveryForm = deliveryFormFixture(
      [
        { product_id: products[0]!._id, product_code: "CAF-001", quantity: 2 },
        { product_id: products[1]!._id, product_code: "ACC-001", quantity: 3 },
      ],
      { status: "shipped" },
    );
    const { ctx, writes } = makeFixtureDb({ deliveryForm, products });

    const result = await cancelHandler(ctx, {
      organizationId: ORG,
      id: deliveryForm._id,
      reason: "Retour client",
      cancelled_by: "operator",
    });

    expect(result.restoredMovements).toBe(2);

    const productPatches = writes.filter(
      (w) => w.op === "patch" && w.table === "products",
    );
    expect(productPatches).toHaveLength(2);
    expect(
      (productPatches[0] as { data: { stock_qty: number } }).data.stock_qty,
    ).toBe(7);
    expect(
      (productPatches[1] as { data: { stock_qty: number } }).data.stock_qty,
    ).toBe(11);

    const movements = writes.filter((w) => w.op === "insert");
    expect(movements).toHaveLength(2);
    const movement = (movements[0] as { data: Doc<"stock_movements"> }).data;
    expect(movement.delta).toBe(2);
    expect(movement.reason).toBe("manual_adjustment");
  });

  test("cross-org BL -> throws 'BL introuvable', zero write", async () => {
    const product = productFixture("CAF-001", 10);
    const deliveryForm = deliveryFormFixture(
      [{ product_id: product._id, product_code: "CAF-001", quantity: 1 }],
      { organization_id: "other-org" },
    );
    const { ctx, writes } = makeFixtureDb({
      deliveryForm,
      products: [product],
    });

    await expect(
      cancelHandler(ctx, {
        organizationId: ORG,
        id: deliveryForm._id,
        reason: "Erreur",
        cancelled_by: "operator",
      }),
    ).rejects.toThrow("BL introuvable");

    expect(writes).toEqual([]);
  });

  test("CRITICAL: product cross-org in lines -> throws before any stock restore write", async () => {
    const products = [
      productFixture("CAF-001", 10),
      productFixture("ACC-001", 20, { organization_id: "other-org" }),
    ];
    const deliveryForm = deliveryFormFixture([
      { product_id: products[0]!._id, product_code: "CAF-001", quantity: 1 },
      { product_id: products[1]!._id, product_code: "ACC-001", quantity: 2 },
    ]);
    const { ctx, writes } = makeFixtureDb({ deliveryForm, products });

    await expect(
      cancelHandler(ctx, {
        organizationId: ORG,
        id: deliveryForm._id,
        reason: "Erreur",
        cancelled_by: "operator",
      }),
    ).rejects.toThrow("Produit introuvable");

    expect(writes).toEqual([]);
    expect(ctx.db.patch).not.toHaveBeenCalled();
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });

  test("missing product in lines -> throws before any stock restore write", async () => {
    const missingProductId = "p_missing" as unknown as Id<"products">;
    const deliveryForm = deliveryFormFixture([
      { product_id: missingProductId, product_code: "MISSING", quantity: 1 },
    ]);
    const { ctx, writes } = makeFixtureDb({
      deliveryForm,
      products: [],
    });

    await expect(
      cancelHandler(ctx, {
        organizationId: ORG,
        id: deliveryForm._id,
        reason: "Erreur",
        cancelled_by: "operator",
      }),
    ).rejects.toThrow("Produit introuvable");

    expect(writes).toEqual([]);
  });

  test("empty reason -> throws 'Raison requise', zero write", async () => {
    const product = productFixture("CAF-001", 10);
    const deliveryForm = deliveryFormFixture([
      { product_id: product._id, product_code: "CAF-001", quantity: 1 },
    ]);
    const { ctx, writes } = makeFixtureDb({
      deliveryForm,
      products: [product],
    });

    await expect(
      cancelHandler(ctx, {
        organizationId: ORG,
        id: deliveryForm._id,
        reason: "   ",
        cancelled_by: "operator",
      }),
    ).rejects.toThrow("Raison requise");

    expect(writes).toEqual([]);
  });

  test("long reason is accepted and preserved in stock movement note", async () => {
    const product = productFixture("CAF-001", 10);
    const deliveryForm = deliveryFormFixture([
      { product_id: product._id, product_code: "CAF-001", quantity: 1 },
    ]);
    const { ctx, writes } = makeFixtureDb({
      deliveryForm,
      products: [product],
    });
    const reason = "x".repeat(1000);

    await cancelHandler(ctx, {
      organizationId: ORG,
      id: deliveryForm._id,
      reason,
      cancelled_by: "operator",
    });

    const movement = writes.find((w) => w.op === "insert") as {
      data: Doc<"stock_movements">;
    };
    expect(movement.data.note).toBe(`Annulation BL B26-0042: ${reason}`);
  });

  test("single-line BL -> restores one product and creates one movement", async () => {
    const product = productFixture("CAF-001", 10);
    const deliveryForm = deliveryFormFixture([
      { product_id: product._id, product_code: "CAF-001", quantity: 4 },
    ]);
    const { ctx, writes } = makeFixtureDb({
      deliveryForm,
      products: [product],
    });

    const result = await cancelHandler(ctx, {
      organizationId: ORG,
      id: deliveryForm._id,
      reason: "Retour client",
      cancelled_by: "operator",
    });

    expect(result.restoredMovements).toBe(1);
    expect(
      writes.filter((w) => w.op === "patch" && w.table === "products"),
    ).toHaveLength(1);
    expect(writes.filter((w) => w.op === "insert")).toHaveLength(1);
  });
});
