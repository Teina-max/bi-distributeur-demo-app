import { beforeEach, describe, expect, test, vi } from "vitest";
import type { QueryCtx } from "@convex/_generated/server";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { listInvoiceableByClientHandler } from "../queries";

const ORG = "toscana-beverages-demo";
const OTHER_ORG = "other-org";

const CLIENT_A = "c_alpha" as unknown as Id<"clients">;
const CLIENT_B = "c_beta" as unknown as Id<"clients">;
const CLIENT_OTHER_ORG = "c_other" as unknown as Id<"clients">;

function makeClient(id: Id<"clients">, organizationId: string): Doc<"clients"> {
  return {
    _id: id,
    _creationTime: 1_700_000_000_000,
    organization_id: organizationId,
    code: "CLI",
    name: "Client",
    type: "horeca",
    email: null,
    phone: null,
    address: { street: "", postal_code: "", city: "", country: "FR" },
    payment_terms_days: 30,
    payment_terms_label: "30 jours",
    search_tokens: [],
  } as Doc<"clients">;
}

function makeBL({
  id,
  clientId,
  status,
  organizationId = ORG,
  creationTime,
  totalHt = 100,
  totalTtc = 120,
  deliveredAt = creationTime,
  number = "B26-0000",
}: {
  id: string;
  clientId: Id<"clients">;
  status: Doc<"delivery_forms">["status"];
  organizationId?: string;
  creationTime: number;
  totalHt?: number;
  totalTtc?: number;
  deliveredAt?: number | null;
  number?: string;
}): Doc<"delivery_forms"> {
  return {
    _id: id as unknown as Id<"delivery_forms">,
    _creationTime: creationTime,
    organization_id: organizationId,
    quotation_id: null,
    client_id: clientId,
    number,
    status,
    lines: [],
    total_ht: totalHt,
    total_ttc: totalTtc,
    delivered_at: deliveredAt,
    created_by: "user_x",
  } as Doc<"delivery_forms">;
}

type Fixture = {
  clients: Doc<"clients">[];
  blsByOrgAndStatus: Doc<"delivery_forms">[];
};

