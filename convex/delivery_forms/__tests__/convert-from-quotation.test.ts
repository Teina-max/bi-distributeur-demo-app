/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { MutationCtx } from "@convex/_generated/server";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { convertFromQuotationHandler } from "../mutations";

const ORG = "toscana-beverages-demo";
const QUOTATION_ID = "q_fixture_001" as unknown as Id<"quotations">;

type WriteOp =
  | { op: "patch"; table: "products" | "quotations"; id: string; data: unknown }
  | { op: "insert"; table: "delivery_forms" | "stock_movements"; data: unknown }
  | { op: "runMutation"; name: string };

function makeFixtureDb({
  quotation,
  products,
}: {
  quotation: Doc<"quotations">;
  products: readonly Doc<"products">[];
}) {
  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const writes: WriteOp[] = [];
  const insertedDeliveryFormId =
    "df_inserted_001" as unknown as Id<"delivery_forms">;

  const ctx = {
    db: {
      get: vi.fn(async (id: unknown) => {
        if (String(id) === String(quotation._id)) return quotation;
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

function quotationFixture(
  lines: readonly {
    product_id: Id<"products">;
    product_code: string;
    product_name: string;
    quantity: number;
    unit_price_ht: number;
    vat_rate: number;
  }[],
  override: Partial<Doc<"quotations">> = {},
): Doc<"quotations"> {
  const lineDocs = lines.map((l) => ({
    ...l,
    line_total_ht: Math.round(l.quantity * l.unit_price_ht * 100) / 100,
  }));
  const total_ht = lineDocs.reduce((a, l) => a + l.line_total_ht, 0);
  const total_vat = lineDocs.reduce(
    (a, l) => a + l.line_total_ht * (l.vat_rate / 100),
    0,
  );
  return {
    _id: QUOTATION_ID,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    client_id: "c_fixture_001" as unknown as Id<"clients">,
    number: "D26-0001",
    status: "draft",
    lines: lineDocs,
    total_ht: Math.round(total_ht * 100) / 100,
    total_vat: Math.round(total_vat * 100) / 100,
    total_ttc: Math.round((total_ht + total_vat) * 100) / 100,
    created_by: "operator@toscana.local",
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

describe("convertFromQuotationHandler — atomicity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("happy path: 3 lines → BL in_preparation, NO stock_movement, NO product patch, quotation patched to converted_to_delivery", async () => {
    const products = [
      productFixture("CAF-001", 100),
      productFixture("CAF-002", 50),
      productFixture("ACC-001", 300),
    ];
    const quotation = quotationFixture([
      {
        product_id: products[0]!._id,
        product_code: "CAF-001",
        product_name: "CAF-001 name",
        quantity: 5,
        unit_price_ht: 10,
        vat_rate: 20,
      },
      {
        product_id: products[1]!._id,
        product_code: "CAF-002",
        product_name: "CAF-002 name",
        quantity: 2,
        unit_price_ht: 10,
        vat_rate: 20,
      },
      {
        product_id: products[2]!._id,
        product_code: "ACC-001",
        product_name: "ACC-001 name",
        quantity: 10,
        unit_price_ht: 10,
        vat_rate: 20,
      },
    ]);
    const { ctx, writes } = makeFixtureDb({ quotation, products });

    const result = await convertFromQuotationHandler(ctx, {
      organizationId: ORG,
      quotation_id: quotation._id,
    });

    expect(result.number).toBe("B26-0042");

    const insertsBL = writes.filter(
      (w) => w.op === "insert" && w.table === "delivery_forms",
    );
    expect(insertsBL).toHaveLength(1);
    const blData = (insertsBL[0] as { data: Doc<"delivery_forms"> }).data;
    expect(blData.status).toBe("in_preparation");
    expect(blData.lines).toHaveLength(3);
    expect(blData.lines[0]!.product_code).toBe("CAF-001");
    expect(blData.lines[0]!.quantity).toBe(5);
    expect(blData.organization_id).toBe(ORG);
    expect(blData.delivered_at).toBeNull();

    // Stock is NOT touched at conversion — it leaves inventory at shipped.
    const stockMovements = writes.filter(
      (w) => w.op === "insert" && w.table === "stock_movements",
    );
    expect(stockMovements).toHaveLength(0);

    const productPatches = writes.filter(
      (w) => w.op === "patch" && w.table === "products",
    );
    expect(productPatches).toHaveLength(0);

    const quotationPatches = writes.filter(
      (w) => w.op === "patch" && w.table === "quotations",
    );
    expect(quotationPatches).toHaveLength(1);
    expect(
      (quotationPatches[0] as { data: { status: string } }).data.status,
    ).toBe("converted_to_delivery");
  });

  test("conversion does NOT check stock — under-stocked lines accepted (validated at shipped transition)", async () => {
    const products = [
      productFixture("CAF-001", 100),
      productFixture("CAF-002", 1),
      productFixture("ACC-001", 300),
    ];
    const quotation = quotationFixture([
      {
        product_id: products[0]!._id,
        product_code: "CAF-001",
        product_name: "CAF-001 name",
        quantity: 5,
        unit_price_ht: 10,
        vat_rate: 20,
      },
      {
        product_id: products[1]!._id,
        product_code: "CAF-002",
        product_name: "CAF-002 name",
        quantity: 2,
        unit_price_ht: 10,
        vat_rate: 20,
      },
      {
        product_id: products[2]!._id,
        product_code: "ACC-001",
        product_name: "ACC-001 name",
        quantity: 10,
        unit_price_ht: 10,
        vat_rate: 20,
      },
    ]);
    const { ctx, writes } = makeFixtureDb({ quotation, products });

    const result = await convertFromQuotationHandler(ctx, {
      organizationId: ORG,
      quotation_id: quotation._id,
    });

    expect(result.number).toBe("B26-0042");
    const insertsBL = writes.filter(
      (w) => w.op === "insert" && w.table === "delivery_forms",
    );
    expect(insertsBL).toHaveLength(1);
    expect((insertsBL[0] as { data: Doc<"delivery_forms"> }).data.status).toBe(
      "in_preparation",
    );
  });

  test("idempotence: status 'converted_to_delivery' → throws 'Devis déjà converti', no read of products", async () => {
    const products = [productFixture("CAF-001", 100)];
    const quotation = quotationFixture(
      [
        {
          product_id: products[0]!._id,
          product_code: "CAF-001",
          product_name: "CAF-001 name",
          quantity: 5,
          unit_price_ht: 10,
          vat_rate: 20,
        },
      ],
      { status: "converted_to_delivery" },
    );
    const { ctx, writes } = makeFixtureDb({ quotation, products });

    await expect(
      convertFromQuotationHandler(ctx, {
        organizationId: ORG,
        quotation_id: quotation._id,
      }),
    ).rejects.toThrow("Devis déjà converti");

    expect(writes).toEqual([]);
    // Only the quotation was read; products MUST NOT have been queried.
    expect(ctx.db.get).toHaveBeenCalledTimes(1);
    expect(ctx.db.get).toHaveBeenCalledWith(quotation._id);
  });

  test("status cancelled → throws 'Statut devis incompatible: cancelled'", async () => {
    const products = [productFixture("CAF-001", 100)];
    const quotation = quotationFixture(
      [
        {
          product_id: products[0]!._id,
          product_code: "CAF-001",
          product_name: "CAF-001 name",
          quantity: 5,
          unit_price_ht: 10,
          vat_rate: 20,
        },
      ],
      { status: "cancelled" },
    );
    const { ctx, writes } = makeFixtureDb({ quotation, products });

    await expect(
      convertFromQuotationHandler(ctx, {
        organizationId: ORG,
        quotation_id: quotation._id,
      }),
    ).rejects.toThrow(/Statut devis incompatible/);
    expect(writes).toEqual([]);
  });

  test("cross-org isolation: quotation belongs to org A, called with org B → throws 'Devis introuvable'", async () => {
    const products = [productFixture("CAF-001", 100)];
    const quotation = quotationFixture(
      [
        {
          product_id: products[0]!._id,
          product_code: "CAF-001",
          product_name: "CAF-001 name",
          quantity: 5,
          unit_price_ht: 10,
          vat_rate: 20,
        },
      ],
      { organization_id: "other-org" },
    );
    const { ctx, writes } = makeFixtureDb({ quotation, products });

    await expect(
      convertFromQuotationHandler(ctx, {
        organizationId: ORG,
        quotation_id: quotation._id,
      }),
    ).rejects.toThrow("Devis introuvable");
    expect(writes).toEqual([]);
  });

  test("snapshots are taken from the quotation's lines (never re-fetched from product price)", async () => {
    // Quotation locked-in price 7.5 even if current product price is 99.99 (stale)
    const product = productFixture("CAF-001", 100, { price_ht: 99.99 });
    const quotation = quotationFixture([
      {
        product_id: product._id,
        product_code: "CAF-001",
        product_name: "CAF-001 snapshot name",
        quantity: 5,
        unit_price_ht: 7.5,
        vat_rate: 20,
      },
    ]);
    const { ctx, writes } = makeFixtureDb({
      quotation,
      products: [product],
    });

    await convertFromQuotationHandler(ctx, {
      organizationId: ORG,
      quotation_id: quotation._id,
    });

    const blInsert = writes.find(
      (w) => w.op === "insert" && w.table === "delivery_forms",
    ) as { data: Doc<"delivery_forms"> };
    expect(blInsert.data.lines[0]!.unit_price_ht).toBe(7.5);
    expect(blInsert.data.lines[0]!.product_name).toBe("CAF-001 snapshot name");
  });
});
