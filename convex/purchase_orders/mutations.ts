import { v } from "convex/values";
import { internal } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { mutation, type MutationCtx } from "@convex/_generated/server";
import { orgMutation } from "@convex/auth/functions";
import { yearTwoDigits, todayParisTimestamp } from "@convex/utils/dateFns";
import {
  buildPurchaseLineSnapshot,
  recomputeSupplyTotals,
  assertReceivablePurchaseOrderStatus,
  nextPurchaseOrderStatusAfterReceipts,
  type SupplyLineSnapshot,
} from "./helpers";

const supplyLineInput = v.object({
  product_id: v.id("products"),
  product_code: v.string(),
  product_name: v.string(),
  quantity_ordered: v.number(),
  unit_purchase_price_ht: v.number(),
  vat_rate: v.number(),
});

const receiveLineInput = v.object({
  product_id: v.id("products"),
  delta: v.number(),
});

type SupplyLineInputArg = {
  product_id: Id<"products">;
  product_code: string;
  product_name: string;
  quantity_ordered: number;
  unit_purchase_price_ht: number;
  vat_rate: number;
};

type ReceiveLineArg = {
  product_id: Id<"products">;
  delta: number;
};

const resolveCreator = (orgAuth: {
  session: { user: { email?: string | null; id: string } };
}): string => {
  const email = orgAuth.session.user.email;
  return typeof email === "string" && email.length > 0
    ? email
    : orgAuth.session.user.id;
};

/**
 * Pure orchestration handler for BC creation — exposed for tests with mocked MutationCtx.
 * - Validates supplier ownership BEFORE allocating a number.
 * - Snapshots prix d'achat immutables.
 * - Returns the inserted purchase order id.
 */
export async function createPurchaseOrderHandler(
  ctx: MutationCtx & {
    orgAuth: { session: { user: { email?: string | null; id: string } } };
  },
  args: {
    organizationId: string;
    supplier_id: Id<"suppliers">;
    lines: readonly SupplyLineInputArg[];
  },
): Promise<Id<"purchase_orders">> {
  if (args.lines.length === 0) {
    throw new Error("BC vide : au moins une ligne requise.");
  }

  const supplier = await ctx.db.get(args.supplier_id);
  if (supplier?.organization_id !== args.organizationId) {
    throw new Error("Fournisseur introuvable");
  }

  // Refuser l'ajout de produits inactifs sur un nouveau BC.
  for (const line of args.lines) {
    // eslint-disable-next-line no-await-in-loop -- transactional gate, sequential reads
    const product = await ctx.db.get(line.product_id);
    if (product?.organization_id !== args.organizationId) {
      throw new Error(`Produit introuvable: ${line.product_code}`);
    }
    if (product.is_active === false) {
      throw new Error(
        `Produit inactif (${product.code}) : impossible de l'ajouter à un BC`,
      );
    }
  }

  const snapshots: SupplyLineSnapshot[] = args.lines.map((line) =>
    buildPurchaseLineSnapshot(line),
  );
  const totals = recomputeSupplyTotals(snapshots);

  const number: string = await ctx.runMutation(
    internal.utils.numbering.allocateNumber,
    {
      organization_id: args.organizationId,
      kind: "purchase_order",
      year_prefix: yearTwoDigits(todayParisTimestamp()),
    },
  );

  return ctx.db.insert("purchase_orders", {
    organization_id: args.organizationId,
    supplier_id: args.supplier_id,
    number,
    status: "draft",
    lines: snapshots,
    total_ht: totals.total_ht,
    total_ttc: totals.total_ttc,
    received_at: null,
    created_by: resolveCreator(ctx.orgAuth),
  });
}

export const create = orgMutation({
  roles: ["owner", "admin", "member"],
  args: {
    supplier_id: v.id("suppliers"),
    lines: v.array(supplyLineInput),
  },
  handler: async (ctx, args): Promise<Id<"purchase_orders">> =>
    createPurchaseOrderHandler(ctx, args),
});

