import { internalMutation, mutation } from "../_generated/server";
import { internal } from "@convex/_generated/api";
import { TOSCANA_ORG_ID } from "./users";
import { todayParisTimestamp, addDays, yearTwoDigits } from "../utils/dateFns";
import { computeVatBreakdown } from "../utils/vatBreakdown";

type SeedDocumentsCounts = {
  quotations: number;
  delivery_forms: number;
  invoices: number;
  purchase_orders: number;
  stock_movements: number;
};

const SEED_USER = "teina@toscana.local";

export const seedTodayDocuments = internalMutation({
  args: {},
  handler: async (ctx): Promise<SeedDocumentsCounts> => {
    const existingQuotation = await ctx.db
      .query("quotations")
      .withIndex("by_organization_and_creation", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .first();
    if (existingQuotation !== null) {
      return {
        quotations: 0,
        delivery_forms: 0,
        invoices: 0,
        purchase_orders: 0,
        stock_movements: 0,
      };
    }

    const year = yearTwoDigits(todayParisTimestamp());

    const bistrotDuPort = await ctx.db
      .query("clients")
      .withIndex("by_organization_and_code", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID).eq("code", "C001234"),
      )
      .unique();
    const hotelDuPort = await ctx.db
      .query("clients")
      .withIndex("by_organization_and_code", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID).eq("code", "C000891"),
      )
      .unique();
    const caf1 = await ctx.db
      .query("products")
      .withIndex("by_organization_and_code", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID).eq("code", "CAF-001-1KG"),
      )
      .unique();
    const caf2 = await ctx.db
      .query("products")
      .withIndex("by_organization_and_code", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID).eq("code", "CAF-002-1KG"),
      )
      .unique();
    const filt = await ctx.db
      .query("products")
      .withIndex("by_organization_and_code", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID).eq("code", "ACC-FILT-01"),
      )
      .unique();
    const toscanoDistrib = await ctx.db
      .query("suppliers")
      .withIndex("by_organization_and_code", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID).eq("code", "FRN-001"),
      )
      .unique();

    if (!bistrotDuPort || !hotelDuPort || !caf1 || !caf2 || !filt || !toscanoDistrib) {
      throw new Error(
        "Seed catalog first (clients C001234/C000891, products CAF-001-1KG/CAF-002-1KG/ACC-FILT-01, supplier FRN-001 must exist)",
      );
    }

    // Quotation #1 — BISTROT DU PORT, 3 lines, converted to delivery
    const linesQ1 = [
      {
        product_id: caf1._id,
        product_code: caf1.code,
        product_name: caf1.name,
        quantity: 5,
        unit_price_ht: caf1.price_ht,
        vat_rate: caf1.vat_rate,
        line_total_ht: 5 * caf1.price_ht,
      },
      {
        product_id: caf2._id,
        product_code: caf2.code,
        product_name: caf2.name,
        quantity: 2,
        unit_price_ht: caf2.price_ht,
        vat_rate: caf2.vat_rate,
        line_total_ht: 2 * caf2.price_ht,
      },
      {
        product_id: filt._id,
        product_code: filt.code,
        product_name: filt.name,
        quantity: 10,
        unit_price_ht: filt.price_ht,
        vat_rate: filt.vat_rate,
        line_total_ht: 10 * filt.price_ht,
      },
    ] as const;
    const breakdownQ1 = computeVatBreakdown(
      linesQ1.map((l) => ({
        quantity: l.quantity,
        unit_price_ht: l.unit_price_ht,
        vat_rate: l.vat_rate,
      })),
    );

    const qNumberQ1: string = await ctx.runMutation(
      internal.utils.numbering.allocateNumber,
      {
        organization_id: TOSCANA_ORG_ID,
        kind: "quotation",
        year_prefix: year,
      },
    );
    const quotation1Id = await ctx.db.insert("quotations", {
      organization_id: TOSCANA_ORG_ID,
      client_id: bistrotDuPort._id,
      number: qNumberQ1,
      status: "converted_to_delivery",
      lines: [...linesQ1],
      total_ht: breakdownQ1.total_ht,
      total_vat: breakdownQ1.total_vat,
      total_ttc: breakdownQ1.total_ttc,
      created_by: SEED_USER,
    });

    // Delivery form #1 — linked to quotation #1, invoiced
    const bNumberB1: string = await ctx.runMutation(
      internal.utils.numbering.allocateNumber,
      {
        organization_id: TOSCANA_ORG_ID,
        kind: "delivery_form",
        year_prefix: year,
      },
    );
    const delivery1Id = await ctx.db.insert("delivery_forms", {
      organization_id: TOSCANA_ORG_ID,
      quotation_id: quotation1Id,
      client_id: bistrotDuPort._id,
      number: bNumberB1,
      status: "invoiced",
      lines: [...linesQ1],
      total_ht: breakdownQ1.total_ht,
      total_ttc: breakdownQ1.total_ttc,
      delivered_at: todayParisTimestamp(),
      created_by: SEED_USER,
    });

    // Stock movements — one per line, negative delta
    await Promise.all(
      linesQ1.map(async (line) =>
        ctx.db.insert("stock_movements", {
          organization_id: TOSCANA_ORG_ID,
          product_id: line.product_id,
          delta: -line.quantity,
          reason: "delivery_form_out",
          reference_kind: "delivery_form",
          reference_id: delivery1Id,
          note: `BL ${bNumberB1}`,
        }),
      ),
    );
    const stockMovements = linesQ1.length;

    // Invoice #1 — linked to delivery form #1, sent
    const fNumberF1: string = await ctx.runMutation(
      internal.utils.numbering.allocateNumber,
      {
        organization_id: TOSCANA_ORG_ID,
        kind: "invoice",
        year_prefix: year,
      },
    );
    await ctx.db.insert("invoices", {
      organization_id: TOSCANA_ORG_ID,
      delivery_form_ids: [delivery1Id],
      client_id: bistrotDuPort._id,
      number: fNumberF1,
      status: "sent",
      total_ht: breakdownQ1.total_ht,
      total_ttc: breakdownQ1.total_ttc,
      due_date: addDays(todayParisTimestamp(), bistrotDuPort.payment_terms_days),
      sent_at: todayParisTimestamp(),
    });

    // Quotation #2 — HOTEL DU PORT MEDITERRANEE, 2 lines, draft
    const linesQ2 = [
      {
        product_id: caf2._id,
        product_code: caf2.code,
        product_name: caf2.name,
        quantity: 3,
        unit_price_ht: caf2.price_ht,
        vat_rate: caf2.vat_rate,
        line_total_ht: 3 * caf2.price_ht,
      },
      {
        product_id: filt._id,
        product_code: filt.code,
        product_name: filt.name,
        quantity: 5,
        unit_price_ht: filt.price_ht,
        vat_rate: filt.vat_rate,
        line_total_ht: 5 * filt.price_ht,
      },
    ] as const;
    const breakdownQ2 = computeVatBreakdown(
      linesQ2.map((l) => ({
        quantity: l.quantity,
        unit_price_ht: l.unit_price_ht,
        vat_rate: l.vat_rate,
      })),
    );
    const qNumberQ2: string = await ctx.runMutation(
      internal.utils.numbering.allocateNumber,
      {
        organization_id: TOSCANA_ORG_ID,
        kind: "quotation",
        year_prefix: year,
      },
    );
    await ctx.db.insert("quotations", {
      organization_id: TOSCANA_ORG_ID,
      client_id: hotelDuPort._id,
      number: qNumberQ2,
      status: "draft",
      lines: [...linesQ2],
      total_ht: breakdownQ2.total_ht,
      total_vat: breakdownQ2.total_vat,
      total_ttc: breakdownQ2.total_ttc,
      created_by: SEED_USER,
    });

    // Purchase order — Toscano Italia Distribuzione, 2 lines, sent (not yet received)
    const poLines = [
      {
        product_id: caf1._id,
        product_code: caf1.code,
        product_name: caf1.name,
        quantity_ordered: 50,
        quantity_received: 0,
        unit_purchase_price_ht: 11.0,
        vat_rate: caf1.vat_rate,
      },
      {
        product_id: caf2._id,
        product_code: caf2.code,
        product_name: caf2.name,
        quantity_ordered: 30,
        quantity_received: 0,
        unit_purchase_price_ht: 12.5,
        vat_rate: caf2.vat_rate,
      },
    ] as const;
    const poBreakdown = computeVatBreakdown(
      poLines.map((l) => ({
        quantity: l.quantity_ordered,
        unit_price_ht: l.unit_purchase_price_ht,
        vat_rate: l.vat_rate,
      })),
    );
    const bcNumber: string = await ctx.runMutation(
      internal.utils.numbering.allocateNumber,
      {
        organization_id: TOSCANA_ORG_ID,
        kind: "purchase_order",
        year_prefix: year,
      },
    );
    await ctx.db.insert("purchase_orders", {
      organization_id: TOSCANA_ORG_ID,
      supplier_id: toscanoDistrib._id,
      number: bcNumber,
      status: "sent",
      lines: [...poLines],
      total_ht: poBreakdown.total_ht,
      total_ttc: poBreakdown.total_ttc,
      received_at: null,
      created_by: SEED_USER,
    });

    return {
      quotations: 2,
      delivery_forms: 1,
      invoices: 1,
      purchase_orders: 1,
      stock_movements: stockMovements,
    };
  },
});

