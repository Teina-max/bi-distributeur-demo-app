import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { MutationCtx } from "@convex/_generated/server";
import {
  addMessageHandler,
  assignHandler,
  closeHandler,
  reopenHandler,
  updateStatusHandler,
} from "../mutations";

const ORG = "toscana-beverages-demo";
const OTHER_ORG = "other-org";
const TICKET_ID = "t_lifecycle" as unknown as Id<"support_tickets">;
const CLIENT_ID = "c_lifecycle" as unknown as Id<"clients">;

type PatchOp = {
  op: "patch";
  id: string;
  data: Record<string, unknown>;
};
type InsertOp = {
  op: "insert";
  table: string;
  data: Record<string, unknown>;
};
type WriteOp = PatchOp | InsertOp;

function ticketFixture(
  overrides: Partial<Doc<"support_tickets">> = {},
): Doc<"support_tickets"> {
  return {
    _id: TICKET_ID,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    client_id: CLIENT_ID,
    number: "T26-0001",
    status: "open",
    category: "machine_panne",
    priority: "normal",
    title: "Cafetière HS",
    description: "panne",
    delivery_form_id: null,
    invoice_id: null,
    product_id: null,
    assigned_to: null,
    resolved_at: null,
    closed_at: null,
    created_by: "operator",
    ...overrides,
  };
}

function makeCtx(ticket: Doc<"support_tickets"> | null) {
  const writes: WriteOp[] = [];
  const insertId = "m_inserted" as unknown as Id<"ticket_messages">;

  const ctx = {
    db: {
      get: vi.fn(async (id: unknown) => {
        if (ticket && String(id) === String(ticket._id)) return ticket;
        return null;
      }),
      patch: vi.fn(async (id: unknown, data: unknown) => {
        writes.push({
          op: "patch",
          id: String(id),
          data: data as Record<string, unknown>,
        });
      }),
      insert: vi.fn(async (table: unknown, data: unknown) => {
        writes.push({
          op: "insert",
          table: String(table),
          data: data as Record<string, unknown>,
        });
        return insertId;
      }),
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

describe("updateStatusHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  test("open -> in_progress patches status only", async () => {
    const { ctx, writes } = makeCtx(ticketFixture({ status: "open" }));

    await updateStatusHandler(ctx, {
      organizationId: ORG,
      id: TICKET_ID,
      status: "in_progress",
    });

    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      op: "patch",
      id: String(TICKET_ID),
      data: { status: "in_progress" },
    });
    expect((writes[0] as PatchOp).data.resolved_at).toBeUndefined();
  });

  test("-> resolved sets resolved_at when null", async () => {
    const { ctx, writes } = makeCtx(
      ticketFixture({ status: "in_progress", resolved_at: null }),
    );

    await updateStatusHandler(ctx, {
      organizationId: ORG,
      id: TICKET_ID,
      status: "resolved",
    });

    const patch = writes[0] as PatchOp;
    expect(patch.data.status).toBe("resolved");
    expect(typeof patch.data.resolved_at).toBe("number");
  });

  test("closed ticket -> throws 'Ticket clôturé — réouvrir d'abord'", async () => {
    const { ctx, writes } = makeCtx(ticketFixture({ status: "closed" }));

    await expect(
      updateStatusHandler(ctx, {
        organizationId: ORG,
        id: TICKET_ID,
        status: "open",
      }),
    ).rejects.toThrow("Ticket clôturé — réouvrir d'abord");

    expect(writes).toEqual([]);
  });

  test("cross-org -> throws 'Ticket introuvable', zero write", async () => {
    const { ctx, writes } = makeCtx(
      ticketFixture({ organization_id: OTHER_ORG }),
    );

    await expect(
      updateStatusHandler(ctx, {
        organizationId: ORG,
        id: TICKET_ID,
        status: "open",
      }),
    ).rejects.toThrow("Ticket introuvable");

    expect(writes).toEqual([]);
  });
});

