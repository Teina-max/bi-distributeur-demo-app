import { v } from "convex/values";
import type { Id } from "@convex/_generated/dataModel";
import type { MutationCtx } from "@convex/_generated/server";
import { orgMutation } from "@convex/auth/functions";
import { buildSearchTokens } from "@convex/utils/searchTokens";

const productPatch = v.object({
  code: v.optional(v.string()),
  name: v.optional(v.string()),
  description: v.optional(v.string()),
  category: v.optional(v.string()),
  price_ht: v.optional(v.number()),
  vat_rate: v.optional(v.number()),
  stock_threshold: v.optional(v.union(v.number(), v.null())),
  is_active: v.optional(v.boolean()),
  conditioning: v.optional(v.union(v.string(), v.null())),
  sub_family: v.optional(v.union(v.string(), v.null())),
  family_code: v.optional(v.union(v.string(), v.null())),
  supplier_id: v.optional(v.union(v.id("suppliers"), v.null())),
  supplier_ref: v.optional(v.union(v.string(), v.null())),
  accounting_sale_code: v.optional(v.union(v.string(), v.null())),
  accounting_purchase_code: v.optional(v.union(v.string(), v.null())),
  purchase_price_ht: v.optional(v.number()),
  price_2_ttc: v.optional(v.number()),
  price_3_ttc: v.optional(v.number()),
});

type ProductPatch = {
  code?: string;
  name?: string;
  description?: string;
  category?: string;
  price_ht?: number;
  vat_rate?: number;
  stock_threshold?: number | null;
  is_active?: boolean;
  conditioning?: string | null;
  sub_family?: string | null;
  family_code?: string | null;
  supplier_id?: Id<"suppliers"> | null;
  supplier_ref?: string | null;
  accounting_sale_code?: string | null;
  accounting_purchase_code?: string | null;
  purchase_price_ht?: number;
  price_2_ttc?: number;
  price_3_ttc?: number;
};

/**
 * Pure orchestration handler — exposed for tests with a mocked MutationCtx.
 * Org gating is enforced here; role gating ("owner" | "admin" | "member") lives
 * on the `orgMutation` wrapper below.
 */
export async function updateProductHandler(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    id: Id<"products">;
    patch: ProductPatch;
  },
): Promise<void> {
  const product = await ctx.db.get(args.id);
  if (product?.organization_id !== args.organizationId) {
    throw new Error("Produit introuvable");
  }

  const patch: Record<string, unknown> = { ...args.patch };

  if (args.patch.code !== undefined || args.patch.name !== undefined) {
    const nextCode = args.patch.code ?? product.code;
    const nextName = args.patch.name ?? product.name;
    patch.search_tokens = buildSearchTokens(nextCode, nextName);
  }

  await ctx.db.patch(args.id, patch);
}

export const updateProduct = orgMutation({
  roles: ["owner", "admin", "member"],
  args: {
    id: v.id("products"),
    patch: productPatch,
  },
  handler: async (ctx, args): Promise<void> =>
    updateProductHandler(ctx, {
      organizationId: args.organizationId,
      id: args.id,
      patch: args.patch,
    }),
});

/**
 * Flips `is_active`. Org gating in handler; role gating in wrapper.
 */
export async function toggleActiveHandler(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    id: Id<"products">;
  },
): Promise<void> {
  const product = await ctx.db.get(args.id);
  if (product?.organization_id !== args.organizationId) {
    throw new Error("Produit introuvable");
  }
  await ctx.db.patch(args.id, { is_active: !product.is_active });
}

export const toggleActive = orgMutation({
  roles: ["owner", "admin", "member"],
  args: { id: v.id("products") },
  handler: async (ctx, args): Promise<void> =>
    toggleActiveHandler(ctx, {
      organizationId: args.organizationId,
      id: args.id,
    }),
});

/**
 * Forces `is_active: false`. Admin-only at the wrapper level (no "member").
 */
export async function archiveProductHandler(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    id: Id<"products">;
  },
): Promise<void> {
  const product = await ctx.db.get(args.id);
  if (product?.organization_id !== args.organizationId) {
    throw new Error("Produit introuvable");
  }
  await ctx.db.patch(args.id, { is_active: false });
}

// Role gating trust boundary: `archiveProduct` is intentionally restricted to
// `["owner", "admin"]` at the `orgMutation` builder level. The handler itself
// does NOT re-check the role — we trust the builder. Tests cover the handler's
// behavior; the role gate is verified by the type/config of `orgMutation`.
export const archiveProduct = orgMutation({
  roles: ["owner", "admin"],
  args: { id: v.id("products") },
  handler: async (ctx, args): Promise<void> =>
    archiveProductHandler(ctx, {
      organizationId: args.organizationId,
      id: args.id,
    }),
});

/**
 * Manual stock adjustment with audit trail in `stock_movements`.
 * Org gating in handler; role gating in wrapper.
 */
export async function adjustStockHandler(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    id: Id<"products">;
    delta: number;
    reason: string;
  },
): Promise<void> {
  if (!Number.isFinite(args.delta) || args.delta === 0) {
    throw new Error("Delta invalide (doit être non nul)");
  }
  const trimmedReason = args.reason.trim();
  if (trimmedReason.length === 0) {
    throw new Error("Raison obligatoire pour ajustement stock");
  }

  const product = await ctx.db.get(args.id);
  if (product?.organization_id !== args.organizationId) {
    throw new Error("Produit introuvable");
  }

  const next = product.stock_qty + args.delta;
  if (next < 0) {
    throw new Error("Stock résultant négatif refusé");
  }

  await ctx.db.patch(args.id, { stock_qty: next });
  await ctx.db.insert("stock_movements", {
    organization_id: args.organizationId,
    product_id: args.id,
    delta: args.delta,
    reason: "manual_adjustment",
    reference_kind: "manual",
    reference_id: null,
    note: trimmedReason,
  });
}

export const adjustStock = orgMutation({
  roles: ["owner", "admin", "member"],
  args: {
    id: v.id("products"),
    delta: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args): Promise<void> =>
    adjustStockHandler(ctx, {
      organizationId: args.organizationId,
      id: args.id,
      delta: args.delta,
      reason: args.reason,
    }),
});
