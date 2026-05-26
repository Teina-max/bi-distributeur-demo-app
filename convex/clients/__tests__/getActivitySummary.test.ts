import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { QueryCtx } from "@convex/_generated/server";
import { getActivitySummaryHandler } from "../queries";

const ORG = "toscana-beverages-demo";
const CLIENT_ID = "c_summary" as unknown as Id<"clients">;
type ActivityRow =
  | Doc<"quotations">
  | Doc<"delivery_forms">
  | Doc<"invoices">;

function clientFixture(): Doc<"clients"> {
  return {
    _id: CLIENT_ID,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    code: "CLI-001",
    name: "BISTROT DU PORT",
    type: "horeca",
    email: null,
    phone: null,
    address: { street: "", postal_code: "", city: "Nice", country: "FR" },
    payment_terms_days: 30,
    payment_terms_label: "30 jours",
    search_tokens: ["bar", "port"],
  };
}

function quotationFixture(status: Doc<"quotations">["status"]): Doc<"quotations"> {
  return {
    _id: `q_${status}` as unknown as Id<"quotations">,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    client_id: CLIENT_ID,
    number: `D26-${status}`,
    status,
    lines: [],
    total_ht: 100,
    total_vat: 20,
    total_ttc: 120,
    created_by: "operator",
  };
}

function deliveryFormFixture(
  status: Doc<"delivery_forms">["status"],
): Doc<"delivery_forms"> {
  return {
    _id: `df_${status}` as unknown as Id<"delivery_forms">,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    quotation_id: null,
    client_id: CLIENT_ID,
    number: `B26-${status}`,
    status,
    lines: [],
    total_ht: 100,
    total_ttc: 120,
    delivered_at: null,
    created_by: "operator",
  };
}

function invoiceFixture(
  status: Doc<"invoices">["status"],
  totalHt: number,
): Doc<"invoices"> {
  return {
    _id: `inv_${status}_${totalHt}` as unknown as Id<"invoices">,
    _creationTime: 1_700_000_000_000,
    organization_id: ORG,
    delivery_form_ids: [],
    client_id: CLIENT_ID,
    number: `F26-${status}`,
    status,
    total_ht: totalHt,
    total_ttc: totalHt * 1.2,
    due_date: 1_700_100_000_000,
    sent_at: null,
  };
}

function makeQueryCtx({
  quotations,
  deliveryForms,
  invoices,
}: {
  quotations: readonly Doc<"quotations">[];
  deliveryForms: readonly Doc<"delivery_forms">[];
  invoices: readonly Doc<"invoices">[];
}): QueryCtx {
  const client = clientFixture();
  const byTable = {
    quotations,
    delivery_forms: deliveryForms,
    invoices,
  };

  return {
    db: {
      get: vi.fn(async (id: unknown) =>
        String(id) === String(client._id) ? client : null,
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
          order: () => chain,
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

describe("getActivitySummaryHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  test("computes totalRevenueHt from sent+paid and pendingRevenueHt from draft+overdue", async () => {
    const ctx = makeQueryCtx({
      quotations: [],
      deliveryForms: [],
      invoices: [
        invoiceFixture("sent", 100),
        invoiceFixture("paid", 200),
        invoiceFixture("draft", 50),
        invoiceFixture("overdue", 70),
      ],
    });

    const result = await getActivitySummaryHandler(ctx, {
      organizationId: ORG,
      id: CLIENT_ID,
    });

    expect(result?.totalRevenueHt).toBe(300);
    expect(result?.pendingRevenueHt).toBe(120);
  });

  test("returns coherent countByStatus maps", async () => {
    const ctx = makeQueryCtx({
      quotations: [
        quotationFixture("draft"),
        quotationFixture("sent"),
        quotationFixture("sent"),
      ],
      deliveryForms: [
        deliveryFormFixture("delivered"),
        deliveryFormFixture("invoiced"),
        deliveryFormFixture("cancelled"),
      ],
      invoices: [
        invoiceFixture("sent", 100),
        invoiceFixture("paid", 200),
        invoiceFixture("cancelled", 30),
      ],
    });

    const result = await getActivitySummaryHandler(ctx, {
      organizationId: ORG,
      id: CLIENT_ID,
    });

    expect(result?.countQuotations).toMatchObject({ draft: 1, sent: 2 });
    expect(result?.countDeliveryForms).toMatchObject({
      delivered: 1,
      invoiced: 1,
      cancelled: 1,
    });
    expect(result?.countInvoices).toMatchObject({
      sent: 1,
      paid: 1,
      cancelled: 1,
    });
  });
});
