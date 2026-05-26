import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { QueryCtx } from "@convex/_generated/server";
import { getActivityByIdHandler } from "../queries";

const ORG = "toscana-beverages-demo";
const CLIENT_ID = "c_activity" as unknown as Id<"clients">;
type ActivityRow =
  | Doc<"quotations">
  | Doc<"delivery_forms">
  | Doc<"invoices">;

function clientFixture(
  overrides: Partial<Doc<"clients">> = {},
): Doc<"clients"> {
  return {
    _id: CLIENT_ID,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    code: "CLI-001",
    name: "BISTROT DU PORT",
    type: "horeca",
    email: "bar@example.test",
    phone: "04 95 00 00 00",
    address: {
      street: "1 quai test",
      postal_code: "06000",
      city: "Nice",
      country: "FR",
    },
    payment_terms_days: 30,
    payment_terms_label: "30 jours",
    search_tokens: ["bar", "port"],
    ...overrides,
  };
}

function quotationFixture(
  id: string,
  creationTime: number,
): Doc<"quotations"> {
  return {
    _id: id as unknown as Id<"quotations">,
    _creationTime: creationTime,
    organization_id: ORG,
    client_id: CLIENT_ID,
    number: `D26-${id}`,
    status: "draft",
    lines: [],
    total_ht: 100,
    total_vat: 20,
    total_ttc: 120,
    created_by: "operator",
  };
}

function deliveryFormFixture(
  id: string,
  creationTime: number,
): Doc<"delivery_forms"> {
  return {
    _id: id as unknown as Id<"delivery_forms">,
    _creationTime: creationTime,
    organization_id: ORG,
    quotation_id: null,
    client_id: CLIENT_ID,
    number: `B26-${id}`,
    status: "delivered",
    lines: [],
    total_ht: 100,
    total_ttc: 120,
    delivered_at: creationTime,
    created_by: "operator",
  };
}

function invoiceFixture(id: string, creationTime: number): Doc<"invoices"> {
  return {
    _id: id as unknown as Id<"invoices">,
    _creationTime: creationTime,
    organization_id: ORG,
    delivery_form_ids: [],
    client_id: CLIENT_ID,
    number: `F26-${id}`,
    status: "sent",
    total_ht: 100,
    total_ttc: 120,
    due_date: creationTime + 86_400_000,
    sent_at: creationTime,
  };
}

function makeQueryCtx({
  client,
  quotations = [],
  deliveryForms = [],
  invoices = [],
}: {
  client: Doc<"clients"> | null;
  quotations?: readonly Doc<"quotations">[];
  deliveryForms?: readonly Doc<"delivery_forms">[];
  invoices?: readonly Doc<"invoices">[];
}): QueryCtx {
  const byTable = {
    quotations,
    delivery_forms: deliveryForms,
    invoices,
  };

  return {
    db: {
      get: vi.fn(async (id: unknown) =>
        client && String(id) === String(client._id) ? client : null,
      ),
      query: vi.fn((table: keyof typeof byTable) => {
        let rows: ActivityRow[] = byTable[table].slice();
        const chain = {
          withIndex: (_name: string, builder: unknown) => {
            const captured: { clientId?: Id<"clients"> } = {};
            type IndexQ = {
              eq: (field: string, value: Id<"clients">) => IndexQ;
            };
            const q: IndexQ = {
              eq: (field, value) => {
                if (field === "client_id") captured.clientId = value;
                return q;
              },
            };
            (builder as (q: IndexQ) => unknown)(q);
            rows = rows.filter((row) => row.client_id === captured.clientId);
            return chain;
          },
          order: (dir: "asc" | "desc") => {
            rows = rows
              .slice()
              .sort((a, b) =>
                dir === "desc"
                  ? b._creationTime - a._creationTime
                  : a._creationTime - b._creationTime,
              );
            return chain;
          },
          take: async (n: number) => rows.slice(0, n),
        };
        return chain;
      }),
      system: {} as never,
      normalizeId: vi.fn(),
    },
    auth: {} as never,
    storage: {} as never,
    runQuery: vi.fn(),
  } as unknown as QueryCtx;
}

describe("getActivityByIdHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns client + recent quotations, BL, invoices sorted desc", async () => {
    const ctx = makeQueryCtx({
      client: clientFixture(),
      quotations: [
        quotationFixture("0001", 1000),
        quotationFixture("0003", 3000),
        quotationFixture("0002", 2000),
      ],
      deliveryForms: [
        deliveryFormFixture("0001", 1000),
        deliveryFormFixture("0002", 2000),
      ],
      invoices: [invoiceFixture("0001", 1000)],
    });

    const result = await getActivityByIdHandler(ctx, {
      organizationId: ORG,
      id: CLIENT_ID,
    });

    expect(result?.client.name).toBe("BISTROT DU PORT");
    expect(result?.recentQuotations.map((row) => row.number)).toEqual([
      "D26-0003",
      "D26-0002",
      "D26-0001",
    ]);
    expect(result?.recentDeliveryForms).toHaveLength(2);
    expect(result?.recentInvoices).toHaveLength(1);
  });

  test("cross-org client returns null", async () => {
    const ctx = makeQueryCtx({
      client: clientFixture({ organization_id: "other-org" }),
      quotations: [quotationFixture("0001", 1000)],
    });

    const result = await getActivityByIdHandler(ctx, {
      organizationId: ORG,
      id: CLIENT_ID,
    });

    expect(result).toBeNull();
  });

  test("client with no activity returns empty arrays", async () => {
    const ctx = makeQueryCtx({ client: clientFixture() });

    const result = await getActivityByIdHandler(ctx, {
      organizationId: ORG,
      id: CLIENT_ID,
    });

    expect(result?.client.code).toBe("CLI-001");
    expect(result?.recentQuotations).toEqual([]);
    expect(result?.recentDeliveryForms).toEqual([]);
    expect(result?.recentInvoices).toEqual([]);
  });
});
