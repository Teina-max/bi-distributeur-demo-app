import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { QueryCtx } from "@convex/_generated/server";
import { listCatalogHandler } from "../queries";

const ORG = "toscana-beverages-demo";

function productFixture(
  code: string,
  overrides: Partial<Doc<"products">> = {},
): Doc<"products"> {
  return {
    _id: `p_${code}` as unknown as Id<"products">,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    code,
    name: `Product ${code}`,
    description: "",
    category: "test",
    price_ht: 10,
    vat_rate: 20,
    stock_qty: 5,
    stock_threshold: null,
    is_active: true,
    search_tokens: [code.toLowerCase(), "product"],
    ...overrides,
  };
}

type IndexCall = { name: string };

type SearchCall = {
  name: string;
  filters: Record<string, unknown>;
  query: string;
};

function makeQueryCtx(products: readonly Doc<"products">[]): {
  ctx: QueryCtx;
  indexCalls: IndexCall[];
  searchCalls: SearchCall[];
} {
  const indexCalls: IndexCall[] = [];
  const searchCalls: SearchCall[] = [];

  const ctx = {
    db: {
      get: vi.fn(),
      query: vi.fn((_table: "products") => {
        let rows = products.slice();
        const chain = {
          withIndex: (name: string, builder: unknown) => {
            indexCalls.push({ name });
            const captured: {
              organizationId?: string;
              isActive?: boolean;
            } = {};
            type IndexQ = {
              eq: (field: string, value: unknown) => IndexQ;
            };
            const q: IndexQ = {
              eq: (field, value) => {
                if (field === "organization_id")
                  captured.organizationId = value as string;
                if (field === "is_active") captured.isActive = value as boolean;
                return q;
              },
            };
            (builder as (q: IndexQ) => unknown)(q);
            rows = rows.filter(
              (row) =>
                row.organization_id === captured.organizationId &&
                (captured.isActive === undefined ||
                  row.is_active === captured.isActive),
            );
            return chain;
          },
          withSearchIndex: (name: string, builder: unknown) => {
            const filters: Record<string, unknown> = {};
            let queryText = "";
            type SearchQ = {
              search: (field: string, value: string) => SearchQ;
              eq: (field: string, value: unknown) => SearchQ;
            };
            const q: SearchQ = {
              search: (_field, value) => {
                queryText = value.toLowerCase();
                return q;
              },
              eq: (field, value) => {
                filters[field] = value;
                return q;
              },
            };
            (builder as (q: SearchQ) => unknown)(q);
            searchCalls.push({ name, filters, query: queryText });
            rows = rows.filter((row) => {
              if (filters.organization_id !== row.organization_id) return false;
              if (
                filters.is_active !== undefined &&
                row.is_active !== filters.is_active
              )
                return false;
              return row.search_tokens.some((token) =>
                token.includes(queryText),
              );
            });
            return chain;
          },
          order: (_dir: "asc" | "desc") => chain,
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

  return { ctx, indexCalls, searchCalls };
}

describe("listCatalogHandler (products) — active vs inactive", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns only is_active:true rows by default (empty query)", async () => {
    const { ctx, indexCalls } = makeQueryCtx([
      productFixture("ACT-1", { is_active: true }),
      productFixture("ACT-2", { is_active: true }),
      productFixture("OFF-1", { is_active: false }),
      productFixture("OFF-2", { is_active: false }),
    ]);

    const result = await listCatalogHandler(ctx, {
      organizationId: ORG,
      limit: 50,
    });

    expect(result).toHaveLength(2);
    expect(result.every((row) => row.isActive === true)).toBe(true);
    // Default branch must use the active-aware index.
    expect(indexCalls.map((call) => call.name)).toContain(
      "by_organization_and_active",
    );
  });

  test("include_inactive:true returns both active and inactive (empty query)", async () => {
    const { ctx, indexCalls } = makeQueryCtx([
      productFixture("ACT-1", { is_active: true }),
      productFixture("OFF-1", { is_active: false }),
    ]);

    const result = await listCatalogHandler(ctx, {
      organizationId: ORG,
      limit: 50,
      include_inactive: true,
    });

    expect(result).toHaveLength(2);
    // include_inactive must use the org-only index, not the active-aware one.
    expect(indexCalls.map((call) => call.name)).toContain("by_organization");
    expect(indexCalls.map((call) => call.name)).not.toContain(
      "by_organization_and_active",
    );
  });

  test("search + default applies is_active filter on the search index", async () => {
    const { ctx, searchCalls } = makeQueryCtx([
      productFixture("ACT-1", {
        is_active: true,
        search_tokens: ["caf", "premium"],
      }),
      productFixture("OFF-1", {
        is_active: false,
        search_tokens: ["caf", "old"],
      }),
    ]);

    const result = await listCatalogHandler(ctx, {
      organizationId: ORG,
      query: "caf",
      limit: 50,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.isActive).toBe(true);
    expect(searchCalls).toHaveLength(1);
    expect(searchCalls[0]?.filters.is_active).toBe(true);
  });

  test("search + include_inactive:true omits is_active filter on the search index", async () => {
    const { ctx, searchCalls } = makeQueryCtx([
      productFixture("ACT-1", {
        is_active: true,
        search_tokens: ["caf", "premium"],
      }),
      productFixture("OFF-1", {
        is_active: false,
        search_tokens: ["caf", "old"],
      }),
    ]);

    const result = await listCatalogHandler(ctx, {
      organizationId: ORG,
      query: "caf",
      limit: 50,
      include_inactive: true,
    });

    expect(result).toHaveLength(2);
    expect(searchCalls).toHaveLength(1);
    expect(searchCalls[0]?.filters.is_active).toBeUndefined();
  });
});
