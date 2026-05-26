import { v } from "convex/values";
import { internal } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { mutation, type MutationCtx } from "@convex/_generated/server";
import { orgMutation } from "@convex/auth/functions";
import {
  assertConvertibleQuotationStatus,
  assertSufficientStock,
  currentYearPrefix,
  type StockCheckLine,
} from "./conversionHelpers";

type Line = Doc<"quotations">["lines"][number];

type DeliveryFormStatus = Doc<"delivery_forms">["status"];

/**
 * Pure orchestration handler — exposed for tests with a mocked MutationCtx.
 * Atomicity invariants:
 *   - Throws on bad quotation status BEFORE any read of products.
 *   - Throws on cross-org product BEFORE any write.
 *   - All subsequent writes (allocateNumber, insert BL, patch quotation) run
 *     inside the same Convex transaction.
 *   - Stock is NOT decremented here — it leaves inventory at the
 *     ready_to_ship → shipped transition (transitionStatusHandler).
 */
export async function convertFromQuotationHandler(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    quotation_id: Id<"quotations">;
  },
): Promise<{ id: Id<"delivery_forms">; number: string }> {
  const quotation = await ctx.db.get(args.quotation_id);
  if (quotation?.organization_id !== args.organizationId) {
    throw new Error("Devis introuvable");
  }

  assertConvertibleQuotationStatus(quotation.status);

  // Validate every product exists and belongs to the org BEFORE writes.
  for (const line of quotation.lines) {
    // eslint-disable-next-line no-await-in-loop -- transactional, sequential reads required
    const product = await ctx.db.get(line.product_id);
    if (product?.organization_id !== args.organizationId) {
      throw new Error(`Produit introuvable pour la ligne ${line.product_code}`);
    }
  }

  const number: string = await ctx.runMutation(
    internal.utils.numbering.allocateNumber,
    {
      organization_id: args.organizationId,
      kind: "delivery_form",
      year_prefix: currentYearPrefix(),
    },
  );

  // Snapshot lines from the quotation (immutable copy).
  const snapshotLines: Line[] = quotation.lines.map((line) => ({
    product_id: line.product_id,
    product_code: line.product_code,
    product_name: line.product_name,
    quantity: line.quantity,
    unit_price_ht: line.unit_price_ht,
    vat_rate: line.vat_rate,
    line_total_ht: line.line_total_ht,
  }));
  const deliveryFormId: Id<"delivery_forms"> = await ctx.db.insert(
    "delivery_forms",
    {
      organization_id: args.organizationId,
      quotation_id: quotation._id,
      client_id: quotation.client_id,
      number,
      status: "in_preparation",
      lines: snapshotLines,
      total_ht: quotation.total_ht,
      total_ttc: quotation.total_ttc,
      delivered_at: null,
      created_by: quotation.created_by,
    },
  );

  await ctx.db.patch(quotation._id, { status: "converted_to_delivery" });

  return { id: deliveryFormId, number };
}

export const convertFromQuotation = orgMutation({
  roles: ["owner", "admin", "member"],
  args: { quotation_id: v.id("quotations") },
  handler: async (
    ctx,
    args,
  ): Promise<{ id: Id<"delivery_forms">; number: string }> =>
    convertFromQuotationHandler(ctx, args),
});

/**
 * POC live-test runner — invokes convertFromQuotationHandler with an explicit
 * organization_id. NOT protected by auth — POC local-dev runtime atomicity
 * proof only. SAFE TO REMOVE once L2 quotations module is merged.
 */
