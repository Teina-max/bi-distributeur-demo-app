import { mutation } from "../_generated/server";
import { TOSCANA_ORG_ID } from "./users";

type WipeCounts = {
  ticket_messages: number;
  support_tickets: number;
  stock_movements: number;
  invoices: number;
  delivery_forms: number;
  purchase_orders: number;
  quotations: number;
  document_counters: number;
  clients: number;
  products: number;
  suppliers: number;
};

/**
 * POC dev tool — wipe ALL business data for Toscana Beverages SARL org in one shot.
 * Order matters: documents and stock movements first (they reference
 * clients/products), then the catalog. Tickets last because they reference
 * clients/products/delivery_forms/invoices.
 *
 * Does NOT delete:
 * - users (managed by Better Auth, free with magic link sign-in).
 * - user_preferences (rebuilt on first session).
 * - organizations (mono-org POC, slug hardcoded toscana-beverages-demo).
 *
 * NOT protected by auth; POC only. SAFE TO REMOVE post-V1.
 */
export const wipePocAllPublic = mutation({
  args: {},
  handler: async (ctx): Promise<WipeCounts> => {
    const deleted: WipeCounts = {
      ticket_messages: 0,
      support_tickets: 0,
      stock_movements: 0,
      invoices: 0,
      delivery_forms: 0,
      purchase_orders: 0,
      quotations: 0,
      document_counters: 0,
      clients: 0,
      products: 0,
      suppliers: 0,
    };

    const supportTickets = await ctx.db
      .query("support_tickets")
      .withIndex("by_organization_and_creation", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .collect();

    const messagesByTicket = await Promise.all(
      supportTickets.map(async (ticket) =>
        ctx.db
          .query("ticket_messages")
          .withIndex("by_ticket_and_creation", (q) =>
            q.eq("ticket_id", ticket._id),
          )
          .collect(),
      ),
    );
    const allMessages = messagesByTicket.flat();
    await Promise.all(allMessages.map(async (m) => ctx.db.delete(m._id)));
    deleted.ticket_messages = allMessages.length;
    await Promise.all(supportTickets.map(async (t) => ctx.db.delete(t._id)));
    deleted.support_tickets = supportTickets.length;

    const stockMovements = await ctx.db
      .query("stock_movements")
      .withIndex("by_organization_and_creation", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .collect();
    await Promise.all(stockMovements.map(async (r) => ctx.db.delete(r._id)));
    deleted.stock_movements = stockMovements.length;

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_organization_and_creation", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .collect();
    await Promise.all(invoices.map(async (r) => ctx.db.delete(r._id)));
    deleted.invoices = invoices.length;

    const deliveryForms = await ctx.db
      .query("delivery_forms")
      .withIndex("by_organization_and_creation", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .collect();
    await Promise.all(deliveryForms.map(async (r) => ctx.db.delete(r._id)));
    deleted.delivery_forms = deliveryForms.length;

    const purchaseOrders = await ctx.db
      .query("purchase_orders")
      .withIndex("by_organization_and_creation", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .collect();
    await Promise.all(purchaseOrders.map(async (r) => ctx.db.delete(r._id)));
    deleted.purchase_orders = purchaseOrders.length;

    const quotations = await ctx.db
      .query("quotations")
      .withIndex("by_organization_and_creation", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .collect();
    await Promise.all(quotations.map(async (r) => ctx.db.delete(r._id)));
    deleted.quotations = quotations.length;

    const counters = await ctx.db
      .query("document_counters")
      .withIndex("by_organization_kind_year", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .collect();
    await Promise.all(counters.map(async (r) => ctx.db.delete(r._id)));
    deleted.document_counters = counters.length;

    const clients = await ctx.db
      .query("clients")
      .withIndex("by_organization", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .collect();
    await Promise.all(clients.map(async (r) => ctx.db.delete(r._id)));
    deleted.clients = clients.length;

    const products = await ctx.db
      .query("products")
      .withIndex("by_organization", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .collect();
    await Promise.all(products.map(async (r) => ctx.db.delete(r._id)));
    deleted.products = products.length;

    const suppliers = await ctx.db
      .query("suppliers")
      .withIndex("by_organization", (q) =>
        q.eq("organization_id", TOSCANA_ORG_ID),
      )
      .collect();
    await Promise.all(suppliers.map(async (r) => ctx.db.delete(r._id)));
    deleted.suppliers = suppliers.length;

    return deleted;
  },
});
