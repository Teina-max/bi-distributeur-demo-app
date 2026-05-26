import { v } from "convex/values";
import type { Doc } from "@convex/_generated/dataModel";
import type { QueryCtx } from "@convex/_generated/server";
import { orgQuery } from "@convex/auth/functions";
import {
  toDeliveryFormListItemDto,
  type DeliveryFormListItemDto,
} from "./dto/deliveryFormListItem";
import {
  toDeliveryFormDetailDto,
  type DeliveryFormDetailDto,
} from "./dto/deliveryFormDetail";
import {
  toDeliveryFormInvoiceableDto,
  type DeliveryFormInvoiceableDto,
} from "./dto/deliveryFormInvoiceable";

const LIST_LIMIT = 50;

export const listRecent = orgQuery({
  roles: ["owner", "admin", "member"],
  args: {},
  handler: async (ctx, args): Promise<DeliveryFormListItemDto[]> => {
    const rows = await ctx.db
      .query("delivery_forms")
      .withIndex("by_organization_and_creation", (q) =>
        q.eq("organization_id", args.organizationId),
      )
      .order("desc")
      .take(LIST_LIMIT);

    const clientById = new Map<string, Doc<"clients"> | null>();
    const result: DeliveryFormListItemDto[] = [];
    for (const row of rows) {
      let client = clientById.get(String(row.client_id));
      if (client === undefined) {
        // eslint-disable-next-line no-await-in-loop -- sequential reads required (Convex transaction)
        client = await ctx.db.get(row.client_id);
        clientById.set(String(row.client_id), client);
      }
      if (!client) continue;
      result.push(
        toDeliveryFormListItemDto(row, {
          code: client.code,
          name: client.name,
        }),
      );
    }
    return result;
  },
});

export const getById = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { id: v.id("delivery_forms") },
  handler: async (ctx, args): Promise<DeliveryFormDetailDto | null> => {
    const doc = await ctx.db.get(args.id);
    if (doc?.organization_id !== args.organizationId) return null;
    const client = await ctx.db.get(doc.client_id);
    if (!client) return null;
    return toDeliveryFormDetailDto(doc, {
      code: client.code,
      name: client.name,
      email: client.email,
      phone: client.phone,
    });
  },
});

export type ConversionPreviewLine = {
  product_id: string;
  product_code: string;
  quantity: number;
  current_stock: number;
};

export type ConversionPreview = {
  quotation_number: string;
  status: Doc<"quotations">["status"];
  client_code: string;
  client_name: string;
  lines: ConversionPreviewLine[];
};

export const getConversionPreview = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { quotation_id: v.id("quotations") },
  handler: async (ctx, args): Promise<ConversionPreview | null> => {
    const quotation = await ctx.db.get(args.quotation_id);
    if (quotation?.organization_id !== args.organizationId) return null;
    const client = await ctx.db.get(quotation.client_id);
    if (!client) return null;

    const lines: ConversionPreviewLine[] = [];
    for (const line of quotation.lines) {
      // eslint-disable-next-line no-await-in-loop -- sequential reads required (Convex transaction)
      const product = await ctx.db.get(line.product_id);
      if (!product) continue;
      lines.push({
        product_id: String(line.product_id),
        product_code: line.product_code,
        quantity: line.quantity,
        current_stock: product.stock_qty,
      });
    }

    return {
      quotation_number: quotation.number,
      status: quotation.status,
      client_code: client.code,
      client_name: client.name,
      lines,
    };
  },
});

const INVOICEABLE_BL_LIMIT = 200;

/**
 * Pure handler exposed for testing with a mocked QueryCtx. Returns the BLs
 * (`status === "delivered"`) of a given client, in desc creation order, for
 * the requested organization. Cross-org client → empty array (silent).
 */
export async function listInvoiceableByClientHandler(
  ctx: QueryCtx,
  args: {
    organizationId: string;
    client_id: Doc<"clients">["_id"];
  },
): Promise<DeliveryFormInvoiceableDto[]> {
  const client = await ctx.db.get(args.client_id);
  if (client?.organization_id !== args.organizationId) return [];

  const rows = await ctx.db
    .query("delivery_forms")
    .withIndex("by_organization_and_status", (q) =>
      q.eq("organization_id", args.organizationId).eq("status", "delivered"),
    )
    .order("desc")
    .take(INVOICEABLE_BL_LIMIT);

  return rows
    .filter((bl) => bl.client_id === args.client_id)
    .map(toDeliveryFormInvoiceableDto);
}

export const listInvoiceableByClient = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { client_id: v.id("clients") },
  handler: async (ctx, args): Promise<DeliveryFormInvoiceableDto[]> =>
    listInvoiceableByClientHandler(ctx, args),
});
