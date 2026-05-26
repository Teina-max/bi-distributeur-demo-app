import { beforeEach, describe, expect, test, vi } from "vitest";
import type { MutationCtx } from "@convex/_generated/server";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { archiveClientHandler, updateClientHandler } from "../mutations";

const ORG = "toscana-beverages-demo";

type WriteOp = { table: "clients"; id: string; data: unknown };

function makeFixtureDb({ clients }: { clients: readonly Doc<"clients">[] }) {
  const clientMap = new Map(clients.map((c) => [String(c._id), c]));
  const writes: WriteOp[] = [];

  const ctx = {
    db: {
      get: vi.fn(async (id: unknown) => {
        const c = clientMap.get(String(id));
        if (c) return c;
        return null;
      }),
      patch: vi.fn(async (id: unknown, data: unknown) => {
        writes.push({ table: "clients", id: String(id), data });
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

function clientFixture(
  code: string,
  override: Partial<Doc<"clients">> = {},
): Doc<"clients"> {
  return {
    _id: `c_${code}` as unknown as Id<"clients">,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    code,
    name: `${code} name`,
    type: "pro",
    email: null,
    phone: null,
    address: {
      street: "",
      postal_code: "",
      city: "",
      country: "FR",
    },
    payment_terms_days: 30,
    payment_terms_label: "30j",
    search_tokens: ["init"],
    ...override,
  };
}

describe("updateClientHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("patches intermediaries (correspondent, vendor, sector) together", async () => {
    const client = clientFixture("CLI-001");
    const { ctx, writes } = makeFixtureDb({ clients: [client] });

    await updateClientHandler(ctx, {
      organizationId: ORG,
      id: client._id,
      patch: {
        correspondent: "Marc Dupont",
        vendor: "Marco",
        sector: "Nice Centre",
      },
    });

    expect(writes).toHaveLength(1);
    const data = (writes[0] as { data: Record<string, unknown> }).data;
    expect(data.correspondent).toBe("Marc Dupont");
    expect(data.vendor).toBe("Marco");
    expect(data.sector).toBe("Nice Centre");
  });

  test("rebuilds search_tokens when name changes", async () => {
    const client = clientFixture("CLI-001", {
      name: "Old Name",
      search_tokens: ["old", "name", "cli-001"],
    });
    const { ctx, writes } = makeFixtureDb({ clients: [client] });

    await updateClientHandler(ctx, {
      organizationId: ORG,
      id: client._id,
      patch: { name: "Hotel Paradiso" },
    });

    expect(writes).toHaveLength(1);
    const data = (writes[0] as { data: Record<string, unknown> }).data;
    const tokens = data.search_tokens as string[];
    expect(tokens).toContain("paradiso");
    expect(tokens).toContain("hotel");
    expect(tokens).toContain("cli-001");
  });

  test("patches payment_terms_days + payment_terms_label", async () => {
    const client = clientFixture("CLI-001", {
      payment_terms_days: 30,
      payment_terms_label: "30j",
    });
    const { ctx, writes } = makeFixtureDb({ clients: [client] });

    await updateClientHandler(ctx, {
      organizationId: ORG,
      id: client._id,
      patch: {
        payment_terms_days: 60,
        payment_terms_label: "60j fin mois",
      },
    });

    expect(writes).toHaveLength(1);
    const data = (writes[0] as { data: Record<string, unknown> }).data;
    expect(data.payment_terms_days).toBe(60);
    expect(data.payment_terms_label).toBe("60j fin mois");
  });

  test("refuses cross-org (throws 'Client introuvable')", async () => {
    const client = clientFixture("CLI-001", {
      organization_id: "other-org",
    });
    const { ctx, writes } = makeFixtureDb({ clients: [client] });

    await expect(
      updateClientHandler(ctx, {
        organizationId: ORG,
        id: client._id,
        patch: { vendor: "Marco" },
      }),
    ).rejects.toThrow("Client introuvable");

    expect(writes).toEqual([]);
  });
});

describe("archiveClientHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("patches is_visible false", async () => {
    const client = clientFixture("CLI-001", { is_visible: true });
    const { ctx, writes } = makeFixtureDb({ clients: [client] });

    await archiveClientHandler(ctx, {
      organizationId: ORG,
      id: client._id,
    });

    expect(writes).toHaveLength(1);
    const data = (writes[0] as { data: Record<string, unknown> }).data;
    expect(data.is_visible).toBe(false);
  });

  test("refuses cross-org (throws 'Client introuvable')", async () => {
    const client = clientFixture("CLI-001", {
      organization_id: "other-org",
    });
    const { ctx, writes } = makeFixtureDb({ clients: [client] });

    await expect(
      archiveClientHandler(ctx, {
        organizationId: ORG,
        id: client._id,
      }),
    ).rejects.toThrow("Client introuvable");

    expect(writes).toEqual([]);
  });
});
