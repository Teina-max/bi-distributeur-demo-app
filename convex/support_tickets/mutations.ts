import { v } from "convex/values";
import { internal } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { MutationCtx } from "@convex/_generated/server";
import { orgMutation } from "@convex/auth/functions";
import { todayParisTimestamp, yearTwoDigits } from "@convex/utils/dateFns";

const supportTicketCategory = v.union(
  v.literal("machine_panne"),
  v.literal("produit_defaut"),
  v.literal("facturation"),
);

const supportTicketStatus = v.union(
  v.literal("open"),
  v.literal("in_progress"),
  v.literal("waiting_customer"),
  v.literal("resolved"),
  v.literal("closed"),
);

const supportTicketPriority = v.union(
  v.literal("low"),
  v.literal("normal"),
  v.literal("high"),
  v.literal("urgent"),
);

type SupportTicketCategory = "machine_panne" | "produit_defaut" | "facturation";
type SupportTicketStatus =
  | "open"
  | "in_progress"
  | "waiting_customer"
  | "resolved"
  | "closed";
type SupportTicketPriority = "low" | "normal" | "high" | "urgent";

const resolveCreatorEmail = (orgAuth: {
  session: { user: { email?: string | null; id: string } };
}): string => {
  const email = orgAuth.session.user.email;
  return typeof email === "string" && email.length > 0
    ? email
    : orgAuth.session.user.id;
};

export async function createHandler(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    client_id: Id<"clients">;
    category: SupportTicketCategory;
    priority: SupportTicketPriority;
    title: string;
    description: string;
    delivery_form_id: Id<"delivery_forms"> | null;
    invoice_id: Id<"invoices"> | null;
    product_id: Id<"products"> | null;
    created_by: string;
  },
): Promise<{ id: Id<"support_tickets">; number: string }> {
  const title = args.title.trim();
  if (title.length === 0) {
    throw new Error("Titre requis");
  }
  const description = args.description.trim();
  if (description.length === 0) {
    throw new Error("Description requise");
  }

  const linkedCount =
    (args.delivery_form_id ? 1 : 0) +
    (args.invoice_id ? 1 : 0) +
    (args.product_id ? 1 : 0);
  if (linkedCount > 1) {
    throw new Error("Un seul document lié autorisé");
  }

  const client = await ctx.db.get(args.client_id);
  if (client?.organization_id !== args.organizationId) {
    throw new Error("Client introuvable");
  }

  if (args.delivery_form_id) {
    const deliveryForm = await ctx.db.get(args.delivery_form_id);
    if (deliveryForm?.organization_id !== args.organizationId) {
      throw new Error("Document lié introuvable");
    }
  }
  if (args.invoice_id) {
    const invoice = await ctx.db.get(args.invoice_id);
    if (invoice?.organization_id !== args.organizationId) {
      throw new Error("Document lié introuvable");
    }
  }
  if (args.product_id) {
    const product = await ctx.db.get(args.product_id);
    if (product?.organization_id !== args.organizationId) {
      throw new Error("Document lié introuvable");
    }
  }

  const number: string = await ctx.runMutation(
    internal.utils.numbering.allocateNumber,
    {
      organization_id: args.organizationId,
      kind: "support_ticket",
      year_prefix: yearTwoDigits(todayParisTimestamp()),
    },
  );

  const id: Id<"support_tickets"> = await ctx.db.insert("support_tickets", {
    organization_id: args.organizationId,
    client_id: args.client_id,
    number,
    status: "open",
    category: args.category,
    priority: args.priority,
    title,
    description,
    delivery_form_id: args.delivery_form_id,
    invoice_id: args.invoice_id,
    product_id: args.product_id,
    assigned_to: null,
    resolved_at: null,
    closed_at: null,
    created_by: args.created_by,
  });

  return { id, number };
}

export const create = orgMutation({
  roles: ["owner", "admin", "member"],
  args: {
    client_id: v.id("clients"),
    category: supportTicketCategory,
    priority: supportTicketPriority,
    title: v.string(),
    description: v.string(),
    delivery_form_id: v.union(v.id("delivery_forms"), v.null()),
    invoice_id: v.union(v.id("invoices"), v.null()),
    product_id: v.union(v.id("products"), v.null()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ id: Id<"support_tickets">; number: string }> =>
    createHandler(ctx, {
      organizationId: args.organizationId,
      client_id: args.client_id,
      category: args.category,
      priority: args.priority,
      title: args.title,
      description: args.description,
      delivery_form_id: args.delivery_form_id,
      invoice_id: args.invoice_id,
      product_id: args.product_id,
      created_by: resolveCreatorEmail(ctx.orgAuth),
    }),
});

export async function updateStatusHandler(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    id: Id<"support_tickets">;
    status: SupportTicketStatus;
  },
): Promise<{ id: Id<"support_tickets">; status: SupportTicketStatus }> {
  const ticket = await ctx.db.get(args.id);
  if (ticket?.organization_id !== args.organizationId) {
    throw new Error("Ticket introuvable");
  }

  if (ticket.status === "closed") {
    throw new Error("Ticket clôturé — réouvrir d'abord");
  }

  const patch: {
    status: SupportTicketStatus;
    resolved_at?: number;
  } = { status: args.status };

  if (args.status === "resolved" && ticket.resolved_at === null) {
    patch.resolved_at = Date.now();
  }

  await ctx.db.patch(ticket._id, patch);

  return { id: ticket._id, status: args.status };
}

