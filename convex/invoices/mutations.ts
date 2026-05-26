import { v } from "convex/values";
import { internal } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { mutation, type MutationCtx } from "@convex/_generated/server";
import { orgMutation } from "@convex/auth/functions";
import {
  assertInvoiceableDeliveryFormStatus,
  computeDueDateMs,
  currentYearPrefix,
} from "@convex/delivery_forms/conversionHelpers";

/**
 * Pure orchestration handler — exposed for tests with a mocked MutationCtx.
 * Atomicity invariants:
 *   - Throws on empty array, bad BL status, missing BL, or BL from different
 *     clients BEFORE allocating number or inserting.
 *   - No stock movement is created (F9 never touches stock).
 *   - All writes (insert invoice, patch each BL status) run inside the same
 *     Convex transaction.
 *   - Totals are aggregated server-side from the actual BL documents.
 *   - due_date uses the client's payment_terms_days computed from the
 *     earliest BL delivered_at (or `now` when delivered_at is null).
 */
export async function convertFromDeliveryFormsHandler(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    delivery_form_ids: Id<"delivery_forms">[];
  },
): Promise<{ id: Id<"invoices">; number: string }> {
  if (args.delivery_form_ids.length === 0) {
    throw new Error("Au moins un BL est requis");
  }

  const maybeDeliveryForms = await Promise.all(
    args.delivery_form_ids.map(async (id) => ctx.db.get(id)),
  );

  const resolvedForms: NonNullable<(typeof maybeDeliveryForms)[number]>[] = [];
  for (const df of maybeDeliveryForms) {
    if (df === null) throw new Error("BL introuvable");
    if (df.organization_id !== args.organizationId) {
      throw new Error("BL introuvable");
    }
    resolvedForms.push(df);
  }

  // All must share the same client
  const clientId = resolvedForms[0].client_id;
  if (resolvedForms.some((df) => df.client_id !== clientId)) {
    throw new Error("Tous les BL doivent appartenir au même client");
  }

  // All must be invoiceable (status === "delivered")
  for (const df of resolvedForms) {
    assertInvoiceableDeliveryFormStatus(df.status);
  }

  const client = await ctx.db.get(clientId);
  if (client?.organization_id !== args.organizationId) {
    throw new Error("Client du BL introuvable");
  }

  // Aggregate totals (already rounded at line creation time, so cents-clean
  // sum within JS number precision for POC magnitudes).
  const total_ht =
    Math.round(resolvedForms.reduce((acc, df) => acc + df.total_ht, 0) * 100) /
    100;
  const total_ttc =
    Math.round(resolvedForms.reduce((acc, df) => acc + df.total_ttc, 0) * 100) /
    100;

  const number: string = await ctx.runMutation(
    internal.utils.numbering.allocateNumber,
    {
      organization_id: args.organizationId,
      kind: "invoice",
      year_prefix: currentYearPrefix(),
    },
  );

  // due_date computed from "now" so an aggregated invoice always lands
  // at creation + payment_terms_days. Matches the prior single-BL behaviour.
  const now = Date.now();
  const due = computeDueDateMs(now, client.payment_terms_days);

  const invoiceId: Id<"invoices"> = await ctx.db.insert("invoices", {
    organization_id: args.organizationId,
    delivery_form_ids: resolvedForms.map((df) => df._id),
    client_id: clientId,
    number,
    status: "draft",
    total_ht,
    total_ttc,
    due_date: due,
    sent_at: null,
  });

  await Promise.all(
    resolvedForms.map(async (df) =>
      ctx.db.patch(df._id, { status: "invoiced" as const }),
    ),
  );

  return { id: invoiceId, number };
}

export const convertFromDeliveryForms = orgMutation({
  roles: ["owner", "admin", "member"],
  args: { delivery_form_ids: v.array(v.id("delivery_forms")) },
  handler: async (ctx, args): Promise<{ id: Id<"invoices">; number: string }> =>
    convertFromDeliveryFormsHandler(ctx, args),
});

/**
 * POC live-test runner — invokes convertFromDeliveryFormsHandler with an
 * explicit organization_id. NOT protected by auth — POC local-dev only.
 * TODO V1: remove with the other POC dev helpers.
 */
