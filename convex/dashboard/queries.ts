import type { Doc } from "@convex/_generated/dataModel";
import type { QueryCtx } from "@convex/_generated/server";
import { orgQuery } from "@convex/auth/functions";
import {
  toDashboardDeliveryFormRowDto,
  toDashboardInvoiceRowDto,
  toDashboardQuotationRowDto,
  type DashboardTodayDigestDto,
} from "./dto/todayDigest";
import { startOfDayParis } from "./utils";

const RECENT_LIMIT = 50;

type DbLike = {
  query: QueryCtx["db"]["query"];
  get: QueryCtx["db"]["get"];
};

async function takeTodayQuotations(
  db: DbLike,
  organizationId: string,
  startTs: number,
): Promise<Doc<"quotations">[]> {
  const rows = await db
    .query("quotations")
    .withIndex("by_organization_and_creation", (q) =>
      q.eq("organization_id", organizationId),
    )
    .order("desc")
    .take(RECENT_LIMIT);
  return rows.filter((r) => r._creationTime >= startTs);
}

async function takeTodayDeliveryForms(
  db: DbLike,
  organizationId: string,
  startTs: number,
): Promise<Doc<"delivery_forms">[]> {
  const rows = await db
    .query("delivery_forms")
    .withIndex("by_organization_and_creation", (q) =>
      q.eq("organization_id", organizationId),
    )
    .order("desc")
    .take(RECENT_LIMIT);
  return rows.filter((r) => r._creationTime >= startTs);
}

async function takeTodayInvoices(
  db: DbLike,
  organizationId: string,
  startTs: number,
): Promise<Doc<"invoices">[]> {
  const rows = await db
    .query("invoices")
    .withIndex("by_organization_and_creation", (q) =>
      q.eq("organization_id", organizationId),
    )
    .order("desc")
    .take(RECENT_LIMIT);
  return rows.filter((r) => r._creationTime >= startTs);
}

async function resolveClients(
  db: DbLike,
  clientIds: readonly Doc<"clients">["_id"][],
): Promise<Map<string, Doc<"clients">>> {
  const cache = new Map<string, Doc<"clients">>();
  for (const id of clientIds) {
    const key = String(id);
    if (cache.has(key)) continue;
    // eslint-disable-next-line no-await-in-loop -- sequential reads in Convex transaction
    const client = await db.get(id);
    if (client) cache.set(key, client as Doc<"clients">);
  }
  return cache;
}

export async function todayDigestHandler(
  db: DbLike,
  organizationId: string,
  now: number,
): Promise<DashboardTodayDigestDto> {
  const start = startOfDayParis(now);

  const [quotationDocs, deliveryDocs, invoiceDocs] = await Promise.all([
    takeTodayQuotations(db, organizationId, start),
    takeTodayDeliveryForms(db, organizationId, start),
    takeTodayInvoices(db, organizationId, start),
  ]);

  const clientIds = [
    ...quotationDocs.map((d) => d.client_id),
    ...deliveryDocs.map((d) => d.client_id),
    ...invoiceDocs.map((d) => d.client_id),
  ];
  const clients = await resolveClients(db, clientIds);

  const lookupClient = (clientId: Doc<"clients">["_id"]) =>
    clients.get(String(clientId));

  return {
    quotations: quotationDocs.flatMap((doc) => {
      const client = lookupClient(doc.client_id);
      if (!client) return [];
      return [
        toDashboardQuotationRowDto(doc, {
          code: client.code,
          name: client.name,
        }),
      ];
    }),
    deliveryForms: deliveryDocs.flatMap((doc) => {
      const client = lookupClient(doc.client_id);
      if (!client) return [];
      return [
        toDashboardDeliveryFormRowDto(doc, {
          code: client.code,
          name: client.name,
        }),
      ];
    }),
    invoices: invoiceDocs.flatMap((doc) => {
      const client = lookupClient(doc.client_id);
      if (!client) return [];
      return [
        toDashboardInvoiceRowDto(doc, { code: client.code, name: client.name }),
      ];
    }),
  };
}

export const todayDigest = orgQuery({
  roles: ["owner", "admin", "member"],
  args: {},
  handler: async (ctx, args): Promise<DashboardTodayDigestDto> => {
    return todayDigestHandler(ctx.db, args.organizationId, Date.now());
  },
});