// POC dev tool — wipe every document table for Toscana Beverages SARL org so seeding
// can re-create a clean state. NOT protected by auth; local POC only.
// TODO V1: remove with all the other POC dev helpers.
export const wipePocDocumentsPublic = mutation({
  args: {},
  handler: async (ctx) => {
    const deleted: Record<string, number> = {};

    const stockMovements = await ctx.db
      .query("stock_movements")
      .withIndex("by_organization_and_creation", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .collect();
    await Promise.all(
      stockMovements.map(async (row) => ctx.db.delete(row._id)),
    );
    deleted.stock_movements = stockMovements.length;

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_organization_and_creation", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .collect();
    await Promise.all(invoices.map(async (row) => ctx.db.delete(row._id)));
    deleted.invoices = invoices.length;

    const deliveryForms = await ctx.db
      .query("delivery_forms")
      .withIndex("by_organization_and_creation", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .collect();
    await Promise.all(deliveryForms.map(async (row) => ctx.db.delete(row._id)));
    deleted.delivery_forms = deliveryForms.length;

    const purchaseOrders = await ctx.db
      .query("purchase_orders")
      .withIndex("by_organization_and_creation", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .collect();
    await Promise.all(
      purchaseOrders.map(async (row) => ctx.db.delete(row._id)),
    );
    deleted.purchase_orders = purchaseOrders.length;

    const quotations = await ctx.db
      .query("quotations")
      .withIndex("by_organization_and_creation", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .collect();
    await Promise.all(quotations.map(async (row) => ctx.db.delete(row._id)));
    deleted.quotations = quotations.length;

    const counters = await ctx.db
      .query("document_counters")
      .filter((q) => q.eq(q.field("organization_id"), TOSCANA_ORG_ID))
      .collect();
    await Promise.all(counters.map(async (row) => ctx.db.delete(row._id)));
    deleted.document_counters = counters.length;

    return deleted;
  },
});

// POC wrapper — allows seeding from external scripts via ConvexHttpClient.
// Not protected by auth; acceptable for local dev seeding only.
export const seedTodayDocumentsPublic = mutation({
  args: {},
  handler: async (ctx): Promise<SeedDocumentsCounts> => {
    return ctx.runMutation(internal.seeds.documents.seedTodayDocuments, {});
  },
});