function makeQueryCtx(fixture: Fixture): QueryCtx {
  const clientById = new Map(
    fixture.clients.map((c) => [String(c._id), c] as const),
  );

  return {
    db: {
      get: vi.fn(async (id: unknown) => clientById.get(String(id)) ?? null),
      query: vi.fn(() => {
        // Chainable mock that reproduces .withIndex(...).order("desc").take(n)
        let filtered = fixture.blsByOrgAndStatus.slice();
        const chain = {
          withIndex: (_name: unknown, builder: unknown) => {
            const captured: { organizationId?: string; status?: string } = {};
            type IndexQ = {
              eq: (field: string, value: string) => IndexQ;
            };
            const q: IndexQ = {
              eq: (field: string, value: string) => {
                if (field === "organization_id")
                  captured.organizationId = value;
                else if (field === "status") captured.status = value;
                return q;
              },
            };
            (builder as (q: IndexQ) => unknown)(q);
            filtered = filtered.filter(
              (bl) =>
                bl.organization_id === captured.organizationId &&
                bl.status === captured.status,
            );
            return chain;
          },
          order: (dir: "asc" | "desc") => {
            filtered = filtered
              .slice()
              .sort((a, b) =>
                dir === "desc"
                  ? b._creationTime - a._creationTime
                  : a._creationTime - b._creationTime,
              );
            return chain;
          },
          take: async (n: number) => filtered.slice(0, n),
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

describe("listInvoiceableByClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns only delivered BLs for the requested client", async () => {
    const ctx = makeQueryCtx({
      clients: [makeClient(CLIENT_A, ORG), makeClient(CLIENT_B, ORG)],
      blsByOrgAndStatus: [
        makeBL({
          id: "bl_a1",
          clientId: CLIENT_A,
          status: "delivered",
          creationTime: 3000,
          number: "B26-0001",
        }),
        makeBL({
          id: "bl_a2_draft",
          clientId: CLIENT_A,
          status: "in_preparation",
          creationTime: 2500,
        }),
        makeBL({
          id: "bl_a3_invoiced",
          clientId: CLIENT_A,
          status: "invoiced",
          creationTime: 2000,
        }),
        makeBL({
          id: "bl_b1",
          clientId: CLIENT_B,
          status: "delivered",
          creationTime: 1500,
        }),
      ],
    });

    const result = await listInvoiceableByClientHandler(ctx, {
      organizationId: ORG,
      client_id: CLIENT_A,
    });
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe("B26-0001");
  });

  test("returns empty array when the client has no delivered BLs", async () => {
    const ctx = makeQueryCtx({
      clients: [makeClient(CLIENT_A, ORG)],
      blsByOrgAndStatus: [
        makeBL({
          id: "bl_a_draft",
          clientId: CLIENT_A,
          status: "in_preparation",
          creationTime: 3000,
        }),
        makeBL({
          id: "bl_a_invoiced",
          clientId: CLIENT_A,
          status: "invoiced",
          creationTime: 2000,
        }),
      ],
    });

    const result = await listInvoiceableByClientHandler(ctx, {
      organizationId: ORG,
      client_id: CLIENT_A,
    });
    expect(result).toEqual([]);
  });

  test("returns empty array when the client belongs to a different organization", async () => {
    const ctx = makeQueryCtx({
      clients: [makeClient(CLIENT_OTHER_ORG, OTHER_ORG)],
      blsByOrgAndStatus: [
        makeBL({
          id: "bl_x",
          clientId: CLIENT_OTHER_ORG,
          status: "delivered",
          organizationId: OTHER_ORG,
          creationTime: 3000,
        }),
      ],
    });

    const result = await listInvoiceableByClientHandler(ctx, {
      organizationId: ORG,
      client_id: CLIENT_OTHER_ORG,
    });
    expect(result).toEqual([]);
  });

  test("returns empty array when the client id is unknown", async () => {
    const ctx = makeQueryCtx({
      clients: [],
      blsByOrgAndStatus: [],
    });
    const result = await listInvoiceableByClientHandler(ctx, {
      organizationId: ORG,
      client_id: CLIENT_A,
    });
    expect(result).toEqual([]);
  });

  test("preserves desc creation order across multiple delivered BLs", async () => {
    const ctx = makeQueryCtx({
      clients: [makeClient(CLIENT_A, ORG)],
      blsByOrgAndStatus: [
        makeBL({
          id: "bl_old",
          clientId: CLIENT_A,
          status: "delivered",
          creationTime: 1000,
          number: "B26-0001",
        }),
        makeBL({
          id: "bl_mid",
          clientId: CLIENT_A,
          status: "delivered",
          creationTime: 2000,
          number: "B26-0002",
        }),
        makeBL({
          id: "bl_new",
          clientId: CLIENT_A,
          status: "delivered",
          creationTime: 3000,
          number: "B26-0003",
        }),
      ],
    });

    const result = await listInvoiceableByClientHandler(ctx, {
      organizationId: ORG,
      client_id: CLIENT_A,
    });
    expect(result.map((r) => r.number)).toEqual([
      "B26-0003",
      "B26-0002",
      "B26-0001",
    ]);
  });

  test("dto shape exposes id/number/totals/dates only", async () => {
    const ctx = makeQueryCtx({
      clients: [makeClient(CLIENT_A, ORG)],
      blsByOrgAndStatus: [
        makeBL({
          id: "bl_a1",
          clientId: CLIENT_A,
          status: "delivered",
          creationTime: 3000,
          totalHt: 123.45,
          totalTtc: 148.14,
          deliveredAt: 3050,
          number: "B26-0007",
        }),
      ],
    });

    const result = await listInvoiceableByClientHandler(ctx, {
      organizationId: ORG,
      client_id: CLIENT_A,
    });
    expect(result[0]).toMatchObject({
      number: "B26-0007",
      total_ht: 123.45,
      total_ttc: 148.14,
      deliveredAt: 3050,
      createdAt: 3000,
    });
  });
});
