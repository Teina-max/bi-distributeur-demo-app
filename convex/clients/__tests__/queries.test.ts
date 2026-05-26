import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { QueryCtx } from "@convex/_generated/server";
import { listCatalogHandler } from "../queries";

const ORG = "toscana-beverages-demo";

function clientFixture(
  code: string,
  overrides: Partial<Doc<"clients">> = {},
): Doc<"clients"> {
  return {
    _id: `c_${code}` as unknown as Id<"clients">,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    code,
    name: `Client ${code}`,
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
    search_tokens: [code.toLowerCase(), "client"],
    ...overrides,
  };
}

type IndexCall = { name: string };

function makeQueryCtx(clients: readonly Doc<"clients">[]): {
  ctx: QueryCtx;
  indexCalls: IndexCall[];
  takeCalls: number[];
} {
  const indexCalls: IndexCall[] = [];
  const takeCalls: number[] = [];

  const ctx = {
    db: {
      get: vi.fn(),
      query: vi.fn((_table: "clients") => {
        let rows = clients.slice();
        const chain = {
          withIndex: (name: string, builder: unknown) => {
            indexCalls.push({ name });
            const captured: { organizationId?: string } = {};
            type IndexQ = {
              eq: (field: string, value: string) => IndexQ;
            };
            const q: IndexQ = {
              eq: (field, value) => {
                if (field === "organization_id")
                  captured.organizationId = value;
                return q;
              },
            };
            (builder as (q: IndexQ) => unknown)(q);
            rows = rows.filter(
              (row) => row.organization_id === captured.organizationId,
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
                if (field === "organization_id")
                  captured.organizationId = value;
                return q;
              },
            };
            (builder as (q: SearchQ) => unknown)(q);
            rows = rows.filter(
              (row) =>
                row.organization_id === captured.organizationId &&
                row.search_tokens.some((token) =>
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
          take: async (n: number) => {
            takeCalls.push(n);
            return rows.slice(0, n);
          },
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

  return { ctx, indexCalls, takeCalls };
}

describe("listCatalogHandler (clients) — visible vs hidden", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns only is_visible !== false rows by default", async () => {
    const { ctx, takeCalls } = makeQueryCtx([
      clientFixture("VIS-1", { is_visible: true }),
      clientFixture("VIS-2", { is_visible: true }),
      clientFixture("HID-1", { is_visible: false }),
      clientFixture("HID-2", { is_visible: false }),
    ]);

    const result = await listCatalogHandler(ctx, {
      organizationId: ORG,
      limit: 50,
    });

    expect(result.map((row) => row.code).sort()).toEqual(["VIS-1", "VIS-2"]);
    // Fetch budget must be limit*2 (capped at 200) when filtering for visibility.
    expect(takeCalls[0]).toBe(100);
  });

  test("treats absence of is_visible (legacy clients) as visible", async () => {
    const legacy = clientFixture("LEG-1");
    delete (legacy as Partial<Doc<"clients">>).is_visible;
    const visible = clientFixture("VIS-1", { is_visible: true });
    const hidden = clientFixture("HID-1", { is_visible: false });

    const { ctx } = makeQueryCtx([legacy, visible, hidden]);

    const result = await listCatalogHandler(ctx, {
      organizationId: ORG,
      limit: 50,
    });

    expect(result.map((row) => row.code).sort()).toEqual(["LEG-1", "VIS-1"]);
  });

  test("include_hidden:true returns both visible and hidden", async () => {
    const { ctx, takeCalls } = makeQueryCtx([
      clientFixture("VIS-1", { is_visible: true }),
      clientFixture("HID-1", { is_visible: false }),
    ]);

    const result = await listCatalogHandler(ctx, {
      organizationId: ORG,
      limit: 50,
      include_hidden: true,
    });

    expect(result.map((row) => row.code).sort()).toEqual(["HID-1", "VIS-1"]);
    // With include_hidden, fetch budget should equal limit (no overshoot).
    expect(takeCalls[0]).toBe(50);
  });

  test("fetch budget is capped at 200 even with large limit", async () => {
    const { ctx, takeCalls } = makeQueryCtx([clientFixture("C001")]);

    await listCatalogHandler(ctx, {
      organizationId: ORG,
      limit: 500,
    });

    // limit * 2 would be 1000, but the cap is 200.
    expect(takeCalls[0]).toBe(200);
  });

  test("search query path also applies visibility filter", async () => {
    const { ctx } = makeQueryCtx([
      clientFixture("VIS-1", {
        is_visible: true,
        search_tokens: ["bar", "port"],
      }),
      clientFixture("HID-1", {
        is_visible: false,
        search_tokens: ["bar", "old"],
      }),
    ]);

    const result = await listCatalogHandler(ctx, {
      organizationId: ORG,
      query: "bar",
      limit: 50,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.code).toBe("VIS-1");
  });
});