export const updateDraft = orgMutation({
  roles: ["owner", "admin", "member"],
  args: {
    id: v.id("purchase_orders"),
    supplier_id: v.id("suppliers"),
    lines: v.array(supplyLineInput),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (doc?.organization_id !== args.organizationId) {
      throw new Error("BC introuvable");
    }
    if (doc.status !== "draft") {
      throw new Error(`BC non modifiable (statut ${doc.status}).`);
    }
    if (args.lines.length === 0) {
      throw new Error("BC vide : au moins une ligne requise.");
    }
    const supplier = await ctx.db.get(args.supplier_id);
    if (supplier?.organization_id !== args.organizationId) {
      throw new Error("Fournisseur introuvable");
    }
    const snapshots: SupplyLineSnapshot[] = args.lines.map((line) =>
      buildPurchaseLineSnapshot(line),
    );
    const totals = recomputeSupplyTotals(snapshots);
    await ctx.db.patch(args.id, {
      supplier_id: args.supplier_id,
      lines: snapshots,
      total_ht: totals.total_ht,
      total_ttc: totals.total_ttc,
    });
    return { ok: true as const };
  },
});

/**
 * Pure orchestration handler for BC réception — exposed for tests with mocked MutationCtx.
 *
 * Atomicity invariants:
 *   - Throws on bad BC status BEFORE any read of products.
 *   - Throws on per-line overflow validation BEFORE any write (patch BC, patch products, insert movements).
 *   - All subsequent writes run inside the same Convex transaction, so a runtime throw
 *     between them rolls back the whole mutation. The test "overflow ligne 2 → no side-effect"
 *     enforces this guarantee at the handler level.
 */
export async function receivePurchaseOrderHandler(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    id: Id<"purchase_orders">;
    receipts: readonly ReceiveLineArg[];
  },
): Promise<{ status: Doc<"purchase_orders">["status"] }> {
  // 1. Read BC + cross-org isolation
  const doc = await ctx.db.get(args.id);
  if (doc?.organization_id !== args.organizationId) {
    throw new Error("BC introuvable");
  }

  // 2. Status gate (idempotence: 'received' / 'cancelled' throws here)
  assertReceivablePurchaseOrderStatus(doc.status);

  // 3. Build delta map keyed by product_id (one product = one line, by spec invariant)
  const deltaByProduct = new Map<string, number>();
  for (const r of args.receipts) {
    if (r.delta < 0) {
      throw new Error("Delta négatif interdit");
    }
    if (r.delta === 0) continue;
    const key = String(r.product_id);
    const existing = deltaByProduct.get(key) ?? 0;
    deltaByProduct.set(key, existing + r.delta);
  }

  // 4. Validate overflow per line BEFORE any write (atomicity proof)
  const updatedLines: SupplyLineSnapshot[] = doc.lines.map((line) => {
    const delta = deltaByProduct.get(String(line.product_id)) ?? 0;
    if (delta === 0) return line;
    const newQtyReceived = line.quantity_received + delta;
    if (newQtyReceived > line.quantity_ordered) {
      throw new Error(
        `Réception ligne ${line.product_code} excède commandé: max ${
          line.quantity_ordered - line.quantity_received
        }`,
      );
    }
    return { ...line, quantity_received: newQtyReceived };
  });

  // 5. Compute next status
  const nextStatus = nextPurchaseOrderStatusAfterReceipts(
    updatedLines,
    doc.status,
  );
  const nowReceivedAt =
    nextStatus === "received" && doc.received_at === null
      ? Date.now()
      : doc.received_at;

  // 6. Patch BC (lines + status + received_at)
  await ctx.db.patch(args.id, {
    lines: updatedLines,
    status: nextStatus,
    received_at: nowReceivedAt,
  });

  // 7. For each line with delta > 0: patch product stock + insert stock_movement
  for (const line of doc.lines) {
    const delta = deltaByProduct.get(String(line.product_id)) ?? 0;
    if (delta === 0) continue;
    // eslint-disable-next-line no-await-in-loop -- transactional, sequential reads required
    const product = await ctx.db.get(line.product_id);
    if (product?.organization_id !== args.organizationId) {
      throw new Error(`Produit introuvable pour la ligne ${line.product_code}`);
    }
    // eslint-disable-next-line no-await-in-loop -- transactional, sequential writes required
    await ctx.db.patch(line.product_id, {
      stock_qty: product.stock_qty + delta,
    });
    // eslint-disable-next-line no-await-in-loop -- transactional, sequential writes required
    await ctx.db.insert("stock_movements", {
      organization_id: args.organizationId,
      product_id: line.product_id,
      delta,
      reason: "purchase_order_in",
      reference_kind: "purchase_order",
      reference_id: args.id,
      note: null,
    });
  }

  return { status: nextStatus };
}

