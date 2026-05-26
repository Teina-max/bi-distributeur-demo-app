import { beforeEach, describe, expect, test, vi } from "vitest";
import type { MutationCtx } from "@convex/_generated/server";
import type { Doc, Id } from "@convex/_generated/dataModel";
import {
  adjustStockHandler,
  archiveProductHandler,
  toggleActiveHandler,
  updateProductHandler,
} from "../mutations";

const ORG = "toscana-beverages-demo";

type WriteOp =
  | { op: "patch"; table: "products"; id: string; data: unknown }
  | { op: "insert"; table: "stock_movements"; data: unknown };

function makeFixtureDb({ products }: { products: readonly Doc<"products">[] }) {
  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const writes: WriteOp[] = [];

  const ctx = {
    db: {
      get: vi.fn(async (id: unknown) => {
        const p = productMap.get(String(id));
        if (p) return p;
        return null;
      }),
      patch: vi.fn(async (id: unknown, data: unknown) => {
        writes.push({ op: "patch", table: "products", id: String(id), data });
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

function productFixture(
  code: string,
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
    stock_qty: 10,
    stock_threshold: null,
    is_active: true,
    search_tokens: ["init"],
    ...override,
  };
}

describe("updateProductHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("patches name and price_ht together", async () => {
    const product = productFixture("CAF-001");
    const { ctx, writes } = makeFixtureDb({ products: [product] });

    await updateProductHandler(ctx, {
      organizationId: ORG,
      id: product._id,
      patch: { name: "Café Toscano Premium", price_ht: 25.5 },
    });

    const patches = writes.filter((w) => w.op === "patch");
    expect(patches).toHaveLength(1);
    const data = (patches[0] as { data: Record<string, unknown> }).data;
    expect(data.name).toBe("Café Toscano Premium");
    expect(data.price_ht).toBe(25.5);
  });

  test("rebuilds search_tokens when name changes", async () => {
    const product = productFixture("CAF-001", {
      name: "Old Name",
      search_tokens: ["old", "name", "caf-001"],
    });
    const { ctx, writes } = makeFixtureDb({ products: [product] });

    await updateProductHandler(ctx, {
      organizationId: ORG,
      id: product._id,
      patch: { name: "Espresso Robusto" },
    });

    const patches = writes.filter((w) => w.op === "patch");
    expect(patches).toHaveLength(1);
    const data = (patches[0] as { data: Record<string, unknown> }).data;
    const tokens = data.search_tokens as string[];
    expect(tokens).toContain("espresso");
    expect(tokens).toContain("robusto");
    expect(tokens).toContain("caf-001");
  });

  test("refuses cross-org (throws 'Produit introuvable')", async () => {
    const product = productFixture("CAF-001", {
      organization_id: "other-org",
    });
    const { ctx, writes } = makeFixtureDb({ products: [product] });

    await expect(
      updateProductHandler(ctx, {
        organizationId: ORG,
        id: product._id,
        patch: { price_ht: 99 },
      }),
    ).rejects.toThrow("Produit introuvable");

    expect(writes).toEqual([]);
  });
});

describe("toggleActiveHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("active true → patches is_active false", async () => {
    const product = productFixture("CAF-001", { is_active: true });
    const { ctx, writes } = makeFixtureDb({ products: [product] });

    await toggleActiveHandler(ctx, {
      organizationId: ORG,
      id: product._id,
    });

    const patches = writes.filter((w) => w.op === "patch");
    expect(patches).toHaveLength(1);
    const data = (patches[0] as { data: Record<string, unknown> }).data;
    expect(data.is_active).toBe(false);
  });

  test("active false → patches is_active true", async () => {
    const product = productFixture("CAF-001", { is_active: false });
    const { ctx, writes } = makeFixtureDb({ products: [product] });

    await toggleActiveHandler(ctx, {
      organizationId: ORG,
      id: product._id,
    });

    const patches = writes.filter((w) => w.op === "patch");
    expect(patches).toHaveLength(1);
    const data = (patches[0] as { data: Record<string, unknown> }).data;
    expect(data.is_active).toBe(true);
  });
});

