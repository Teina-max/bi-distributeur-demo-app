import { beforeEach, describe, expect, test, vi } from "vitest";
import type { MutationCtx } from "@convex/_generated/server";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { convertFromDeliveryFormsHandler } from "../mutations";

const ORG = "toscana-beverages-demo";
const BL_ID = "df_fixture" as unknown as Id<"delivery_forms">;
const BL_ID_2 = "df_fixture_2" as unknown as Id<"delivery_forms">;
const CLIENT_ID = "c_fixture" as unknown as Id<"clients">;
const CLIENT_ID_2 = "c_fixture_2" as unknown as Id<"clients">;

type WriteOp =
  | { op: "patch"; table: string; id: string; data: unknown }
  | { op: "insert"; table: string; data: unknown }
  | { op: "runMutation"; name: string };

function makeFixtureDb({
  deliveryForms,
  clients,
}: {
  deliveryForms: readonly Doc<"delivery_forms">[];
  clients: readonly Doc<"clients">[];
}) {
  const writes: WriteOp[] = [];
  const insertedInvoiceId = "inv_inserted" as unknown as Id<"invoices">;
  const ctx = {
    db: {
      get: vi.fn(async (id: unknown) => {
        const df = deliveryForms.find((d) => String(d._id) === String(id));
        if (df) return df;
        const c = clients.find((cl) => String(cl._id) === String(id));
        if (c) return c;
        return null;
      }),
      patch: vi.fn(async (id: unknown, data: unknown) => {
        writes.push({
          op: "patch",
          table: "delivery_forms",
          id: String(id),
          data,
        });
      }),
      insert: vi.fn(async (table: unknown, data: unknown) => {
        if (table === "invoices") {
          writes.push({ op: "insert", table: "invoices", data });
          return insertedInvoiceId;
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
      return "F26-0007";
    }),
    runQuery: vi.fn(),
    runAction: vi.fn(),
    scheduler: { runAfter: vi.fn(), runAt: vi.fn(), cancel: vi.fn() },
    auth: {} as never,
    storage: {} as never,
  } as unknown as MutationCtx;
  return { ctx, writes };
}

function blFixture(
  override: Partial<Doc<"delivery_forms">> = {},
): Doc<"delivery_forms"> {
  return {
    _id: BL_ID,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    quotation_id: null,
    client_id: CLIENT_ID,
    number: "B26-0042",
    status: "delivered",
    lines: [],
    total_ht: 100,
    total_ttc: 120,
    delivered_at: 1_700_000_100_000,
    created_by: "operator@toscana.local",
    ...override,
  };
}

function clientFixture(override: Partial<Doc<"clients">> = {}): Doc<"clients"> {
  return {
    _id: CLIENT_ID,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    code: "CLI-001",
    name: "Café Du Port",
    type: "company",
    email: null,
    phone: null,
    address: {
      street: "1 rue",
      postal_code: "06000",
      city: "Nice",
      country: "FR",
    },
    payment_terms_days: 30,
    payment_terms_label: "30 jours net",
    search_tokens: [],
    ...override,
  };
}

describe("convertFromDeliveryFormsHandler — atomicity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_700_000_000_000));
  });

  test("happy path single BL: delivered + client(30d) → invoice draft, due_date = now + 30j", async () => {
    const deliveryForm = blFixture();
    const client = clientFixture({ payment_terms_days: 30 });
    const { ctx, writes } = makeFixtureDb({
      deliveryForms: [deliveryForm],
      clients: [client],
    });

    const result = await convertFromDeliveryFormsHandler(ctx, {
      organizationId: ORG,
      delivery_form_ids: [deliveryForm._id],
    });

    expect(result.number).toBe("F26-0007");

    const insertInvoice = writes.find(
      (w) => w.op === "insert" && w.table === "invoices",
    ) as { data: Doc<"invoices"> };
    expect(insertInvoice.data.status).toBe("draft");
    expect(insertInvoice.data.due_date).toBe(
      1_700_000_000_000 + 30 * 86_400_000,
    );
    expect(insertInvoice.data.sent_at).toBeNull();
    expect(insertInvoice.data.delivery_form_ids).toEqual([deliveryForm._id]);
    expect(insertInvoice.data.total_ht).toBe(100);
    expect(insertInvoice.data.total_ttc).toBe(120);

    const patchBL = writes.find(
      (w) => w.op === "patch" && w.table === "delivery_forms",
    ) as { data: { status: string } };
    expect(patchBL.data.status).toBe("invoiced");
  });

  test("happy path 3 BL aggregated: totals summed, all 3 patched invoiced", async () => {
    const df1 = blFixture({
      _id: BL_ID,
      total_ht: 100,
      total_ttc: 120,
      number: "B26-0001",
    });
    const df2 = blFixture({
      _id: BL_ID_2,
      total_ht: 50.5,
      total_ttc: 60.6,
      number: "B26-0002",
    });
    const df3 = blFixture({
      _id: "df_third" as unknown as Id<"delivery_forms">,
      total_ht: 25.25,
      total_ttc: 30.3,
      number: "B26-0003",
    });
    const client = clientFixture({ payment_terms_days: 30 });
    const { ctx, writes } = makeFixtureDb({
      deliveryForms: [df1, df2, df3],
      clients: [client],
    });

    const result = await convertFromDeliveryFormsHandler(ctx, {
      organizationId: ORG,
      delivery_form_ids: [df1._id, df2._id, df3._id],
    });

    expect(result.number).toBe("F26-0007");

    const insertInvoice = writes.find(
      (w) => w.op === "insert" && w.table === "invoices",
    ) as { data: Doc<"invoices"> };
    expect(insertInvoice.data.delivery_form_ids).toEqual([
      df1._id,
      df2._id,
      df3._id,
    ]);
    expect(insertInvoice.data.total_ht).toBe(175.75);
    expect(insertInvoice.data.total_ttc).toBe(210.9);

    const patchedIds = writes
      .filter((w) => w.op === "patch" && w.table === "delivery_forms")
      .map((w) => (w as { id: string }).id);
    expect(patchedIds).toHaveLength(3);
    expect(patchedIds).toContain(String(df1._id));
    expect(patchedIds).toContain(String(df2._id));
    expect(patchedIds).toContain(String(df3._id));
  });

  test("empty array → throws 'Au moins un BL est requis'", async () => {
    const { ctx, writes } = makeFixtureDb({
      deliveryForms: [],
      clients: [],
    });

    await expect(
      convertFromDeliveryFormsHandler(ctx, {
        organizationId: ORG,
        delivery_form_ids: [],
      }),
    ).rejects.toThrow("Au moins un BL est requis");
    expect(writes).toEqual([]);
  });

  test("two BL different clients → throws 'Tous les BL doivent appartenir au même client'", async () => {
    const df1 = blFixture({ client_id: CLIENT_ID });
    const df2 = blFixture({ _id: BL_ID_2, client_id: CLIENT_ID_2 });
    const client = clientFixture();
    const { ctx, writes } = makeFixtureDb({
      deliveryForms: [df1, df2],
      clients: [client],
    });

    await expect(
      convertFromDeliveryFormsHandler(ctx, {
        organizationId: ORG,
        delivery_form_ids: [df1._id, df2._id],
      }),
    ).rejects.toThrow(/même client/);
    expect(writes.filter((w) => w.op !== "runMutation")).toEqual([]);
  });

  test("one BL status invoiced inside array → throws 'BL déjà facturé', no writes", async () => {
    const df1 = blFixture({ status: "delivered" });
    const df2 = blFixture({ _id: BL_ID_2, status: "invoiced" });
    const client = clientFixture();
    const { ctx, writes } = makeFixtureDb({
      deliveryForms: [df1, df2],
      clients: [client],
    });

    await expect(
      convertFromDeliveryFormsHandler(ctx, {
        organizationId: ORG,
        delivery_form_ids: [df1._id, df2._id],
      }),
    ).rejects.toThrow("BL déjà facturé");
    expect(writes.filter((w) => w.op !== "runMutation")).toEqual([]);
  });

  test("status in_preparation inside array → throws 'Statut BL incompatible'", async () => {
    const df1 = blFixture({ status: "in_preparation" });
    const client = clientFixture();
    const { ctx, writes } = makeFixtureDb({
      deliveryForms: [df1],
      clients: [client],
    });

    await expect(
      convertFromDeliveryFormsHandler(ctx, {
        organizationId: ORG,
        delivery_form_ids: [df1._id],
      }),
    ).rejects.toThrow(/Statut BL incompatible/);
    expect(writes.filter((w) => w.op !== "runMutation")).toEqual([]);
  });

  test("cross-org isolation: BL belongs to org A, called from org B → throws", async () => {
    const deliveryForm = blFixture({ organization_id: "other-org" });
    const client = clientFixture();
    const { ctx, writes } = makeFixtureDb({
      deliveryForms: [deliveryForm],
      clients: [client],
    });

    await expect(
      convertFromDeliveryFormsHandler(ctx, {
        organizationId: ORG,
        delivery_form_ids: [deliveryForm._id],
      }),
    ).rejects.toThrow("BL introuvable");
    expect(writes).toEqual([]);
  });

  test("0-day payment terms → due_date equals now", async () => {
    const deliveryForm = blFixture();
    const client = clientFixture({ payment_terms_days: 0 });
    const { ctx, writes } = makeFixtureDb({
      deliveryForms: [deliveryForm],
      clients: [client],
    });

    await convertFromDeliveryFormsHandler(ctx, {
      organizationId: ORG,
      delivery_form_ids: [deliveryForm._id],
    });

    const insertInvoice = writes.find(
      (w) => w.op === "insert" && w.table === "invoices",
    ) as { data: Doc<"invoices"> };
    expect(insertInvoice.data.due_date).toBe(1_700_000_000_000);
  });
});
