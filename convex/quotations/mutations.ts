import { v } from "convex/values";
import { internal } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { orgMutation } from "@convex/auth/functions";
import { throwNotFound, throwValidationError } from "@convex/utils/errors";
import { yearTwoDigits, todayParisTimestamp } from "@convex/utils/dateFns";
import { recomputeTotals } from "./helpers";

const lineInput = v.object({
  product_id: v.id("products"),
  product_code: v.string(),
  product_name: v.string(),
  quantity: v.number(),
  unit_price_ht: v.number(),
  vat_rate: v.number(),
  line_total_ht: v.number(),
});

const resolveCreator = (orgAuth: {
  session: { user: { email?: string | null; id: string } };
}): string => {
  const email = orgAuth.session.user.email;
  return typeof email === "string" && email.length > 0
    ? email
    : orgAuth.session.user.id;
};

export const create = orgMutation({
  args: {
    client_id: v.id("clients"),
    lines: v.array(lineInput),
  },
  handler: async (ctx, args): Promise<Id<"quotations">> => {
    if (args.lines.length === 0) {
      throwValidationError("Devis vide : au moins une ligne requise.");
    }

    const client = await ctx.db.get(args.client_id);
    if (client?.organization_id !== args.organizationId) {
      throwNotFound("Client introuvable");
    }
    if (client.is_visible === false) {
      throwValidationError(
        "Client archivé : impossible de créer un nouveau devis",
      );
    }

    for (const line of args.lines) {
      // eslint-disable-next-line no-await-in-loop -- transactional gate, sequential reads
      const product = await ctx.db.get(line.product_id);
      if (product?.organization_id !== args.organizationId) {
        throwNotFound(`Produit introuvable: ${line.product_code}`);
      }
      if (product.is_active === false) {
        throwValidationError(
          `Produit inactif (${product.code}) : impossible de l'ajouter à un devis`,
        );
      }
    }

    const totals = recomputeTotals(args.lines);

    const number = await ctx.runMutation(
      internal.utils.numbering.allocateNumber,
      {
        organization_id: args.organizationId,
        kind: "quotation",
        year_prefix: yearTwoDigits(todayParisTimestamp()),
      },
    );

    const id = await ctx.db.insert("quotations", {
      organization_id: args.organizationId,
      client_id: args.client_id,
      number,
      status: "draft",
      lines: args.lines,
      total_ht: totals.total_ht,
      total_vat: totals.total_vat,
      total_ttc: totals.total_ttc,
      created_by: resolveCreator(ctx.orgAuth),
    });

    return id;
  },
});

export const updateDraft = orgMutation({
  args: {
    id: v.id("quotations"),
    client_id: v.id("clients"),
    lines: v.array(lineInput),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (doc?.organization_id !== args.organizationId) {
      throwNotFound("Devis introuvable");
    }
    if (doc.status !== "draft") {
      throwValidationError(`Devis non modifiable (statut ${doc.status}).`);
    }
    if (args.lines.length === 0) {
      throwValidationError("Devis vide : au moins une ligne requise.");
    }

    const client = await ctx.db.get(args.client_id);
    if (client?.organization_id !== args.organizationId) {
      throwNotFound("Client introuvable");
    }

    const totals = recomputeTotals(args.lines);
    await ctx.db.patch(args.id, {
      client_id: args.client_id,
      lines: args.lines,
      total_ht: totals.total_ht,
      total_vat: totals.total_vat,
      total_ttc: totals.total_ttc,
    });
    return { ok: true as const };
  },
});

export const deleteDraft = orgMutation({
  args: { id: v.id("quotations") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (doc?.organization_id !== args.organizationId) {
      throwNotFound("Devis introuvable");
    }
    if (doc.status !== "draft") {
      throwValidationError(`Devis non supprimable (statut ${doc.status}).`);
    }
    await ctx.db.delete(args.id);
    return { ok: true as const };
  },
});
