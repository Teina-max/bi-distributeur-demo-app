import { internalMutation, mutation } from "../_generated/server";
import { internal } from "@convex/_generated/api";
import { buildSearchTokens } from "../utils/searchTokens";
import { TOSCANA_ORG_ID } from "./users";
import { SUPPLIERS } from "./data/suppliers";
import { PRODUCTS } from "./data/products";
import { CLIENTS } from "./data/clients";

type SeedCounts = {
  suppliers: number;
  products: number;
  clients: number;
};

export const seedCatalog = internalMutation({
  args: {},
  handler: async (ctx): Promise<SeedCounts> => {
    const supplierResults = await Promise.all(
      SUPPLIERS.map(async (s) => {
        const existing = await ctx.db
          .query("suppliers")
          .withIndex("by_organization_and_code", (q) =>
            q.eq("organization_id", TOSCANA_ORG_ID).eq("code", s.code),
          )
          .unique();
        if (existing !== null) return 0 as const;
        await ctx.db.insert("suppliers", {
          organization_id: TOSCANA_ORG_ID,
          code: s.code,
          name: s.name,
          email: s.email,
          phone: s.phone,
          search_tokens: buildSearchTokens(s.code, s.name),
        });
        return 1 as const;
      }),
    );

    const productResults = await Promise.all(
      PRODUCTS.map(async (p) => {
        const existing = await ctx.db
          .query("products")
          .withIndex("by_organization_and_code", (q) =>
            q.eq("organization_id", TOSCANA_ORG_ID).eq("code", p.code),
          )
          .unique();
        if (existing !== null) return 0 as const;
        await ctx.db.insert("products", {
          organization_id: TOSCANA_ORG_ID,
          code: p.code,
          name: p.name,
          description: p.description,
          category: p.category,
          price_ht: p.price_ht,
          vat_rate: p.vat_rate,
          stock_qty: p.stock_qty,
          stock_threshold: null,
          is_active: true,
          search_tokens: buildSearchTokens(p.code, p.name, p.category),
        });
        return 1 as const;
      }),
    );

    const clientResults = await Promise.all(
      CLIENTS.map(async (c) => {
        const existing = await ctx.db
          .query("clients")
          .withIndex("by_organization_and_code", (q) =>
            q.eq("organization_id", TOSCANA_ORG_ID).eq("code", c.code),
          )
          .unique();
        if (existing !== null) return 0 as const;
        await ctx.db.insert("clients", {
          organization_id: TOSCANA_ORG_ID,
          code: c.code,
          name: c.name,
          type: c.type,
          email: c.email,
          phone: c.phone,
          address: c.address,
          payment_terms_days: c.payment_terms_days,
          payment_terms_label: c.payment_terms_label,
          search_tokens: buildSearchTokens(
            c.code,
            c.name,
            c.address.city,
            c.type,
          ),
        });
        return 1 as const;
      }),
    );

    return {
      suppliers: supplierResults.reduce((acc, v) => acc + v, 0 as number),
      products: productResults.reduce((acc, v) => acc + v, 0 as number),
      clients: clientResults.reduce((acc, v) => acc + v, 0 as number),
    };
  },
});

// POC wrapper — allows seeding from external scripts via ConvexHttpClient.
// Not protected by auth; acceptable for local dev seeding only.
export const seedCatalogPublic = mutation({
  args: {},
  handler: async (ctx): Promise<SeedCounts> => {
    return ctx.runMutation(internal.seeds.catalog.seedCatalog, {});
  },
});

// POC dev tool — wipe the catalog (clients + products + suppliers) for SARL
// Toscana org. Use AFTER wipePocDocumentsPublic so foreign-key references
// (quotation.client_id, line.product_id, etc.) are already gone.
// NOT protected by auth; POC only.
export const wipePocCatalogPublic = mutation({
  args: {},
  handler: async (ctx): Promise<SeedCounts> => {
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_organization", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .collect();
    await Promise.all(clients.map(async (row) => ctx.db.delete(row._id)));

    const products = await ctx.db
      .query("products")
      .withIndex("by_organization", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .collect();
    await Promise.all(products.map(async (row) => ctx.db.delete(row._id)));

    const suppliers = await ctx.db
      .query("suppliers")
      .withIndex("by_organization", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .collect();
    await Promise.all(suppliers.map(async (row) => ctx.db.delete(row._id)));

    return {
      clients: clients.length,
      products: products.length,
      suppliers: suppliers.length,
    };
  },
});
