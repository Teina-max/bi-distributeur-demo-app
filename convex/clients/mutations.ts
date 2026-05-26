import { v } from "convex/values";
import type { Id } from "@convex/_generated/dataModel";
import type { MutationCtx } from "@convex/_generated/server";
import { orgMutation } from "@convex/auth/functions";
import { buildSearchTokens } from "@convex/utils/searchTokens";

const clientPatch = v.object({
  code: v.optional(v.string()),
  name: v.optional(v.string()),
  type: v.optional(v.string()),
  email: v.optional(v.union(v.string(), v.null())),
  phone: v.optional(v.union(v.string(), v.null())),
  address: v.optional(
    v.object({
      street: v.string(),
      postal_code: v.string(),
      city: v.string(),
      country: v.string(),
    }),
  ),
  payment_terms_days: v.optional(v.number()),
  payment_terms_label: v.optional(v.string()),
  correspondent: v.optional(v.union(v.string(), v.null())),
  vendor: v.optional(v.union(v.string(), v.null())),
  sector: v.optional(v.union(v.string(), v.null())),
  depot_cafe: v.optional(v.union(v.string(), v.null())),
  accounting_code: v.optional(v.union(v.string(), v.null())),
  credit_limit: v.optional(v.union(v.number(), v.null())),
  global_discount_pct: v.optional(v.number()),
  tariff_level: v.optional(v.number()),
  vat_intra: v.optional(v.union(v.string(), v.null())),
  notes: v.optional(v.string()),
});

type ClientPatch = {
  code?: string;
  name?: string;
  type?: string;
  email?: string | null;
  phone?: string | null;
  address?: {
    street: string;
    postal_code: string;
    city: string;
    country: string;
  };
  payment_terms_days?: number;
  payment_terms_label?: string;
  correspondent?: string | null;
  vendor?: string | null;
  sector?: string | null;
  depot_cafe?: string | null;
  accounting_code?: string | null;
  credit_limit?: number | null;
  global_discount_pct?: number;
  tariff_level?: number;
  vat_intra?: string | null;
  notes?: string;
};

/**
 * Pure orchestration handler — exposed for tests with a mocked MutationCtx.
 * Org gating is enforced here; role gating ("owner" | "admin" | "member") lives
 * on the `orgMutation` wrapper below.
 */
export async function updateClientHandler(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    id: Id<"clients">;
    patch: ClientPatch;
  },
): Promise<void> {
  const client = await ctx.db.get(args.id);
  if (client?.organization_id !== args.organizationId) {
    throw new Error("Client introuvable");
  }

  if (
    args.patch.payment_terms_days !== undefined &&
    !Number.isFinite(args.patch.payment_terms_days)
  ) {
    throw new Error("Délai de paiement invalide");
  }

  const patch: Record<string, unknown> = { ...args.patch };

  if (args.patch.code !== undefined || args.patch.name !== undefined) {
    const nextCode = args.patch.code ?? client.code;
    const nextName = args.patch.name ?? client.name;
    patch.search_tokens = buildSearchTokens(nextCode, nextName);
  }

  await ctx.db.patch(args.id, patch);
}

export const updateClient = orgMutation({
  roles: ["owner", "admin", "member"],
  args: {
    id: v.id("clients"),
    patch: clientPatch,
  },
  handler: async (ctx, args): Promise<void> =>
    updateClientHandler(ctx, {
      organizationId: args.organizationId,
      id: args.id,
      patch: args.patch,
    }),
});

/**
 * Forces `is_visible: false`. Admin-only at the wrapper level (no "member").
 */
export async function archiveClientHandler(
  ctx: MutationCtx,
  args: {
    organizationId: string;
    id: Id<"clients">;
  },
): Promise<void> {
  const client = await ctx.db.get(args.id);
  if (client?.organization_id !== args.organizationId) {
    throw new Error("Client introuvable");
  }
  await ctx.db.patch(args.id, { is_visible: false });
}

// Role gating trust boundary: `archiveClient` is intentionally restricted to
// `["owner", "admin"]` at the `orgMutation` builder level. The handler itself
// does NOT re-check the role — we trust the builder. Tests cover the handler's
// behavior; the role gate is verified by the type/config of `orgMutation`.
export const archiveClient = orgMutation({
  roles: ["owner", "admin"],
  args: { id: v.id("clients") },
  handler: async (ctx, args): Promise<void> =>
    archiveClientHandler(ctx, {
      organizationId: args.organizationId,
      id: args.id,
    }),
});
