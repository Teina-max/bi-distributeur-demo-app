/**
 * Wipe pagine — contourne la limite Convex 4096 reads/mutation en chainant
 * de petits batchs par table via une action externe.
 *
 * Pattern documente dans memories/learnings/2026-05-convex-mutation-pagination-budget.
 *
 * Usage :
 *   pnpm exec convex run seeds/wipePaginated:wipeAllPaginatedPublic
 *
 * Equivalent fonctionnel de wipe.ts mais sans hitter la limite reads.
 */

/* eslint-disable no-await-in-loop -- sequential batch deletes required */
import { action, internalMutation, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { TOSCANA_ORG_ID } from "./users";

const BATCH = 500;

type TableName =
  | "ticket_messages"
  | "support_tickets"
  | "stock_movements"
  | "invoices"
  | "delivery_forms"
  | "purchase_orders"
  | "quotations"
  | "document_counters"
  | "clients"
  | "products"
  | "suppliers";

/**
 * Internal: delete up to BATCH rows from a given table scoped to the demo org.
 * Returns { deleted, hasMore } so the caller can re-run until exhausted.
 */
export const deleteBatch = internalMutation({
  args: { table: v.string() },
  handler: async (ctx, { table }): Promise<{ deleted: number; hasMore: boolean }> => {
    if (table === "ticket_messages") {
      // ticket_messages is indexed by ticket, not org → scan via tickets first
      const tickets = await ctx.db
        .query("support_tickets")
        .withIndex("by_organization_and_creation", (q) =>
          q.eq("organization_id", TOSCANA_ORG_ID),
        )
        .take(50);
      let deleted = 0;
      for (const ticket of tickets) {
        const messages = await ctx.db
          .query("ticket_messages")
          .withIndex("by_ticket_and_creation", (q) => q.eq("ticket_id", ticket._id))
          .take(BATCH);
        for (const m of messages) {
          await ctx.db.delete(m._id);
          deleted += 1;
          if (deleted >= BATCH) break;
        }
        if (deleted >= BATCH) break;
      }
      return { deleted, hasMore: deleted >= BATCH };
    }

    const indexedTables = new Set<TableName>([
      "stock_movements",
      "invoices",
      "delivery_forms",
      "purchase_orders",
      "quotations",
      "support_tickets",
    ]);

    if (indexedTables.has(table as TableName)) {
      const rows = await ctx.db
        .query(table as TableName)
        // @ts-expect-error -- dynamic table name; we know the index exists for indexedTables members
        .withIndex("by_organization_and_creation", (q) =>
          q.eq("organization_id", TOSCANA_ORG_ID),
        )
        .take(BATCH);
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
      return { deleted: rows.length, hasMore: rows.length === BATCH };
    }

    if (table === "document_counters") {
      const rows = await ctx.db
        .query("document_counters")
        .withIndex("by_organization_kind_year", (q) =>
          q.eq("organization_id", TOSCANA_ORG_ID),
        )
        .take(BATCH);
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
      return { deleted: rows.length, hasMore: rows.length === BATCH };
    }

    if (table === "clients" || table === "products" || table === "suppliers") {
      const rows = await ctx.db
        .query(table as TableName)
        // @ts-expect-error -- dynamic table name; by_organization exists on clients/products/suppliers
        .withIndex("by_organization", (q) =>
          q.eq("organization_id", TOSCANA_ORG_ID),
        )
        .take(BATCH);
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
      return { deleted: rows.length, hasMore: rows.length === BATCH };
    }

    throw new Error(`Unknown table: ${table}`);
  },
});

/**
 * Public action: loops over each table in dependency order, calling deleteBatch
 * until exhausted. Each mutation stays well below the 4096 reads limit.
 *
 * Order matters because of foreign-key-like references:
 *   ticket_messages → tickets → docs (invoice/delivery/quotation) → catalog
 */
export const wipeAllPaginatedPublic = action({
  args: {},
  handler: async (ctx): Promise<Record<string, number>> => {
    const order: readonly TableName[] = [
      "ticket_messages",
      "support_tickets",
      "stock_movements",
      "invoices",
      "delivery_forms",
      "purchase_orders",
      "quotations",
      "document_counters",
      "clients",
      "products",
      "suppliers",
    ];

    const totals: Record<string, number> = {};
    for (const table of order) {
      let tableTotal = 0;
      let safety = 100; // ceiling: 100 batches × 500 = 50k rows / table
      while (safety > 0) {
        const result = await ctx.runMutation(internal.seeds.wipePaginated.deleteBatch, {
          table,
        });
        tableTotal += result.deleted;
        if (!result.hasMore) break;
        safety -= 1;
      }
      totals[table] = tableTotal;
    }
    return totals;
  },
});

/**
 * Compat wrapper for callers expecting the same name as the old wipe.ts.
 * Just calls the paginated action.
 */
export const wipePocAllPaginatedPublic = mutation({
  args: {},
  handler: async (): Promise<{ note: string }> => {
    return {
      note: "Use the action wipeAllPaginatedPublic instead — mutations cannot call themselves recursively. Run: pnpm exec convex run seeds/wipePaginated:wipeAllPaginatedPublic",
    };
  },
});
