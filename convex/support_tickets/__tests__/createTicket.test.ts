/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { MutationCtx } from "@convex/_generated/server";
import { createHandler } from "../mutations";

const ORG = "toscana-beverages-demo";
const OTHER_ORG = "other-org";
const CLIENT_ID = "c_test" as unknown as Id<"clients">;
const BL_ID = "bl_test" as unknown as Id<"delivery_forms">;
const INV_ID = "inv_test" as unknown as Id<"invoices">;
const PROD_ID = "p_test" as unknown as Id<"products">;

type WriteOp = {
  op: "insert";
  table: "support_tickets";
  data: Record<string, unknown>;
};

function clientFixture(
  overrides: Partial<Doc<"clients">> = {},
): Doc<"clients"> {
  return {
    _id: CLIENT_ID,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    code: "BAR",
    name: "BISTROT DU PORT",
    type: "horeca",
    email: "bar@example.test",
    phone: null,
    address: {
      street: "1 rue",
      postal_code: "06000",
      city: "Nice",
      country: "FR",
    },
    payment_terms_days: 30,
    payment_terms_label: "30j",
    search_tokens: [],
    ...overrides,
  };
}

function deliveryFormFixture(
  overrides: Partial<Doc<"delivery_forms">> = {},
): Doc<"delivery_forms"> {
  return {
    _id: BL_ID,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    quotation_id: null,
    client_id: CLIENT_ID,
    number: "B26-0001",
    status: "delivered",
    lines: [],
    total_ht: 0,
    total_ttc: 0,
    delivered_at: null,
    created_by: "test",
    ...overrides,
  };
}

function invoiceFixture(
  overrides: Partial<Doc<"invoices">> = {},
): Doc<"invoices"> {
  return {
    _id: INV_ID,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    delivery_form_ids: [],
    client_id: CLIENT_ID,
    number: "F26-0001",
    status: "draft",
    total_ht: 0,
    total_ttc: 0,
    due_date: 1_800_000_000_000,
    sent_at: null,
    ...overrides,
  };
}

function productFixture(
  overrides: Partial<Doc<"products">> = {},
): Doc<"products"> {
  return {
    _id: PROD_ID,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    code: "CAF-001",
    name: "Cafetière X3",
    description: "",
    category: "machine",
    price_ht: 100,
    vat_rate: 20,
    stock_qty: 10,
    stock_threshold: null,
    is_active: true,
    search_tokens: [],
    ...overrides,
  };
}

type FixtureDocs = {
  client?: Doc<"clients">;
  deliveryForm?: Doc<"delivery_forms">;
  invoice?: Doc<"invoices">;
  product?: Doc<"products">;
};

function makeCtx(docs: FixtureDocs, generatedNumber = "T26-0001") {
  const writes: WriteOp[] = [];
  const newId = "t_inserted" as unknown as Id<"support_tickets">;
  const map = new Map<string, unknown>();
  if (docs.client) map.set(String(docs.client._id), docs.client);
  if (docs.deliveryForm)
    map.set(String(docs.deliveryForm._id), docs.deliveryForm);
  if (docs.invoice) map.set(String(docs.invoice._id), docs.invoice);
  if (docs.product) map.set(String(docs.product._id), docs.product);

  const ctx = {
    db: {
      get: vi.fn(async (id: unknown) => map.get(String(id)) ?? null),
      patch: vi.fn(),
      insert: vi.fn(async (table: unknown, data: unknown) => {
        if (table === "support_tickets") {
          writes.push({
            op: "insert",
            table: "support_tickets",
            data: data as Record<string, unknown>,
          });
          return newId;
        }
        throw new Error(`unexpected insert into ${String(table)}`);
      }),
      query: vi.fn(),
      delete: vi.fn(),
      replace: vi.fn(),
      system: {} as never,
      normalizeId: vi.fn(),
    },
    runMutation: vi.fn(async () => generatedNumber),
    runQuery: vi.fn(),
    runAction: vi.fn(),
    scheduler: { runAfter: vi.fn(), runAt: vi.fn(), cancel: vi.fn() },
    auth: {} as never,
    storage: {} as never,
  } as unknown as MutationCtx;
  return { ctx, writes, newId };
}