describe("archiveProductHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("patches is_active false regardless of starting value (true)", async () => {
    const product = productFixture("CAF-001", { is_active: true });
    const { ctx, writes } = makeFixtureDb({ products: [product] });

    await archiveProductHandler(ctx, {
      organizationId: ORG,
      id: product._id,
    });

    const patches = writes.filter((w) => w.op === "patch");
    expect(patches).toHaveLength(1);
    const data = (patches[0] as { data: Record<string, unknown> }).data;
    expect(data.is_active).toBe(false);
  });

  test("patches is_active false regardless of starting value (false)", async () => {
    const product = productFixture("CAF-001", { is_active: false });
    const { ctx, writes } = makeFixtureDb({ products: [product] });

    await archiveProductHandler(ctx, {
      organizationId: ORG,
      id: product._id,
    });

    const patches = writes.filter((w) => w.op === "patch");
    expect(patches).toHaveLength(1);
    const data = (patches[0] as { data: Record<string, unknown> }).data;
    expect(data.is_active).toBe(false);
  });
});

describe("adjustStockHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("happy +5: patches stock_qty=15 and inserts stock_movement", async () => {
    const product = productFixture("CAF-001", { stock_qty: 10 });
    const { ctx, writes } = makeFixtureDb({ products: [product] });

    await adjustStockHandler(ctx, {
      organizationId: ORG,
      id: product._id,
      delta: 5,
      reason: "Inventaire physique : +5 trouvés",
    });

    const patches = writes.filter((w) => w.op === "patch");
    expect(patches).toHaveLength(1);
    const patchData = (patches[0] as { data: Record<string, unknown> }).data;
    expect(patchData.stock_qty).toBe(15);

    const movements = writes.filter((w) => w.op === "insert");
    expect(movements).toHaveLength(1);
    const movData = (movements[0] as { data: Record<string, unknown> }).data;
    expect(movData.organization_id).toBe(ORG);
    expect(movData.product_id).toBe(product._id);
    expect(movData.delta).toBe(5);
    expect(movData.reason).toBe("manual_adjustment");
    expect(movData.reference_kind).toBe("manual");
    expect(movData.reference_id).toBeNull();
    expect(movData.note).toBe("Inventaire physique : +5 trouvés");
  });

  test("reason vide (whitespace) → throws /raison/i", async () => {
    const product = productFixture("CAF-001", { stock_qty: 10 });
    const { ctx, writes } = makeFixtureDb({ products: [product] });

    await expect(
      adjustStockHandler(ctx, {
        organizationId: ORG,
        id: product._id,
        delta: 5,
        reason: "   ",
      }),
    ).rejects.toThrow(/raison/i);

    expect(writes).toEqual([]);
  });

  test("delta 0 → throws /delta/i", async () => {
    const product = productFixture("CAF-001", { stock_qty: 10 });
    const { ctx, writes } = makeFixtureDb({ products: [product] });

    await expect(
      adjustStockHandler(ctx, {
        organizationId: ORG,
        id: product._id,
        delta: 0,
        reason: "Test",
      }),
    ).rejects.toThrow(/delta/i);

    expect(writes).toEqual([]);
  });

  test("stock 10, delta -999 → throws /stock/i (résultant négatif refusé)", async () => {
    const product = productFixture("CAF-001", { stock_qty: 10 });
    const { ctx, writes } = makeFixtureDb({ products: [product] });

    await expect(
      adjustStockHandler(ctx, {
        organizationId: ORG,
        id: product._id,
        delta: -999,
        reason: "Casse",
      }),
    ).rejects.toThrow(/stock/i);

    expect(writes).toEqual([]);
  });
});
