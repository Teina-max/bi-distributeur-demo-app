/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { QueryCtx } from "@convex/_generated/server";
import {
  listByClientHandler,
  listHandler,
  listMessagesHandler,
} from "../queries";

const ORG = "toscana-beverages-demo";
const OTHER_ORG = "other-org";

const CLIENT_A = "c_a" as unknown as Id<"clients">;
const CLIENT_B = "c_b" as unknown as Id<"clients">;

type TicketSeed = {
  code: string;
  clientId: Id<"clients">;
  org?: string;
  status?: Doc<"support_tickets">["status"];
  category?: Doc<"support_tickets">["category"];
  priority?: Doc<"support_tickets">["priority"];
  creationTime?: number;
};

function ticketFixture(seed: TicketSeed): Doc<"support_tickets"> {
  return {
    _id: `t_${seed.code}` as unknown as Id<"support_tickets">,
    _creationTime: seed.creationTime ?? 1_700_000_000_000,
    organization_id: seed.org ?? ORG,
    client_id: seed.clientId,
    number: `T26-${seed.code}`,
    status: seed.status ?? "open",
    category: seed.category ?? "machine_panne",
    priority: seed.priority ?? "normal",
    title: `Ticket ${seed.code}`,
    description: "x",
    delivery_form_id: null,
    invoice_id: null,
    product_id: null,
    assigned_to: null,
    resolved_at: null,
    closed_at: null,
    created_by: "test",
  };
}

function clientFixture(id: Id<"clients">, org = ORG): Doc<"clients"> {
  return {
    _id: id,
    _creationTime: 1_700_000_000_000,
    organization_id: org,
    code: String(id).toUpperCase(),
    name: `Client ${String(id)}`,
    type: "horeca",
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
    search_tokens: [],
  };
}

function messageFixture(
  ticketId: Id<"support_tickets">,
  body: string,
  creationTime = 1_700_000_000_000,
): Doc<"ticket_messages"> {
  return {
    _id: `m_${body.slice(0, 4)}_${creationTime}` as unknown as Id<"ticket_messages">,
    _creationTime: creationTime,
    ticket_id: ticketId,
    author_email: "test@example.test",
    body,
  };
}