export const __runConvertFromDeliveryFormsForLiveTest = mutation({
  args: {
    organization_id: v.string(),
    delivery_form_ids: v.array(v.id("delivery_forms")),
  },
  handler: async (ctx, args): Promise<{ id: Id<"invoices">; number: string }> =>
    convertFromDeliveryFormsHandler(ctx, {
      organizationId: args.organization_id,
      delivery_form_ids: args.delivery_form_ids,
    }),
});

export async function cancelHandler(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    id: Id<"invoices">;
    reason: string;
  },
): Promise<{ id: Id<"invoices">; restoredBLs: number }> {
  const reason = args.reason.trim();
  if (reason.length === 0) {
    throw new Error("Raison requise");
  }

  const invoice = await ctx.db.get(args.id);
  if (invoice?.organization_id !== args.organizationId) {
    throw new Error("Facture introuvable");
  }

  if (invoice.status === "paid") {
    throw new Error("Facture déjà payée — annulation interdite");
  }
  if (invoice.status === "cancelled") {
    throw new Error("Facture déjà annulée");
  }
  if (invoice.status !== "draft" && invoice.status !== "sent") {
    throw new Error("Statut facture incompatible");
  }

  const maybeDeliveryForms = await Promise.all(
    invoice.delivery_form_ids.map(async (id) => ctx.db.get(id)),
  );

  const resolvedDeliveryForms: NonNullable<
    (typeof maybeDeliveryForms)[number]
  >[] = [];
  for (const deliveryForm of maybeDeliveryForms) {
    if (deliveryForm?.organization_id !== args.organizationId) {
      throw new Error("BL introuvable");
    }
    resolvedDeliveryForms.push(deliveryForm);
  }

  const invoiceableDeliveryForms = resolvedDeliveryForms.filter(
    (deliveryForm) => deliveryForm.status === "invoiced",
  );

  await ctx.db.patch(invoice._id, { status: "cancelled" });
  await Promise.all(
    invoiceableDeliveryForms.map(async (deliveryForm) =>
      ctx.db.patch(deliveryForm._id, { status: "delivered" as const }),
    ),
  );

  return { id: invoice._id, restoredBLs: invoiceableDeliveryForms.length };
}

export const cancel = orgMutation({
  roles: ["owner", "admin", "member"],
  args: {
    id: v.id("invoices"),
    reason: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ id: Id<"invoices">; restoredBLs: number }> =>
    cancelHandler(ctx, {
      organizationId: args.organizationId,
      id: args.id,
      reason: args.reason,
    }),
});

type UpdatableStatus = "sent" | "paid" | "overdue";

const ALLOWED_STATUS_TRANSITIONS: Record<string, readonly UpdatableStatus[]> = {
  draft: ["sent", "paid"],
  sent: ["paid", "overdue"],
  overdue: ["paid"],
};

export async function updateStatusHandler(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    id: Id<"invoices">;
    newStatus: UpdatableStatus;
  },
): Promise<{ id: Id<"invoices">; status: UpdatableStatus }> {
  const invoice = await ctx.db.get(args.id);
  if (invoice?.organization_id !== args.organizationId) {
    throw new Error("Facture introuvable");
  }
  if (invoice.status === "cancelled") {
    throw new Error("Facture annulée — statut figé");
  }
  if (invoice.status === "paid") {
    throw new Error("Facture déjà payée — statut figé");
  }
  const allowed = ALLOWED_STATUS_TRANSITIONS[invoice.status] ?? [];
  if (!allowed.includes(args.newStatus)) {
    throw new Error(
      `Transition ${invoice.status} → ${args.newStatus} interdite`,
    );
  }

  const patch: Partial<typeof invoice> = { status: args.newStatus };
  if (args.newStatus === "sent" && invoice.sent_at === null) {
    patch.sent_at = Date.now();
  }
  await ctx.db.patch(invoice._id, patch);

  return { id: invoice._id, status: args.newStatus };
}

export const updateStatus = orgMutation({
  roles: ["owner", "admin", "member"],
  args: {
    id: v.id("invoices"),
    newStatus: v.union(
      v.literal("sent"),
      v.literal("paid"),
      v.literal("overdue"),
    ),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ id: Id<"invoices">; status: UpdatableStatus }> =>
    updateStatusHandler(ctx, {
      organizationId: args.organizationId,
      id: args.id,
      newStatus: args.newStatus,
    }),
});
