/* eslint-disable no-await-in-loop -- batches stay sequential to stay inside Convex write budget. */
// Seed `legacy_unknown_aliases` à partir du CSV enrichi produit par
// `scripts/import-heritage/extract-legacy-aliases.ts`.
//
// Diffère du flow standard (`bulkUpsertUnknownAliasesPublic` dans
// `actions.ts`) sur deux points :
//   1. on accepte des `total_ca_ht`, `first_seen`, `last_seen` non triviaux,
//   2. l'opération est idempotente : si un alias existe déjà avec le même
//      `normalized_name`, on patch les compteurs au lieu d'insérer un
//      doublon. Permet de relancer le seed sans wipe préalable.
//
// Audit Finding #3 — Top clients fantômes (HYPER LECLERC, GEANT CASINO POVO,
// etc.) restaurés ici dans `legacy_unknown_aliases` avec
// `resolution_method: "pending"` en attendant arbitrage Marco/Luca.

import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { TOSCANA_ORG_ID } from "../seeds/users";
import {
  toLegacyImportReportDto,
  type LegacyImportReportDto,
} from "./dto/legacyImportReport";

const seedAliasRowArg = v.object({
  raw_name: v.string(),
  normalized_name: v.string(),
  occurrence_count: v.number(),
  total_ca_ht: v.number(),
  first_seen: v.number(),
  last_seen: v.number(),
});

export const seedLegacyUnknownAliases = internalMutation({
  args: { rows: v.array(seedAliasRowArg) },
  handler: async (
    ctx,
    args,
  ): Promise<{ inserted: number; updated: number }> => {
    let inserted = 0;
    let updated = 0;

    for (const row of args.rows) {
      const existing = await ctx.db
        .query("legacy_unknown_aliases")
        .withIndex("by_organization_and_normalized", (q) =>
          q
            .eq("organization_id", TOSCANA_ORG_ID)
            .eq("normalized_name", row.normalized_name),
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          raw_name: row.raw_name,
          occurrence_count: row.occurrence_count,
          total_ca_ht: row.total_ca_ht,
          first_seen: row.first_seen,
          last_seen: row.last_seen,
        });
        updated++;
        continue;
      }

      await ctx.db.insert("legacy_unknown_aliases", {
        organization_id: TOSCANA_ORG_ID,
        raw_name: row.raw_name,
        normalized_name: row.normalized_name,
        occurrence_count: row.occurrence_count,
        total_ca_ht: row.total_ca_ht,
        first_seen: row.first_seen,
        last_seen: row.last_seen,
        resolved_client_id: null,
        resolution_method: "pending",
      });
      inserted++;
    }

    return { inserted, updated };
  },
});

export const seedLegacyUnknownAliasesPublic = mutation({
  args: { rows: v.array(seedAliasRowArg) },
  handler: async (ctx, args): Promise<LegacyImportReportDto> => {
    const res = await ctx.runMutation(
      internal.legacy.seedAliases.seedLegacyUnknownAliases,
      args,
    );
    return toLegacyImportReportDto({
      inserted: res.inserted,
      updated: res.updated,
    });
  },
});
