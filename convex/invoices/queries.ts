import { v } from "convex/values";
import type { Doc } from "@convex/_generated/dataModel";
import { orgQuery } from "@convex/auth/functions";
import {
  toInvoiceListItemDto,
  type InvoiceListItemDto,
} from "./dto/invoiceListItem";
import { toInvoiceDetailDto, type InvoiceDetailDto } from "./dto/invoiceDetail";

const LIST_LIMIT = 50;

export const listRecent = orgQuery({
  roles: ["owner", "admin", "member"],
  args: {},
  handler: async (ctx, args): Promise<InvoiceListItemDto[]> => {
    const rows = await ctx.db
      .query("invoices")
      .withIndex("by_organization_and_creation", (q) =>
        q.eq("organization_id", args.organizationId),
      )
      .order("desc")
      .take(LIST_LIMIT);

    const clientById = new Map<string, Doc<"clients"> | null>();
    const result: InvoiceListItemDto[] = [];
    for (const row of rows) {
      let client = clientById.get(String(row.client_id));
      if (client === undefined) {
        // eslint-disable-next-line no-await-in-loop -- sequential reads required (Convex transaction)
        client = await ctx.db.get(row.client_id);
        clientById.set(String(row.client_id), client);
      }
      if (!client) continue;
      result.push(
        toInvoiceListItemDto(row, { code: client.code, name: client.name }),
      );
    }
    return result;
  },
});

export const getById = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { id: v.id("invoices") },
  handler: async (ctx, args): Promise<InvoiceDetailDto | null> => {
    const doc = await ctx.db.get(args.id);
    if (doc?.organization_id !== args.organizationId) return null;

    const maybeDeliveryForms = await Promise.all(
      doc.delivery_form_ids.map(async (id) => ctx.db.get(id)),
    );
    const resolvedDeliveryForms: NonNullable<
      (typeof maybeDeliveryForms)[number]
    >[] = [];
    for (const df of maybeDeliveryForms) {
      if (df === null) return null;
      resolvedDeliveryForms.push(df);
    }

    const client = await ctx.db.get(doc.client_id);
    if (!client) return null;

    return toInvoiceDetailDto(
      doc,
      {
        code: client.code,
        name: client.name,
        email: client.email,
        phone: client.phone,
      },
      resolvedDeliveryForms.map((df) => ({
        id: df._id,
        number: df.number,
        lines: df.lines,
        delivered_at: df.delivered_at,
        total_ht: df.total_ht,
        total_ttc: df.total_ttc,
      })),
    );
  },
});