export const receive = orgMutation({
  roles: ["owner", "admin", "member"],
  args: {
    id: v.id("purchase_orders"),
    receipts: v.array(receiveLineInput),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ status: Doc<"purchase_orders">["status"] }> =>
    receivePurchaseOrderHandler(ctx, args),
});

/**
 * POC live-test runner — invokes receivePurchaseOrderHandler with an explicit
 * organization_id. NOT protected by auth — POC local-dev runtime atomicity
 * proof only. SAFE TO REMOVE once Phase 1 lands.
 */
export const __runReceiveForLiveTest = mutation({
  args: {
    organization_id: v.string(),
    id: v.id("purchase_orders"),
    receipts: v.array(receiveLineInput),
  },
  handler: async (ctx, args) =>
    receivePurchaseOrderHandler(ctx, {
      organizationId: args.organization_id,
      id: args.id,
      receipts: args.receipts,
    }),
});

/**
 * POC sandbox seed for L5 live test only.
 * Creates one purchase_order with N lines from existing seeded suppliers + products.
 * NOT protected by auth — POC local-dev seeding only.
 * SAFE TO REMOVE once Phase 1 lands.
 */
export const __seedPurchaseOrderForLiveTest = mutation({
  args: {
    organization_id: v.string(),
    supplier_code: v.string(),
    product_codes: v.array(v.string()),
    quantities_ordered: v.array(v.number()),
    purchase_prices: v.array(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ id: Id<"purchase_orders">; number: string }> => {
    if (
      args.product_codes.length !== args.quantities_ordered.length ||
      args.product_codes.length !== args.purchase_prices.length
    ) {
      throw new Error("product_codes / quantities / prices length mismatch");
    }
    const supplier = await ctx.db
      .query("suppliers")
      .withIndex("by_organization_and_code", (q) =>
        q
          .eq("organization_id", args.organization_id)
          .eq("code", args.supplier_code),
      )
      .unique();
    if (!supplier) {
      throw new Error(`Fournisseur introuvable: ${args.supplier_code}`);
    }

    const snapshots: SupplyLineSnapshot[] = [];
    for (let i = 0; i < args.product_codes.length; i += 1) {
      const code = args.product_codes[i] as string;
      const qty = args.quantities_ordered[i] as number;
      const pu = args.purchase_prices[i] as number;
      // eslint-disable-next-line no-await-in-loop -- sequential reads required
      const product = await ctx.db
        .query("products")
        .withIndex("by_organization_and_code", (q) =>
          q.eq("organization_id", args.organization_id).eq("code", code),
        )
        .unique();
      if (!product) throw new Error(`Produit introuvable: ${code}`);
      snapshots.push(
        buildPurchaseLineSnapshot({
          product_id: product._id,
          product_code: product.code,
          product_name: product.name,
          quantity_ordered: qty,
          unit_purchase_price_ht: pu,
          vat_rate: product.vat_rate,
        }),
      );
    }
    const totals = recomputeSupplyTotals(snapshots);

    const yearPrefix = yearTwoDigits(todayParisTimestamp());
    const number: string = await ctx.runMutation(
      internal.utils.numbering.allocateNumber,
      {
        organization_id: args.organization_id,
        kind: "purchase_order",
        year_prefix: yearPrefix,
      },
    );

    const id: Id<"purchase_orders"> = await ctx.db.insert("purchase_orders", {
      organization_id: args.organization_id,
      supplier_id: supplier._id,
      number,
      status: "draft",
      lines: snapshots,
      total_ht: totals.total_ht,
      total_ttc: totals.total_ttc,
      received_at: null,
      created_by: "live-test-fixture",
    });

    return { id, number };
  },
});
