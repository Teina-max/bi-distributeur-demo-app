import { v } from "convex/values";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { QueryCtx } from "@convex/_generated/server";
import { orgQuery } from "@convex/auth/functions";
import {
  toTicketDetailDto,
  type TicketDetailDto,
} from "@convex/support_tickets/dto/ticketDetail";
import {
  toTicketListItemDto,
  type TicketListItemDto,
} from "@convex/support_tickets/dto/ticketListItem";
import {
  toTicketMessageDto,
  type TicketMessageDto,
} from "@convex/support_tickets/dto/ticketMessage";

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;
const DEFAULT_CLIENT_LIMIT = 10;

const supportTicketStatus = v.union(
  v.literal("open"),
  v.literal("in_progress"),
  v.literal("waiting_customer"),
  v.literal("resolved"),
  v.literal("closed"),
);

const FALLBACK_CLIENT = {
  code: "—",
  name: "Client inconnu",
} as const;

async function attachClients(
  ctx: QueryCtx,
  organizationId: string,
  tickets: readonly Doc<"support_tickets">[],
): Promise<TicketListItemDto[]> {
  const uniqueClientIds = Array.from(
    new Set(tickets.map((ticket) => String(ticket.client_id))),
  );
  const clientDocs = await Promise.all(
    uniqueClientIds.map(async (id) =>
      ctx.db.get(id as unknown as Id<"clients">),
    ),
  );
  const byId = new Map<string, Pick<Doc<"clients">, "code" | "name">>();
  for (const client of clientDocs) {
    if (client?.organization_id === organizationId) {
      byId.set(String(client._id), { code: client.code, name: client.name });
    }
  }
  return tickets.map((ticket) =>
    toTicketListItemDto(
      ticket,
      byId.get(String(ticket.client_id)) ?? FALLBACK_CLIENT,
    ),
  );
}

export async function listHandler(
  ctx: QueryCtx,
  args: {
    organizationId: string;
    status?:
      | "open"
      | "in_progress"
      | "waiting_customer"
      | "resolved"
      | "closed";
    limit?: number;
  },
): Promise<TicketListItemDto[]> {
  const limit = Math.min(args.limit ?? DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT);

  const tickets = args.status
    ? await ctx.db
        .query("support_tickets")
        .withIndex("by_organization_and_status", (q) =>
          q
            .eq("organization_id", args.organizationId)
            .eq("status", args.status as NonNullable<typeof args.status>),
        )
        .order("desc")
        .take(limit)
    : await ctx.db
        .query("support_tickets")
        .withIndex("by_organization_and_creation", (q) =>
          q.eq("organization_id", args.organizationId),
        )
        .order("desc")
        .take(limit);

  return attachClients(ctx, args.organizationId, tickets);
}

export const list = orgQuery({
  roles: ["owner", "admin", "member"],
  args: {
    status: v.optional(supportTicketStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<TicketListItemDto[]> =>
    listHandler(ctx, args),
});

export async function getByIdHandler(
  ctx: QueryCtx,
  args: {
    organizationId: string;
    id: Id<"support_tickets">;
  },
): Promise<TicketDetailDto | null> {
  const ticket = await ctx.db.get(args.id);
  if (ticket?.organization_id !== args.organizationId) return null;

  const [client, deliveryForm, invoice, product] = await Promise.all([
    ctx.db.get(ticket.client_id),
    ticket.delivery_form_id
      ? ctx.db.get(ticket.delivery_form_id)
      : Promise.resolve(null),
    ticket.invoice_id ? ctx.db.get(ticket.invoice_id) : Promise.resolve(null),
    ticket.product_id ? ctx.db.get(ticket.product_id) : Promise.resolve(null),
  ]);

  if (client?.organization_id !== args.organizationId) return null;

  const linkedDeliveryForm =
    deliveryForm?.organization_id === args.organizationId ? deliveryForm : null;
  const linkedInvoice =
    invoice?.organization_id === args.organizationId ? invoice : null;
  const linkedProduct =
    product?.organization_id === args.organizationId ? product : null;

  return toTicketDetailDto(
    ticket,
    client,
    linkedDeliveryForm,
    linkedInvoice,
    linkedProduct,
  );
}

export const getById = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { id: v.id("support_tickets") },
  handler: async (ctx, args): Promise<TicketDetailDto | null> =>
    getByIdHandler(ctx, args),
});

export async function listByClientHandler(
  ctx: QueryCtx,
  args: {
    organizationId: string;
    client_id: Id<"clients">;
    limit?: number;
  },
): Promise<TicketListItemDto[]> {
  const limit = Math.min(args.limit ?? DEFAULT_CLIENT_LIMIT, MAX_LIST_LIMIT);

  const client = await ctx.db.get(args.client_id);
  if (client?.organization_id !== args.organizationId) return [];

  const tickets = await ctx.db
    .query("support_tickets")
    .withIndex("by_client_and_creation", (q) =>
      q.eq("client_id", args.client_id),
    )
    .order("desc")
    .take(limit);

  const sameOrg = tickets.filter(
    (ticket) => ticket.organization_id === args.organizationId,
  );

  return sameOrg.map((ticket) =>
    toTicketListItemDto(ticket, { code: client.code, name: client.name }),
  );
}

export const listByClient = orgQuery({
  roles: ["owner", "admin", "member"],
  args: {
    client_id: v.id("clients"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<TicketListItemDto[]> =>
    listByClientHandler(ctx, args),
});

export async function listMessagesHandler(
  ctx: QueryCtx,
  args: {
    organizationId: string;
    ticket_id: Id<"support_tickets">;
  },
): Promise<TicketMessageDto[]> {
  const ticket = await ctx.db.get(args.ticket_id);
  if (ticket?.organization_id !== args.organizationId) return [];

  const messages = await ctx.db
    .query("ticket_messages")
    .withIndex("by_ticket_and_creation", (q) =>
      q.eq("ticket_id", args.ticket_id),
    )
    .order("asc")
    .take(MAX_LIST_LIMIT);

  return messages.map(toTicketMessageDto);
}

export const listMessages = orgQuery({
  roles: ["owner", "admin", "member"],
  args: { ticket_id: v.id("support_tickets") },
  handler: async (ctx, args): Promise<TicketMessageDto[]> =>
    listMessagesHandler(ctx, args),
});