describe("createHandler support_tickets", () => {
  beforeEach(() => vi.clearAllMocks());

  test("happy path machine_panne + lien BL", async () => {
    const { ctx, writes, newId } = makeCtx({
      client: clientFixture(),
      deliveryForm: deliveryFormFixture(),
    });

    const result = await createHandler(ctx, {
      organizationId: ORG,
      client_id: CLIENT_ID,
      category: "machine_panne",
      priority: "high",
      title: "Cafetière X3 ne chauffe plus",
      description: "Problème détecté ce matin",
      delivery_form_id: BL_ID,
      invoice_id: null,
      product_id: null,
      created_by: "operator@toscana.local",
    });

    expect(result).toEqual({ id: newId, number: "T26-0001" });
    expect(writes).toHaveLength(1);
    const data = writes[0]!.data;
    expect(data.organization_id).toBe(ORG);
    expect(data.client_id).toBe(CLIENT_ID);
    expect(data.status).toBe("open");
    expect(data.category).toBe("machine_panne");
    expect(data.priority).toBe("high");
    expect(data.title).toBe("Cafetière X3 ne chauffe plus");
    expect(data.delivery_form_id).toBe(BL_ID);
    expect(data.invoice_id).toBeNull();
    expect(data.product_id).toBeNull();
    expect(data.assigned_to).toBeNull();
    expect(data.resolved_at).toBeNull();
    expect(data.closed_at).toBeNull();
    expect(data.created_by).toBe("operator@toscana.local");
  });

  test("happy path produit_defaut sans lien : tous *_id null", async () => {
    const { ctx, writes } = makeCtx({ client: clientFixture() });

    await createHandler(ctx, {
      organizationId: ORG,
      client_id: CLIENT_ID,
      category: "produit_defaut",
      priority: "normal",
      title: "Lot café périmé",
      description: "Date dépassée",
      delivery_form_id: null,
      invoice_id: null,
      product_id: null,
      created_by: "operator",
    });

    const data = writes[0]!.data;
    expect(data.delivery_form_id).toBeNull();
    expect(data.invoice_id).toBeNull();
    expect(data.product_id).toBeNull();
  });

  test("client cross-org -> throws 'Client introuvable', zero write", async () => {
    const { ctx, writes } = makeCtx({
      client: clientFixture({ organization_id: OTHER_ORG }),
    });

    await expect(
      createHandler(ctx, {
        organizationId: ORG,
        client_id: CLIENT_ID,
        category: "machine_panne",
        priority: "normal",
        title: "x",
        description: "y",
        delivery_form_id: null,
        invoice_id: null,
        product_id: null,
        created_by: "op",
      }),
    ).rejects.toThrow("Client introuvable");

    expect(writes).toEqual([]);
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });

  test("client missing -> throws 'Client introuvable'", async () => {
    const { ctx, writes } = makeCtx({});

    await expect(
      createHandler(ctx, {
        organizationId: ORG,
        client_id: CLIENT_ID,
        category: "machine_panne",
        priority: "normal",
        title: "x",
        description: "y",
        delivery_form_id: null,
        invoice_id: null,
        product_id: null,
        created_by: "op",
      }),
    ).rejects.toThrow("Client introuvable");

    expect(writes).toEqual([]);
  });

  test("two linked docs (BL + invoice) -> throws 'Un seul document lié autorisé', zero write", async () => {
    const { ctx, writes } = makeCtx({
      client: clientFixture(),
      deliveryForm: deliveryFormFixture(),
      invoice: invoiceFixture(),
    });

    await expect(
      createHandler(ctx, {
        organizationId: ORG,
        client_id: CLIENT_ID,
        category: "facturation",
        priority: "normal",
        title: "Litige",
        description: "Doublon",
        delivery_form_id: BL_ID,
        invoice_id: INV_ID,
        product_id: null,
        created_by: "op",
      }),
    ).rejects.toThrow("Un seul document lié autorisé");

    expect(writes).toEqual([]);
    expect(ctx.db.get).not.toHaveBeenCalled();
  });

  test("linked document cross-org -> throws 'Document lié introuvable', zero write", async () => {
    const { ctx, writes } = makeCtx({
      client: clientFixture(),
      product: productFixture({ organization_id: OTHER_ORG }),
    });

    await expect(
      createHandler(ctx, {
        organizationId: ORG,
        client_id: CLIENT_ID,
        category: "produit_defaut",
        priority: "normal",
        title: "x",
        description: "y",
        delivery_form_id: null,
        invoice_id: null,
        product_id: PROD_ID,
        created_by: "op",
      }),
    ).rejects.toThrow("Document lié introuvable");

    expect(writes).toEqual([]);
  });

  test("title vide / espaces -> throws 'Titre requis'", async () => {
    const { ctx, writes } = makeCtx({ client: clientFixture() });

    await expect(
      createHandler(ctx, {
        organizationId: ORG,
        client_id: CLIENT_ID,
        category: "machine_panne",
        priority: "normal",
        title: "   ",
        description: "ok",
        delivery_form_id: null,
        invoice_id: null,
        product_id: null,
        created_by: "op",
      }),
    ).rejects.toThrow("Titre requis");

    expect(writes).toEqual([]);
  });

  test("description vide -> throws 'Description requise'", async () => {
    const { ctx, writes } = makeCtx({ client: clientFixture() });

    await expect(
      createHandler(ctx, {
        organizationId: ORG,
        client_id: CLIENT_ID,
        category: "machine_panne",
        priority: "normal",
        title: "Titre",
        description: "",
        delivery_form_id: null,
        invoice_id: null,
        product_id: null,
        created_by: "op",
      }),
    ).rejects.toThrow("Description requise");

    expect(writes).toEqual([]);
  });
});
