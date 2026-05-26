import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { MutationCtx } from "@convex/_generated/server";
import { cancelHandler } from "../mutations";

const ORG = "toscana-beverages-demo";
const INVOICE_ID = "inv_cancel_fixture" as unknown as Id<"invoices">;
const CLIENT_ID = "c_cancel_fixture" as unknown as Id<"clients">;

type WriteOp = {
  op: "patch";
  table: "invoices" | "delivery_forms";
  id: string;
  data: unknown;
};

function deliveryFormFixture(
  id: Id<"delivery_forms">,
  overrides: Partial<Doc<"delivery_forms">> = {},
): Doc<"delivery_forms"> {
  return {
    _id: id,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    quotation_id: null,
    client_id: CLIENT_ID,
    number: "B26-0001",
    status: "invoiced",
    lines: [],
    total_ht: 100,
    total_ttc: 120,
    delivered_at: 1_700_000_100_000,
    created_by: "operator@toscana.local",
    ...overrides,
  };
}

function invoiceFixture(
  deliveryFormIds: readonly Id<"delivery_forms">[],
  overrides: Partial<Doc<"invoices">> = {},
): Doc<"invoices"> {
  return {
    _id: INVOICE_ID,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    delivery_form_ids: [...deliveryFormIds],
    client_id: CLIENT_ID,
    number: "F26-0042",
    status: "draft",
    total_ht: 100,
    total_ttc: 120,
    due_date: 1_700_100_000_000,
    sent_at: null,
    ...overrides,
  };
}

function makeFixtureDb({
  invoice,
  deliveryForms,
}: {
  invoice: Doc<"invoices"> | null;
  deliveryForms: readonly Doc<"delivery_forms">[];
}) {
  const deliveryFormMap = new Map(
    deliveryForms.map((df) => [String(df._id), df]),
  );
  const writes: WriteOp[] = [];

  const ctx = {
    db: {
      get: vi.fn(async (id: unknown) => {
        if (invoice && String(id) === String(invoice._id)) return invoice;
        return deliveryFormMap.get(String(id)) ?? null;
      }),
      patch: vi.fn(async (id: unknown, data: unknown) => {
        writes.push({
          op: "patch",
          table: deliveryFormMap.has(String(id))
            ? "delivery_forms"
            : "invoices",
          id: String(id),
          data,
        });
      }),
      insert: vi.fn(),
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

describe("cancelHandler invoices — BL rollback atomicity", () => {
  beforeEach(() => vi.clearAllMocks());

  test("happy path draft invoice with 1 BL -> invoice cancelled + BL delivered", async () => {
    const blId = "df_one" as unknown as Id<"delivery_forms">;
    const bl = deliveryFormFixture(blId);
    const invoice = invoiceFixture([bl._id], { status: "draft" });
    const { ctx, writes } = makeFixtureDb({
      invoice,
      deliveryForms: [bl],
    });

    const result = await cancelHandler(ctx, {
      organizationId: ORG,
      id: invoice._id,
      reason: "Erreur de facture",
    });

    expect(result).toEqual({ id: invoice._id, restoredBLs: 1 });
    const invoicePatch = writes.find((w) => w.table === "invoices") as {
      data: { status: string };
    };
    expect(invoicePatch.data.status).toBe("cancelled");

    const blPatch = writes.find((w) => w.table === "delivery_forms") as {
      data: { status: string };
    };
    expect(blPatch.data.status).toBe("delivered");
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });

  test("happy path sent aggregate invoice with 3 BL -> 3 BL returned to delivered", async () => {
    const bls = [
      deliveryFormFixture("df_1" as unknown as Id<"delivery_forms">),
      deliveryFormFixture("df_2" as unknown as Id<"delivery_forms">),
      deliveryFormFixture("df_3" as unknown as Id<"delivery_forms">),
    ];
    const invoice = invoiceFixture(
      bls.map((bl) => bl._id),
      { status: "sent", sent_at: 1_700_000_200_000 },
    );
    const { ctx, writes } = makeFixtureDb({
      invoice,
      deliveryForms: bls,
    });

    const result = await cancelHandler(ctx, {
      organizationId: ORG,
      id: invoice._id,
      reason: "Erreur client",
    });

    expect(result.restoredBLs).toBe(3);
    const blPatches = writes.filter((w) => w.table === "delivery_forms");
    expect(blPatches).toHaveLength(3);
    expect(
      blPatches.every(
        (patch) => (patch as { data: { status: string } }).data.status === "delivered",
      ),
    ).toBe(true);
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });

  test("status paid -> throws 'Facture déjà payée', zero write", async () => {
    const bl = deliveryFormFixture("df_one" as unknown as Id<"delivery_forms">);
    const invoice = invoiceFixture([bl._id], { status: "paid" });
    const { ctx, writes } = makeFixtureDb({
      invoice,
      deliveryForms: [bl],
    });

    await expect(
      cancelHandler(ctx, {
        organizationId: ORG,
        id: invoice._id,
        reason: "Erreur",
      }),
    ).rejects.toThrow("Facture déjà payée — annulation interdite");

    expect(writes).toEqual([]);
  });

  test("status cancelled -> throws 'Facture déjà annulée', zero write", async () => {
    const bl = deliveryFormFixture("df_one" as unknown as Id<"delivery_forms">);
    const invoice = invoiceFixture([bl._id], { status: "cancelled" });
    const { ctx, writes } = makeFixtureDb({
      invoice,
      deliveryForms: [bl],
    });

    await expect(
      cancelHandler(ctx, {
        organizationId: ORG,
        id: invoice._id,
        reason: "Erreur",
      }),
    ).rejects.toThrow("Facture déjà annulée");

    expect(writes).toEqual([]);
  });

  test("cross-org invoice -> throws 'Facture introuvable', zero write", async () => {
    const bl = deliveryFormFixture("df_one" as unknown as Id<"delivery_forms">);
    const invoice = invoiceFixture([bl._id], { organization_id: "other-org" });
    const { ctx, writes } = makeFixtureDb({
      invoice,
      deliveryForms: [bl],
    });

    await expect(
      cancelHandler(ctx, {
        organizationId: ORG,
        id: invoice._id,
        reason: "Erreur",
      }),
    ).rejects.toThrow("Facture introuvable");

    expect(writes).toEqual([]);
  });

  test("empty reason -> throws 'Raison requise', zero write", async () => {
    const bl = deliveryFormFixture("df_one" as unknown as Id<"delivery_forms">);
    const invoice = invoiceFixture([bl._id]);
    const { ctx, writes } = makeFixtureDb({
      invoice,
      deliveryForms: [bl],
    });

    await expect(
      cancelHandler(ctx, {
        organizationId: ORG,
        id: invoice._id,
        reason: "   ",
      }),
    ).rejects.toThrow("Raison requise");

    expect(writes).toEqual([]);
  });
});