describe("addMessageHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  test("happy path inserts ticket_messages", async () => {
    const { ctx, writes } = makeCtx(ticketFixture());

    await addMessageHandler(ctx, {
      organizationId: ORG,
      id: TICKET_ID,
      body: "Client rappelle demain matin",
      author_email: "op@example.test",
    });

    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      op: "insert",
      table: "ticket_messages",
    });
    const data = (writes[0] as InsertOp).data;
    expect(data.ticket_id).toBe(TICKET_ID);
    expect(data.author_email).toBe("op@example.test");
    expect(data.body).toBe("Client rappelle demain matin");
  });

  test("body empty -> throws 'Message vide'", async () => {
    const { ctx, writes } = makeCtx(ticketFixture());

    await expect(
      addMessageHandler(ctx, {
        organizationId: ORG,
        id: TICKET_ID,
        body: "   \n\t  ",
        author_email: "op",
      }),
    ).rejects.toThrow("Message vide");

    expect(writes).toEqual([]);
  });

  test("ticket closed -> throws 'Ticket clôturé — réouvrir d'abord'", async () => {
    const { ctx, writes } = makeCtx(ticketFixture({ status: "closed" }));

    await expect(
      addMessageHandler(ctx, {
        organizationId: ORG,
        id: TICKET_ID,
        body: "ok",
        author_email: "op",
      }),
    ).rejects.toThrow("Ticket clôturé — réouvrir d'abord");

    expect(writes).toEqual([]);
  });
});

describe("closeHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  test("happy path : patches closed + closed_at", async () => {
    const { ctx, writes } = makeCtx(ticketFixture({ status: "resolved" }));

    await closeHandler(ctx, { organizationId: ORG, id: TICKET_ID });

    expect(writes).toHaveLength(1);
    const patch = writes[0] as PatchOp;
    expect(patch.data.status).toBe("closed");
    expect(typeof patch.data.closed_at).toBe("number");
  });

  test("already closed -> throws 'Ticket déjà clôturé', zero write", async () => {
    const { ctx, writes } = makeCtx(ticketFixture({ status: "closed" }));

    await expect(
      closeHandler(ctx, { organizationId: ORG, id: TICKET_ID }),
    ).rejects.toThrow("Ticket déjà clôturé");

    expect(writes).toEqual([]);
  });
});

describe("reopenHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  test("happy path : patches open + closed_at null + inserts system message", async () => {
    const { ctx, writes } = makeCtx(
      ticketFixture({ status: "closed", closed_at: 1_700_000_000_000 }),
    );

    await reopenHandler(ctx, {
      organizationId: ORG,
      id: TICKET_ID,
      author_email: "marco@toscana.local",
    });

    expect(writes).toHaveLength(2);
    const patch = writes[0] as PatchOp;
    expect(patch.data.status).toBe("open");
    expect(patch.data.closed_at).toBeNull();
    const insert = writes[1] as InsertOp;
    expect(insert.table).toBe("ticket_messages");
    expect(insert.data.body).toBe(
      "Ticket réouvert par marco@toscana.local.",
    );
  });

  test("non-closed -> throws 'Ticket non clôturé', zero write", async () => {
    const { ctx, writes } = makeCtx(ticketFixture({ status: "open" }));

    await expect(
      reopenHandler(ctx, {
        organizationId: ORG,
        id: TICKET_ID,
        author_email: "op",
      }),
    ).rejects.toThrow("Ticket non clôturé");

    expect(writes).toEqual([]);
  });
});

describe("assignHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  test("happy path assigns + désassigne via null", async () => {
    const { ctx, writes } = makeCtx(ticketFixture());

    await assignHandler(ctx, {
      organizationId: ORG,
      id: TICKET_ID,
      assigned_to: "marco@toscana.local",
    });
    const patch1 = writes[0] as PatchOp;
    expect(patch1.data.assigned_to).toBe("marco@toscana.local");

    await assignHandler(ctx, {
      organizationId: ORG,
      id: TICKET_ID,
      assigned_to: null,
    });
    const patch2 = writes[1] as PatchOp;
    expect(patch2.data.assigned_to).toBeNull();
  });

  test("cross-org -> throws 'Ticket introuvable', zero write", async () => {
    const { ctx, writes } = makeCtx(
      ticketFixture({ organization_id: OTHER_ORG }),
    );

    await expect(
      assignHandler(ctx, {
        organizationId: ORG,
        id: TICKET_ID,
        assigned_to: "x",
      }),
    ).rejects.toThrow("Ticket introuvable");

    expect(writes).toEqual([]);
  });

  test("ticket closed -> throws 'Ticket clôturé', zero write", async () => {
    const { ctx, writes } = makeCtx(ticketFixture({ status: "closed" }));

    await expect(
      assignHandler(ctx, {
        organizationId: ORG,
        id: TICKET_ID,
        assigned_to: "x",
      }),
    ).rejects.toThrow("Ticket clôturé");

    expect(writes).toEqual([]);
  });
});