export const __runConvertFromQuotationForLiveTest = mutation({
  args: {
    organization_id: v.string(),
    quotation_id: v.id("quotations"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ id: Id<"delivery_forms">; number: string }> =>
    convertFromQuotationHandler(ctx, {
      organizationId: args.organization_id,
      quotation_id: args.quotation_id,
    }),
});

/**
 * POC sandbox seed for L4 live test only.
 * Creates one quotation with N lines from existing seeded clients + products.
 * NOT protected by auth — POC local-dev seeding only.
 * SAFE TO REMOVE once L2 quotations module is merged.
 */
export const __seedQuotationForLiveTest = mutation({
  args: {
    organization_id: v.string(),
    client_code: v.string(),
    product_codes: v.array(v.string()),
    quantities: v.array(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ id: Id<"quotations">; number: string }> => {
    if (args.product_codes.length !== args.quantities.length) {
      throw new Error("product_codes / quantities length mismatch");
    }
    const client = await ctx.db
      .query("clients")
      .withIndex("by_organization_and_code", (q) =>
        q
          .eq("organization_id", args.organization_id)
          .eq("code", args.client_code),
      )
      .unique();
    if (!client) throw new Error(`Client introuvable: ${args.client_code}`);

    const lines: Line[] = [];
    let total_ht = 0;
    let total_vat = 0;
    for (let i = 0; i < args.product_codes.length; i += 1) {
      const code = args.product_codes[i] as string;
      const qty = args.quantities[i] as number;
      // eslint-disable-next-line no-await-in-loop -- transactional, sequential reads required
      const product = await ctx.db
        .query("products")
        .withIndex("by_organization_and_code", (q) =>
          q.eq("organization_id", args.organization_id).eq("code", code),
        )
        .unique();
      if (!product) throw new Error(`Produit introuvable: ${code}`);
      const lineHt = Math.round(qty * product.price_ht * 100) / 100;
      const lineVat = Math.round(lineHt * (product.vat_rate / 100) * 100) / 100;
      total_ht += lineHt;
      total_vat += lineVat;
      lines.push({
        product_id: product._id,
        product_code: product.code,
        product_name: product.name,
        quantity: qty,
        unit_price_ht: product.price_ht,
        vat_rate: product.vat_rate,
        line_total_ht: lineHt,
      });
    }
    const round2 = (n: number) => Math.round(n * 100) / 100;

    const number: string = await ctx.runMutation(
      internal.utils.numbering.allocateNumber,
      {
        organization_id: args.organization_id,
        kind: "quotation",
        year_prefix: currentYearPrefix(),
      },
    );

    const quotationId: Id<"quotations"> = await ctx.db.insert("quotations", {
      organization_id: args.organization_id,
      client_id: client._id,
      number,
      status: "draft",
      lines,
      total_ht: round2(total_ht),
      total_vat: round2(total_vat),
      total_ttc: round2(total_ht + total_vat),
      created_by: "live-test-fixture",
    });

    return { id: quotationId, number };
  },
});

/**
 * Pure orchestration handler for direct delivery-form creation (no preceding
 * quotation). Exposed for tests with a mocked MutationCtx.
 *
 * Atomicity invariants (mirror of convertFromQuotationHandler, minus the
 * quotation-read step):
 *   - Throws on empty lines BEFORE any read.
 *   - Throws on missing/cross-org client BEFORE any product read.
 *   - Throws on missing/cross-org product BEFORE any write.
 *   - Stock is NOT decremented here — it leaves inventory at the
 *     ready_to_ship → shipped transition (transitionStatusHandler).
 *   - All subsequent writes (allocateNumber, insert BL) run inside the same
 *     Convex transaction.
 *   - NEVER patches the `quotations` table — this is a standalone BL.
 */
export async function createDirectHandler(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    client_id: Id<"clients">;
    lines: readonly {
      product_id: Id<"products">;
      quantity: number;
      vat_rate_override?: number;
    }[];
    created_by: string;
  },
): Promise<{ id: Id<"delivery_forms">; number: string }> {
  if (args.lines.length === 0) {
    throw new Error("Au moins une ligne requise");
  }

  const client = await ctx.db.get(args.client_id);
  if (client?.organization_id !== args.organizationId) {
    throw new Error("Client introuvable");
  }
  if (client.is_visible === false) {
    throw new Error("Client archivé : impossible de créer un nouveau BL");
  }

  // Resolve every product (cross-org check + snapshot data) BEFORE writes.
  // No stock check here — that gate moves to ready_to_ship → shipped.
  const snapshotLines: Line[] = [];
  for (const line of args.lines) {
    // eslint-disable-next-line no-await-in-loop -- transactional, sequential reads required
    const product = await ctx.db.get(line.product_id);
    if (product?.organization_id !== args.organizationId) {
      throw new Error(
        `Produit introuvable pour la ligne ${String(line.product_id)}`,
      );
    }
    if (product.is_active === false) {
      throw new Error(
        `Produit inactif (${product.code}) : impossible de l'ajouter à un nouveau BL`,
      );
    }
    const vat_rate = line.vat_rate_override ?? product.vat_rate;
    const line_total_ht =
      Math.round(line.quantity * product.price_ht * 100) / 100;
    snapshotLines.push({
      product_id: product._id,
      product_code: product.code,
      product_name: product.name,
      quantity: line.quantity,
      unit_price_ht: product.price_ht,
      vat_rate,
      line_total_ht,
    });
  }

  // Compute server-side totals (do not trust client).
  const total_ht =
    Math.round(snapshotLines.reduce((a, l) => a + l.line_total_ht, 0) * 100) /
    100;
  const total_vat =
    Math.round(
      snapshotLines.reduce(
        (a, l) => a + l.line_total_ht * (l.vat_rate / 100),
        0,
      ) * 100,
    ) / 100;
  const total_ttc = Math.round((total_ht + total_vat) * 100) / 100;

  const number: string = await ctx.runMutation(
    internal.utils.numbering.allocateNumber,
    {
      organization_id: args.organizationId,
      kind: "delivery_form",
      year_prefix: currentYearPrefix(),
    },
  );

  const deliveryFormId: Id<"delivery_forms"> = await ctx.db.insert(
    "delivery_forms",
    {
      organization_id: args.organizationId,
      quotation_id: null,
      client_id: client._id,
      number,
      status: "in_preparation",
      lines: snapshotLines,
      total_ht,
      total_ttc,
      delivered_at: null,
      created_by: args.created_by,
    },
  );

  return { id: deliveryFormId, number };
}

const resolveCreatorEmail = (orgAuth: {
  session: { user: { email?: string | null; id: string } };
}): string => {
  const email = orgAuth.session.user.email;
  return typeof email === "string" && email.length > 0
    ? email
    : orgAuth.session.user.id;
};

export const createDirect = orgMutation({
  roles: ["owner", "admin", "member"],
  args: {
    client_id: v.id("clients"),
    lines: v.array(
      v.object({
        product_id: v.id("products"),
        quantity: v.number(),
        vat_rate_override: v.optional(v.number()),
      }),
    ),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ id: Id<"delivery_forms">; number: string }> =>
    createDirectHandler(ctx, {
      organizationId: args.organizationId,
      client_id: args.client_id,
      lines: args.lines,
      created_by: resolveCreatorEmail(ctx.orgAuth),
    }),
});

/**
 * POC sandbox seed for L7 live test only.
 * Creates one direct delivery_form with N lines from existing seeded clients +
 * products. Invokes createDirectHandler with explicit org id; bypasses auth.
 * SAFE TO REMOVE once L7 BL direct is validated in production.
 */
export const __seedDeliveryFormDirectForLiveTest = mutation({
  args: {
    organization_id: v.string(),
    client_code: v.string(),
    product_codes: v.array(v.string()),
    quantities: v.array(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ id: Id<"delivery_forms">; number: string }> => {
    if (args.product_codes.length !== args.quantities.length) {
      throw new Error("product_codes / quantities length mismatch");
    }
    const client = await ctx.db
      .query("clients")
      .withIndex("by_organization_and_code", (q) =>
        q
          .eq("organization_id", args.organization_id)
          .eq("code", args.client_code),
      )
      .unique();
    if (!client) throw new Error(`Client introuvable: ${args.client_code}`);

    const lines: {
      product_id: Id<"products">;
      quantity: number;
    }[] = [];
    for (let i = 0; i < args.product_codes.length; i += 1) {
      const code = args.product_codes[i] as string;
      const qty = args.quantities[i] as number;
      // eslint-disable-next-line no-await-in-loop -- transactional, sequential reads required
      const product = await ctx.db
        .query("products")
        .withIndex("by_organization_and_code", (q) =>
          q.eq("organization_id", args.organization_id).eq("code", code),
        )
        .unique();
      if (!product) throw new Error(`Produit introuvable: ${code}`);
      lines.push({ product_id: product._id, quantity: qty });
    }

    return createDirectHandler(ctx, {
      organizationId: args.organization_id,
      client_id: client._id,
      lines,
      created_by: "live-test-fixture",
    });
  },
});

// Forward-only state machine for delivery form lifecycle.
// in_preparation → ready_to_ship → shipped → delivered
// (cancellation is the universal escape hatch, handled by cancelHandler).
const ALLOWED_TRANSITIONS: Record<
  DeliveryFormStatus,
  readonly DeliveryFormStatus[]
> = {
  in_preparation: ["ready_to_ship"],
  ready_to_ship: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
  invoiced: [],
  cancelled: [],
};

export type TransitionTarget = "ready_to_ship" | "shipped" | "delivered";

export function assertValidTransition(
  from: DeliveryFormStatus,
  to: TransitionTarget,
): void {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(`Transition impossible: ${from} → ${to}`);
  }
}

/**
 * Pure orchestration handler for delivery form status transitions.
 * Atomicity invariants:
 *   - Throws on cross-org BL, terminal status, or invalid transition BEFORE
 *     any write.
 *   - For the ready_to_ship → shipped transition only:
 *       - Reads each line product BEFORE any write.
 *       - Throws on cross-org / missing product BEFORE any write.
 *       - Calls assertSufficientStock BEFORE any write.
 *       - Then atomically decrements stock_qty + inserts stock_movements
 *         for every line (single Convex transaction).
 *   - For other transitions: a single patch on the delivery form document.
 *   - For shipped → delivered: also patches `delivered_at` to now.
 */
export async function transitionStatusHandler(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    id: Id<"delivery_forms">;
    target: TransitionTarget;
  },
): Promise<{ id: Id<"delivery_forms">; status: DeliveryFormStatus }> {
  const deliveryForm = await ctx.db.get(args.id);
  if (deliveryForm?.organization_id !== args.organizationId) {
    throw new Error("BL introuvable");
  }

  assertValidTransition(deliveryForm.status, args.target);

  if (args.target === "shipped") {
    const stockChecks: (StockCheckLine & {
      product: Doc<"products">;
    })[] = [];
    for (const line of deliveryForm.lines) {
      // eslint-disable-next-line no-await-in-loop -- transactional, sequential reads required
      const product = await ctx.db.get(line.product_id);
      if (product?.organization_id !== args.organizationId) {
        throw new Error(
          `Produit introuvable pour la ligne ${line.product_code}`,
        );
      }
      stockChecks.push({
        product,
        product_code: line.product_code,
        quantity: line.quantity,
        current_stock: product.stock_qty,
      });
    }

    assertSufficientStock(stockChecks);

    for (const { product, quantity } of stockChecks) {
      // eslint-disable-next-line no-await-in-loop -- transactional, sequential writes required
      await ctx.db.patch(product._id, {
        stock_qty: product.stock_qty - quantity,
      });
      // eslint-disable-next-line no-await-in-loop -- transactional, sequential writes required
      await ctx.db.insert("stock_movements", {
        organization_id: args.organizationId,
        product_id: product._id,
        delta: -quantity,
        reason: "delivery_form_out",
        reference_kind: "delivery_form",
        reference_id: deliveryForm._id,
        note: null,
      });
    }

    await ctx.db.patch(deliveryForm._id, { status: "shipped" });
    return { id: deliveryForm._id, status: "shipped" };
  }

  if (args.target === "delivered") {
    await ctx.db.patch(deliveryForm._id, {
      status: "delivered",
      delivered_at: Date.now(),
    });
    return { id: deliveryForm._id, status: "delivered" };
  }

  // target === "ready_to_ship"
  await ctx.db.patch(deliveryForm._id, { status: "ready_to_ship" });
  return { id: deliveryForm._id, status: "ready_to_ship" };
}

