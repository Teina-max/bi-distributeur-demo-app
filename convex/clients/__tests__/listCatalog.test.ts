import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { QueryCtx } from "@convex/_generated/server";
import { listCatalogHandler } from "../queries";

const ORG = "toscana-beverages-demo";
const OTHER_ORG = "other-org";

function clientFixture(
  code: string,
  organizationId = ORG,
  overrides: Partial<Doc<"clients">> = {},
): Doc<"clients"> {
  return {
    _id: `c_${code}` as unknown as Id<"clients">,
    _creationTime: 1_700_000_000_000,
    organization_id: organizationId,
    code,
    name: code === "BAR" ? "BISTROT DU PORT" : `Client ${code}`,
    type: "horeca",
    email: `${code.toLowerCase()}@example.test`,
    phone: "04 95 00 00 00",
    address: {
      street: "1 rue test",
      postal_code: "06000",
      city: "Nice",
      country: "FR",
    },
    payment_terms_days: 30,
    payment_terms_label: "30 jours",
    search_tokens: [code.toLowerCase(), "client", "bar", "port"],
    ...overrides,
  };
}

function makeQueryCtx(clients: readonly Doc<"clients">[]): QueryCtx {
  return {
    db: {
      get: vi.fn(),
      query: vi.fn((_table: "clients") => {
        let rows = clients.slice();
        const chain = {
          withIndex: (_name: string, builder: unknown) => {
            const captured: { organizationId?: string } = {};
            type IndexQ = { eq: (field: string, value: string) => IndexQ };
            const q: IndexQ = {
              eq: (field, value) => {
                if (field === "organization_id") captured.organizationId = value;
                return q;
              },
            };
            (builder as (q: IndexQ) => unknown)(q);
            rows = rows.filter(
              (client) => client.organization_id === captured.organizationId,
            );
            return chain;
          },
          withSearchIndex: (_name: string, builder: unknown) => {
            const captured: { organizationId?: string; query?: string } = {};
            type SearchQ = {
              search: (field: string, value: string) => SearchQ;
              eq: (field: string, value: string) => SearchQ;
            };
            const q: SearchQ = {
              search: (_field, value) => {
                captured.query = value.toLowerCase();
                return q;
              },
              eq: (field, value) => {
                if (field === "organization_id") captured.organizationId = value;
                return q;
              },
            };
            (builder as (q: SearchQ) => unknown)(q);
            rows = rows.filter(
              (client) =>
                client.organization_id === captured.organizationId &&
                client.search_tokens.some((token) =>
                  token.includes(captured.query ?? ""),
                ),
            );
            return chain;
          },
          order: (dir: "asc" | "desc") => {
            rows = rows
              .slice()
              .sort((a, b) =>
                dir === "asc"
                  ? a.code.localeCompare(b.code)
                  : b.code.localeCompare(a.code),
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

describe("listCatalogHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  test("seed 5 clients -> returns 5", async () => {
    const ctx = makeQueryCtx([
      clientFixture("C005"),
      clientFixture("C001"),
      clientFixture("C003"),
      clientFixture("C002"),
      clientFixture("C004"),
    ]);

    const result = await listCatalogHandler(ctx, {
      organizationId: ORG,
      query: "",
      limit: 50,
    });

    expect(result).toHaveLength(5);
  });

  test("cross-org: querying org A returns only org A clients", async () => {
    const ctx = makeQueryCtx([
      clientFixture("A001", ORG),
      clientFixture("A002", ORG),
      clientFixture("A003", ORG),
      clientFixture("B001", OTHER_ORG),
      clientFixture("B002", OTHER_ORG),
    ]);

    const result = await listCatalogHandler(ctx, {
      organizationId: ORG,
      query: "",
      limit: 50,
    });

    expect(result.map((client) => client.code)).toEqual([
      "A001",
      "A002",
      "A003",
    ]);
  });

  test("query 'bar' matches BISTROT DU PORT through search index", async () => {
    const ctx = makeQueryCtx([
      clientFixture("BAR", ORG, {
        name: "BISTROT DU PORT",
        search_tokens: ["bar", "du", "port"],
      }),
      clientFixture("HOTEL", ORG, {
        name: "HOTEL CENTRAL",
        search_tokens: ["hotel", "central"],
      }),
    ]);

    const result = await listCatalogHandler(ctx, {
      organizationId: ORG,
      query: "bar",
      limit: 50,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("BISTROT DU PORT");
  });

  test("empty query returns clients sorted by code asc", async () => {
    const ctx = makeQueryCtx([
      clientFixture("C003"),
      clientFixture("C001"),
      clientFixture("C002"),
    ]);

    const result = await listCatalogHandler(ctx, {
      organizationId: ORG,
      query: "  ",
      limit: 50,
    });

    expect(result.map((client) => client.code)).toEqual([
      "C001",
      "C002",
      "C003",
    ]);
  });

  test("custom limit caps results", async () => {
    const ctx = makeQueryCtx([
      clientFixture("C001"),
      clientFixture("C002"),
      clientFixture("C003"),
    ]);

    const result = await listCatalogHandler(ctx, {
      organizationId: ORG,
      query: "",
      limit: 2,
    });

    expect(result).toHaveLength(2);
  });
});