export const updateStatus = orgMutation({
  roles: ["owner", "admin", "member"],
  args: {
    id: v.id("support_tickets"),
    status: supportTicketStatus,
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ id: Id<"support_tickets">; status: SupportTicketStatus }> =>
    updateStatusHandler(ctx, {
      organizationId: args.organizationId,
      id: args.id,
      status: args.status,
    }),
});

export async function addMessageHandler(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    id: Id<"support_tickets">;
    body: string;
    author_email: string;
  },
): Promise<{ id: Id<"ticket_messages"> }> {
  const body = args.body.replace(/\s+$/g, "").replace(/^\s+/g, "");
  if (body.length === 0) {
    throw new Error("Message vide");
  }

  const ticket = await ctx.db.get(args.id);
  if (ticket?.organization_id !== args.organizationId) {
    throw new Error("Ticket introuvable");
  }

  if (ticket.status === "closed") {
    throw new Error("Ticket clôturé — réouvrir d'abord");
  }

  const messageId: Id<"ticket_messages"> = await ctx.db.insert(
    "ticket_messages",
    {
      ticket_id: ticket._id,
      author_email: args.author_email,
      body,
    },
  );

  return { id: messageId };
}

export const addMessage = orgMutation({
  roles: ["owner", "admin", "member"],
  args: {
    id: v.id("support_tickets"),
    body: v.string(),
  },
  handler: async (ctx, args): Promise<{ id: Id<"ticket_messages"> }> =>
    addMessageHandler(ctx, {
      organizationId: args.organizationId,
      id: args.id,
      body: args.body,
      author_email: resolveCreatorEmail(ctx.orgAuth),
    }),
});

export async function closeHandler(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    id: Id<"support_tickets">;
  },
): Promise<{ id: Id<"support_tickets"> }> {
  const ticket = await ctx.db.get(args.id);
  if (ticket?.organization_id !== args.organizationId) {
    throw new Error("Ticket introuvable");
  }
  if (ticket.status === "closed") {
    throw new Error("Ticket déjà clôturé");
  }

  await ctx.db.patch(ticket._id, {
    status: "closed",
    closed_at: Date.now(),
  });

  return { id: ticket._id };
}

export const close = orgMutation({
  roles: ["owner", "admin"],
  args: { id: v.id("support_tickets") },
  handler: async (ctx, args): Promise<{ id: Id<"support_tickets"> }> =>
    closeHandler(ctx, {
      organizationId: args.organizationId,
      id: args.id,
    }),
});

export async function reopenHandler(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    id: Id<"support_tickets">;
    author_email: string;
  },
): Promise<{ id: Id<"support_tickets">; messageId: Id<"ticket_messages"> }> {
  const ticket = await ctx.db.get(args.id);
  if (ticket?.organization_id !== args.organizationId) {
    throw new Error("Ticket introuvable");
  }
  if (ticket.status !== "closed") {
    throw new Error("Ticket non clôturé");
  }

  await ctx.db.patch(ticket._id, {
    status: "open",
    closed_at: null,
  });

  const messageId: Id<"ticket_messages"> = await ctx.db.insert(
    "ticket_messages",
    {
      ticket_id: ticket._id,
      author_email: args.author_email,
      body: `Ticket réouvert par ${args.author_email}.`,
    },
  );

  return { id: ticket._id, messageId };
}

export const reopen = orgMutation({
  roles: ["owner", "admin", "member"],
  args: { id: v.id("support_tickets") },
  handler: async (
    ctx,
    args,
  ): Promise<{
    id: Id<"support_tickets">;
    messageId: Id<"ticket_messages">;
  }> =>
    reopenHandler(ctx, {
      organizationId: args.organizationId,
      id: args.id,
      author_email: resolveCreatorEmail(ctx.orgAuth),
    }),
});

export async function assignHandler(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    id: Id<"support_tickets">;
    assigned_to: string | null;
  },
): Promise<{ id: Id<"support_tickets">; assignedTo: string | null }> {
  const ticket = await ctx.db.get(args.id);
  if (ticket?.organization_id !== args.organizationId) {
    throw new Error("Ticket introuvable");
  }
  if (ticket.status === "closed") {
    throw new Error("Ticket clôturé");
  }

  const normalized =
    args.assigned_to === null || args.assigned_to.trim().length === 0
      ? null
      : args.assigned_to.trim();

  await ctx.db.patch(ticket._id, { assigned_to: normalized });

  return { id: ticket._id, assignedTo: normalized };
}

export const assign = orgMutation({
  roles: ["owner", "admin"],
  args: {
    id: v.id("support_tickets"),
    assigned_to: v.union(v.string(), v.null()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    id: Id<"support_tickets">;
    assignedTo: string | null;
  }> =>
    assignHandler(ctx, {
      organizationId: args.organizationId,
      id: args.id,
      assigned_to: args.assigned_to,
    }),
});
