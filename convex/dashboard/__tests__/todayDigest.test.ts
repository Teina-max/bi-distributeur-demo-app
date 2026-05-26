import { describe, expect, test, vi } from "vitest";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { todayDigestHandler } from "../queries";
import { startOfDayParis } from "../utils";

const ORG_A = "toscana-beverages-demo";
const ORG_B = "other-org";

// Reference "now" — 2026-05-18 14:00 Paris (12:00 UTC).
const NOW = Date.UTC(2026, 4, 18, 12, 0, 0);
const TODAY_START = startOfDayParis(NOW); // 2026-05-17 22:00 UTC
const YESTERDAY = TODAY_START - 5 * 3600 * 1000; // well before today

function clientFixture(
  id: string,
  code: string,
  name: string,
  organizationId = ORG_A,
): Doc<"clients"> {
  return {
    _id: id as unknown as Id<"clients">,
    _creationTime: TODAY_START - 86_400_000,
    organization_id: organizationId,
    code,
    name,
    email: null,
    phone: null,
    search_tokens: [],
    address: { line1: "", line2: null, postal_code: "", city: "", country: "" },
  } as unknown as Doc<"clients">;
}

function quotationFixture(
  id: string,
  clientId: string,
  createdAt: number,
  organizationId = ORG_A,
  status: Doc<"quotations">["status"] = "draft",
): Doc<"quotations"> {
  return {
    _id: id as unknown as Id<"quotations">,
    _creationTime: createdAt,
    organization_id: organizationId,
    client_id: clientId as unknown as Id<"clients">,
    number: id.toUpperCase(),
    status,
    lines: [],
    total_ht: 100,
    total_vat: 20,
    total_ttc: 120,
    created_by: "u_1",
  } as unknown as Doc<"quotations">;
}

function deliveryFixture(
  id: string,
  clientId: string,
  createdAt: number,
  organizationId = ORG_A,
  status: Doc<"delivery_forms">["status"] = "delivered",
): Doc<"delivery_forms"> {
  return {
    _id: id as unknown as Id<"delivery_forms">,
    _creationTime: createdAt,
    organization_id: organizationId,
    client_id: clientId as unknown as Id<"clients">,
    quotation_id: null,
    number: id.toUpperCase(),
    status,
    lines: [],
    total_ht: 50,
    total_ttc: 60,
    delivered_at: createdAt,
    created_by: "u_1",
  } as unknown as Doc<"delivery_forms">;
}

function invoiceFixture(
  id: string,
  clientId: string,
  createdAt: number,
  organizationId = ORG_A,
  status: Doc<"invoices">["status"] = "sent",
): Doc<"invoices"> {
  return {
    _id: id as unknown as Id<"invoices">,
    _creationTime: createdAt,
    organization_id: organizationId,
    client_id: clientId as unknown as Id<"clients">,
    delivery_form_ids: ["df_x" as unknown as Id<"delivery_forms">],
    number: id.toUpperCase(),
    status,
    total_ht: 200,
    total_ttc: 240,
    due_date: createdAt + 30 * 86_400_000,
    sent_at: createdAt,
  } as unknown as Doc<"invoices">;
}

function makeDb(data: {
  quotations: Doc<"quotations">[];
  delivery_forms: Doc<"delivery_forms">[];
  invoices: Doc<"invoices">[];
  clients: Doc<"clients">[];
}) {
  const tableMap = {
    quotations: data.quotations,
    delivery_forms: data.delivery_forms,
    invoices: data.invoices,
  } as const;

  const buildQuery = (
    rows: readonly Doc<"quotations" | "delivery_forms" | "invoices">[],
  ) => {
    let filtered: readonly Doc<"quotations" | "delivery_forms" | "invoices">[] =
      rows;
    const chain: Record<string, unknown> = {};
    chain.withIndex = (
      _indexName: string,
      qFn: (q: { eq: (field: string, value: unknown) => unknown }) => {
        __orgId: string;
      },
    ) => {
      const captured = qFn({
        eq: (field: string, value: unknown) => ({ __orgId: String(value) }),
      });
      filtered = filtered.filter((r) => r.organization_id === captured.__orgId);
      return chain;
    };
    chain.order = (_dir: "asc" | "desc") => {
      filtered = [...filtered].sort(
        (a, b) => b._creationTime - a._creationTime,
      );
      return chain;
    };
    chain.take = async (n: number) => filtered.slice(0, n);
    return chain;
  };

  const clientsById = new Map(
    data.clients.map((c) => [String(c._id), c] as const),
  );

  return {
    query: vi.fn((table: string) => {
      const rows = tableMap[table as keyof typeof tableMap];
      return buildQuery(rows);
    }) as unknown as Parameters<typeof todayDigestHandler>[0]["query"],
    get: vi.fn(async (id: unknown) => {
      return clientsById.get(String(id)) ?? null;
    }) as unknown as Parameters<typeof todayDigestHandler>[0]["get"],
  };
}