export const transitionStatus = orgMutation({
  roles: ["owner", "admin", "member"],
  args: {
    id: v.id("delivery_forms"),
    target: v.union(
      v.literal("ready_to_ship"),
      v.literal("shipped"),
      v.literal("delivered"),
    ),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ id: Id<"delivery_forms">; status: DeliveryFormStatus }> =>
    transitionStatusHandler(ctx, {
      organizationId: args.organizationId,
      id: args.id,
      target: args.target,
    }),
});

// Statuses where the stock has already left inventory and must be restored
// on cancellation. `in_preparation` and `ready_to_ship` never decremented
// stock, so cancelling from those statuses is just a status patch.
const STATUSES_WITH_STOCK_OUT: readonly DeliveryFormStatus[] = [
  "shipped",
  "delivered",
];

export async function cancelHandler(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    id: Id<"delivery_forms">;
    reason: string;
    cancelled_by: string;
  },
): Promise<{ id: Id<"delivery_forms">; restoredMovements: number }> {
  const reason = args.reason.trim();
  if (reason.length === 0) {
    throw new Error("Raison requise");
  }

  const deliveryForm = await ctx.db.get(args.id);
  if (deliveryForm?.organization_id !== args.organizationId) {
    throw new Error("BL introuvable");
  }

  if (deliveryForm.status === "cancelled") {
    throw new Error("BL déjà annulé");
  }
  if (deliveryForm.status === "invoiced") {
    throw new Error("BL déjà facturé — annulez la facture d'abord");
  }

  const shouldRestoreStock = STATUSES_WITH_STOCK_OUT.includes(
    deliveryForm.status,
  );

  if (!shouldRestoreStock) {
    // in_preparation / ready_to_ship: stock never moved, just patch status.
    await ctx.db.patch(deliveryForm._id, { status: "cancelled" });
    return { id: deliveryForm._id, restoredMovements: 0 };
  }

  // shipped / delivered: rebuild line/product pairs and validate cross-org
  // BEFORE any restore write (atomic rollback).
  const resolvedLines: {
    line: Doc<"delivery_forms">["lines"][number];
    product: Doc<"products">;
  }[] = [];
  for (const line of deliveryForm.lines) {
    // eslint-disable-next-line no-await-in-loop -- validate all products before writes
    const product = await ctx.db.get(line.product_id);
    if (product?.organization_id !== args.organizationId) {
      throw new Error("Produit introuvable");
    }
    resolvedLines.push({ line, product });
  }

  for (const { line, product } of resolvedLines) {
    // eslint-disable-next-line no-await-in-loop -- transactional rollback if any write fails
    await ctx.db.patch(product._id, {
      stock_qty: product.stock_qty + line.quantity,
    });
    // eslint-disable-next-line no-await-in-loop -- transactional rollback if any write fails
    await ctx.db.insert("stock_movements", {
      organization_id: args.organizationId,
      product_id: product._id,
      delta: line.quantity,
      reason: "manual_adjustment",
      reference_kind: "manual",
      reference_id: null,
      note: `Annulation BL ${deliveryForm.number}: ${reason}`,
    });
  }

  await ctx.db.patch(deliveryForm._id, { status: "cancelled" });

  return { id: deliveryForm._id, restoredMovements: resolvedLines.length };
}

export const cancel = orgMutation({
  roles: ["owner", "admin", "member"],
  args: {
    id: v.id("delivery_forms"),
    reason: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ id: Id<"delivery_forms">; restoredMovements: number }> =>
    cancelHandler(ctx, {
      organizationId: args.organizationId,
      id: args.id,
      reason: args.reason,
      cancelled_by: resolveCreatorEmail(ctx.orgAuth),
    }),
});