function makeQueryCtx({
  tickets,
  clients,
  messages,
}: {
  tickets: readonly Doc<"support_tickets">[];
  clients: readonly Doc<"clients">[];
  messages?: readonly Doc<"ticket_messages">[];
}): QueryCtx {
  const ticketMap = new Map<string, Doc<"support_tickets">>(
    tickets.map((t) => [String(t._id), t]),
  );
  const clientMap = new Map<string, Doc<"clients">>(
    clients.map((c) => [String(c._id), c]),
  );

  return {
    db: {
      get: vi.fn(async (id: unknown) => {
        const key = String(id);
        return ticketMap.get(key) ?? clientMap.get(key) ?? null;
      }),
      query: vi.fn((table: string) => {
        const rows: unknown[] =
          table === "support_tickets"
            ? tickets.slice()
            : table === "ticket_messages"
              ? (messages ?? []).slice()
              : [];
        let current = rows.slice();

        type IndexQ = { eq: (field: string, value: unknown) => IndexQ };

        const chain = {
          withIndex: (_name: string, builder: unknown) => {
            const captured: Record<string, unknown> = {};
            const q: IndexQ = {
              eq: (field, value) => {
                captured[field] = value;
                return q;
              },
            };
            (builder as (q: IndexQ) => unknown)(q);
            current = current.filter((row) => {
              for (const [k, v] of Object.entries(captured)) {
                if ((row as Record<string, unknown>)[k] !== v) return false;
              }
              return true;
            });
            return chain;
          },
          order: (dir: "asc" | "desc") => {
            current = current.slice().sort((a, b) => {
              const ta = (a as { _creationTime: number })._creationTime;
              const tb = (b as { _creationTime: number })._creationTime;
              return dir === "asc" ? ta - tb : tb - ta;
            });
            return chain;
          },
          take: async (n: number) => current.slice(0, n),
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

describe("listHandler support_tickets", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns max `limit` tickets desc creation for org", async () => {
    const tickets = [
      ticketFixture({ code: "0001", clientId: CLIENT_A, creationTime: 100 }),
      ticketFixture({ code: "0002", clientId: CLIENT_A, creationTime: 200 }),
      ticketFixture({ code: "0003", clientId: CLIENT_A, creationTime: 300 }),
    ];
    const ctx = makeQueryCtx({ tickets, clients: [clientFixture(CLIENT_A)] });

    const result = await listHandler(ctx, { organizationId: ORG, limit: 2 });

    expect(result).toHaveLength(2);
    expect(result[0]!.number).toBe("T26-0003");
    expect(result[1]!.number).toBe("T26-0002");
  });

  test("filters by status open via withIndex", async () => {
    const tickets = [
      ticketFixture({ code: "0001", clientId: CLIENT_A, status: "open" }),
      ticketFixture({
        code: "0002",
        clientId: CLIENT_A,
        status: "in_progress",
      }),
      ticketFixture({ code: "0003", clientId: CLIENT_A, status: "open" }),
    ];
    const ctx = makeQueryCtx({ tickets, clients: [clientFixture(CLIENT_A)] });

    const result = await listHandler(ctx, {
      organizationId: ORG,
      status: "open",
    });

    expect(result).toHaveLength(2);
    expect(result.every((row) => row.status === "open")).toBe(true);
  });

  test("cross-org: returns only own org tickets", async () => {
    const tickets = [
      ticketFixture({
        code: "A001",
        clientId: CLIENT_A,
        org: ORG,
        creationTime: 100,
      }),
      ticketFixture({
        code: "B001",
        clientId: CLIENT_B,
        org: OTHER_ORG,
        creationTime: 200,
      }),
      ticketFixture({
        code: "A002",
        clientId: CLIENT_A,
        org: ORG,
        creationTime: 300,
      }),
    ];
    const ctx = makeQueryCtx({
      tickets,
      clients: [clientFixture(CLIENT_A), clientFixture(CLIENT_B, OTHER_ORG)],
    });

    const result = await listHandler(ctx, { organizationId: ORG });

    expect(result.map((row) => row.number)).toEqual(["T26-A002", "T26-A001"]);
  });

  test("listByClient returns tickets for one client (cross-org check)", async () => {
    const tickets = [
      ticketFixture({
        code: "0001",
        clientId: CLIENT_A,
        creationTime: 100,
      }),
      ticketFixture({
        code: "0002",
        clientId: CLIENT_A,
        creationTime: 200,
      }),
      ticketFixture({ code: "0003", clientId: CLIENT_B, creationTime: 300 }),
    ];
    const ctx = makeQueryCtx({
      tickets,
      clients: [clientFixture(CLIENT_A), clientFixture(CLIENT_B)],
    });

    const result = await listByClientHandler(ctx, {
      organizationId: ORG,
      client_id: CLIENT_A,
    });

    expect(result).toHaveLength(2);
    expect(result[0]!.clientId).toBe(CLIENT_A);
  });

  test("listByClient: client cross-org -> empty array", async () => {
    const tickets = [ticketFixture({ code: "0001", clientId: CLIENT_A })];
    const ctx = makeQueryCtx({
      tickets,
      clients: [clientFixture(CLIENT_A, OTHER_ORG)],
    });

    const result = await listByClientHandler(ctx, {
      organizationId: ORG,
      client_id: CLIENT_A,
    });

    expect(result).toEqual([]);
  });

  test("listMessages returns messages for ticket (cross-org check)", async () => {
    const ticket = ticketFixture({ code: "0001", clientId: CLIENT_A });
    const messages = [
      messageFixture(ticket._id, "premier", 100),
      messageFixture(ticket._id, "second", 200),
    ];
    const ctx = makeQueryCtx({
      tickets: [ticket],
      clients: [clientFixture(CLIENT_A)],
      messages,
    });

    const result = await listMessagesHandler(ctx, {
      organizationId: ORG,
      ticket_id: ticket._id,
    });

    expect(result).toHaveLength(2);
    expect(result[0]!.body).toBe("premier");
    expect(result[1]!.body).toBe("second");
  });

  test("listMessages: ticket cross-org -> empty array", async () => {
    const ticket = ticketFixture({
      code: "0001",
      clientId: CLIENT_A,
      org: OTHER_ORG,
    });
    const messages = [messageFixture(ticket._id, "secret")];
    const ctx = makeQueryCtx({
      tickets: [ticket],
      clients: [clientFixture(CLIENT_A, OTHER_ORG)],
      messages,
    });

    const result = await listMessagesHandler(ctx, {
      organizationId: ORG,
      ticket_id: ticket._id,
    });

    expect(result).toEqual([]);
  });
});