describe("todayDigestHandler", () => {
  test("returns docs created today, ordered desc, with client join", async () => {
    const c1 = clientFixture("c1", "CLI-001", "Café A");
    const c2 = clientFixture("c2", "CLI-002", "Café B");
    const q1 = quotationFixture("q1", "c1", TODAY_START + 1000);
    const q2 = quotationFixture("q2", "c2", TODAY_START + 5000);
    const db = makeDb({
      quotations: [q1, q2],
      delivery_forms: [],
      invoices: [],
      clients: [c1, c2],
    });

    const result = await todayDigestHandler(db, ORG_A, NOW);

    expect(result.quotations).toHaveLength(2);
    // Desc order: q2 (newer) first
    expect(result.quotations[0].number).toBe("Q2");
    expect(result.quotations[0].clientCode).toBe("CLI-002");
    expect(result.quotations[1].number).toBe("Q1");
    expect(result.deliveryForms).toEqual([]);
    expect(result.invoices).toEqual([]);
  });

  test("filters out docs created before today (Paris start of day)", async () => {
    const c1 = clientFixture("c1", "CLI-001", "Café A");
    const today = quotationFixture("today", "c1", TODAY_START + 1000);
    const old = quotationFixture("old", "c1", YESTERDAY);
    const db = makeDb({
      quotations: [today, old],
      delivery_forms: [],
      invoices: [],
      clients: [c1],
    });

    const result = await todayDigestHandler(db, ORG_A, NOW);

    expect(result.quotations).toHaveLength(1);
    expect(result.quotations[0].number).toBe("TODAY");
  });

  test("isolates results by organization_id", async () => {
    const c1 = clientFixture("c1", "CLI-001", "Café A", ORG_A);
    const c2 = clientFixture("c2", "CLI-OTHER", "Other", ORG_B);
    const qA = quotationFixture("qA", "c1", TODAY_START + 1000, ORG_A);
    const qB = quotationFixture("qB", "c2", TODAY_START + 1000, ORG_B);
    const db = makeDb({
      quotations: [qA, qB],
      delivery_forms: [],
      invoices: [],
      clients: [c1, c2],
    });

    const result = await todayDigestHandler(db, ORG_A, NOW);

    expect(result.quotations).toHaveLength(1);
    expect(result.quotations[0].number).toBe("QA");
  });

  test("returns empty arrays when no data", async () => {
    const db = makeDb({
      quotations: [],
      delivery_forms: [],
      invoices: [],
      clients: [],
    });

    const result = await todayDigestHandler(db, ORG_A, NOW);

    expect(result).toEqual({
      quotations: [],
      deliveryForms: [],
      invoices: [],
    });
  });

  test("aggregates all three tables in a single call", async () => {
    const c1 = clientFixture("c1", "CLI-001", "Café A");
    const db = makeDb({
      quotations: [quotationFixture("q1", "c1", TODAY_START + 1000)],
      delivery_forms: [
        deliveryFixture("d1", "c1", TODAY_START + 2000),
        deliveryFixture("d2", "c1", TODAY_START + 3000),
      ],
      invoices: [invoiceFixture("i1", "c1", TODAY_START + 4000)],
      clients: [c1],
    });

    const result = await todayDigestHandler(db, ORG_A, NOW);

    expect(result.quotations).toHaveLength(1);
    expect(result.deliveryForms).toHaveLength(2);
    expect(result.invoices).toHaveLength(1);
    // DTO shape sanity check
    expect(result.invoices[0]).toMatchObject({
      number: "I1",
      clientCode: "CLI-001",
      clientName: "Café A",
      totalTTC: 240,
      status: "sent",
    });
  });

  test("skips rows whose client is missing (defensive)", async () => {
    const q1 = quotationFixture("q1", "ghost", TODAY_START + 1000);
    const db = makeDb({
      quotations: [q1],
      delivery_forms: [],
      invoices: [],
      clients: [], // no client matching "ghost"
    });

    const result = await todayDigestHandler(db, ORG_A, NOW);
    expect(result.quotations).toEqual([]);
  });
});
