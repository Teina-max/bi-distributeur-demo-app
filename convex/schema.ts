import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const documentStatus = (...values: readonly string[]) =>
  v.union(...values.map((value) => v.literal(value)));

const address = v.object({
  street: v.string(),
  postal_code: v.string(),
  city: v.string(),
  country: v.string(),
});

const lineItem = v.object({
  product_id: v.id("products"),
  product_code: v.string(),
  product_name: v.string(),
  quantity: v.number(),
  unit_price_ht: v.number(),
  vat_rate: v.number(),
  line_total_ht: v.number(),
});

const supplyLineItem = v.object({
  product_id: v.id("products"),
  product_code: v.string(),
  product_name: v.string(),
  quantity_ordered: v.number(),
  quantity_received: v.number(),
  unit_purchase_price_ht: v.number(),
  vat_rate: v.number(),
});

const supportTicketCategory = v.union(
  v.literal("machine_panne"),
  v.literal("produit_defaut"),
  v.literal("facturation"),
);

const supportTicketStatus = v.union(
  v.literal("open"),
  v.literal("in_progress"),
  v.literal("waiting_customer"),
  v.literal("resolved"),
  v.literal("closed"),
);

const supportTicketPriority = v.union(
  v.literal("low"),
  v.literal("normal"),
  v.literal("high"),
  v.literal("urgent"),
);

export default defineSchema({
  clients: defineTable({
    organization_id: v.string(),
    code: v.string(),
    name: v.string(),
    type: v.string(),
    email: v.union(v.string(), v.null()),
    phone: v.union(v.string(), v.null()),
    address,
    payment_terms_days: v.number(),
    payment_terms_label: v.string(),
    search_tokens: v.array(v.string()),
    // Champs hérités d'Heritage (optionnels — rétro-compatibles avec les clients seedés).
    correspondent: v.optional(v.union(v.string(), v.null())),
    vendor: v.optional(v.union(v.string(), v.null())),
    sector: v.optional(v.union(v.string(), v.null())),
    depot_cafe: v.optional(v.union(v.string(), v.null())),
    accounting_code: v.optional(v.union(v.string(), v.null())),
    credit_limit: v.optional(v.union(v.number(), v.null())),
    outstanding_amount: v.optional(v.number()),
    global_discount_pct: v.optional(v.number()),
    tariff_level: v.optional(v.number()),
    vat_intra: v.optional(v.union(v.string(), v.null())),
    is_visible: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    legacy_imported_at: v.optional(v.number()),
  })
    .index("by_organization", ["organization_id"])
    .index("by_organization_and_code", ["organization_id", "code"])
    .index("by_organization_and_vendor", ["organization_id", "vendor"])
    .index("by_organization_and_sector", ["organization_id", "sector"])
    .searchIndex("by_search_tokens", {
      searchField: "name",
      filterFields: ["organization_id"],
    }),

  products: defineTable({
    organization_id: v.string(),
    code: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.string(),
    price_ht: v.number(),
    vat_rate: v.number(),
    stock_qty: v.number(),
    stock_threshold: v.union(v.number(), v.null()),
    is_active: v.boolean(),
    search_tokens: v.array(v.string()),
    // Champs hérités d'Heritage (optionnels).
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
    legacy_imported_at: v.optional(v.number()),
  })
    .index("by_organization", ["organization_id"])
    .index("by_organization_and_code", ["organization_id", "code"])
    .index("by_organization_and_active", ["organization_id", "is_active"])
    .index("by_organization_and_family", ["organization_id", "family_code"])
    .index("by_supplier", ["supplier_id"])
    .searchIndex("by_search_tokens", {
      searchField: "name",
      filterFields: ["organization_id", "is_active"],
    }),

  suppliers: defineTable({
    organization_id: v.string(),
    code: v.string(),
    name: v.string(),
    email: v.union(v.string(), v.null()),
    phone: v.union(v.string(), v.null()),
    search_tokens: v.array(v.string()),
  })
    .index("by_organization", ["organization_id"])
    .index("by_organization_and_code", ["organization_id", "code"])
    .searchIndex("by_search_tokens", {
      searchField: "name",
      filterFields: ["organization_id"],
    }),

  quotations: defineTable({
    organization_id: v.string(),
    client_id: v.id("clients"),
    number: v.string(),
    status: documentStatus(
      "draft",
      "sent",
      "accepted",
      "converted_to_delivery",
      "cancelled",
    ),
    lines: v.array(lineItem),
    total_ht: v.number(),
    total_vat: v.number(),
    total_ttc: v.number(),
    created_by: v.string(),
  })
    .index("by_organization_and_creation", ["organization_id"])
    .index("by_organization_and_status", ["organization_id", "status"])
    .index("by_organization_and_number", ["organization_id", "number"])
    .index("by_client_and_creation", ["client_id"]),

  delivery_forms: defineTable({
    organization_id: v.string(),
    quotation_id: v.union(v.id("quotations"), v.null()),
    client_id: v.id("clients"),
    number: v.string(),
    status: documentStatus(
      "in_preparation",
      "ready_to_ship",
      "shipped",
      "delivered",
      "invoiced",
      "cancelled",
    ),
    lines: v.array(lineItem),
    total_ht: v.number(),
    total_ttc: v.number(),
    delivered_at: v.union(v.number(), v.null()),
    created_by: v.string(),
  })
    .index("by_organization_and_creation", ["organization_id"])
    .index("by_organization_and_status", ["organization_id", "status"])
    .index("by_organization_and_number", ["organization_id", "number"])
    .index("by_client_and_creation", ["client_id"])
    .index("by_quotation", ["quotation_id"]),

  invoices: defineTable({
    organization_id: v.string(),
    // Array to support monthly aggregation (1 invoice covering N BL of same client).
    // For single-BL invoices, this is a length-1 array.
    delivery_form_ids: v.array(v.id("delivery_forms")),
    client_id: v.id("clients"),
    number: v.string(),
    status: documentStatus("draft", "sent", "paid", "overdue", "cancelled"),
    total_ht: v.number(),
    total_ttc: v.number(),
    due_date: v.number(),
    sent_at: v.union(v.number(), v.null()),
  })
    .index("by_organization_and_creation", ["organization_id"])
    .index("by_organization_and_status", ["organization_id", "status"])
    .index("by_organization_and_number", ["organization_id", "number"])
    .index("by_client_and_creation", ["client_id"]),

  purchase_orders: defineTable({
    organization_id: v.string(),
    supplier_id: v.id("suppliers"),
    number: v.string(),
    status: documentStatus(
      "draft",
      "sent",
      "partially_received",
      "received",
      "cancelled",
    ),
    lines: v.array(supplyLineItem),
    total_ht: v.number(),
    total_ttc: v.number(),
    received_at: v.union(v.number(), v.null()),
    created_by: v.string(),
  })
    .index("by_organization_and_creation", ["organization_id"])
    .index("by_organization_and_status", ["organization_id", "status"])
    .index("by_organization_and_number", ["organization_id", "number"])
    .index("by_supplier", ["supplier_id"]),

  stock_movements: defineTable({
    organization_id: v.string(),
    product_id: v.id("products"),
    delta: v.number(),
    reason: documentStatus(
      "delivery_form_out",
      "purchase_order_in",
      "manual_adjustment",
    ),
    reference_kind: documentStatus("delivery_form", "purchase_order", "manual"),
    reference_id: v.union(
      v.id("delivery_forms"),
      v.id("purchase_orders"),
      v.null(),
    ),
    note: v.union(v.string(), v.null()),
  })
    .index("by_organization_and_creation", ["organization_id"])
    .index("by_product_and_creation", ["product_id"]),

  user_preferences: defineTable({
    organization_id: v.string(),
    user_id: v.string(),
    default_vat_rate: v.number(),
    ui_density: documentStatus("compact", "normal"),
    recent_client_ids: v.array(v.id("clients")),
    recent_product_ids: v.array(v.id("products")),
  }).index("by_organization_and_user", ["organization_id", "user_id"]),

  document_counters: defineTable({
    organization_id: v.string(),
    kind: documentStatus(
      "quotation",
      "delivery_form",
      "invoice",
      "purchase_order",
      "support_ticket",
    ),
    year_prefix: v.string(),
    next_number: v.number(),
  }).index("by_organization_kind_year", [
    "organization_id",
    "kind",
    "year_prefix",
  ]),

  support_tickets: defineTable({
    organization_id: v.string(),
    client_id: v.id("clients"),
    number: v.string(),
    status: supportTicketStatus,
    category: supportTicketCategory,
    priority: supportTicketPriority,
    title: v.string(),
    description: v.string(),
    delivery_form_id: v.union(v.id("delivery_forms"), v.null()),
    invoice_id: v.union(v.id("invoices"), v.null()),
    product_id: v.union(v.id("products"), v.null()),
    assigned_to: v.union(v.string(), v.null()),
    resolved_at: v.union(v.number(), v.null()),
    closed_at: v.union(v.number(), v.null()),
    created_by: v.string(),
  })
    .index("by_organization_and_creation", ["organization_id"])
    .index("by_organization_and_status", ["organization_id", "status"])
    .index("by_organization_and_number", ["organization_id", "number"])
    .index("by_client_and_creation", ["client_id"])
    .index("by_assigned_and_status", ["assigned_to", "status"]),

  ticket_messages: defineTable({
    ticket_id: v.id("support_tickets"),
    author_email: v.string(),
    body: v.string(),
  }).index("by_ticket_and_creation", ["ticket_id"]),

  // ─────────────────────────────────────────────────────────────────────
  // Historique Heritage importé (lecture seule, alimenté par scripts ETL).
  // Découplé des tables ERP actives pour ne pas polluer la numérotation V1.
  // ─────────────────────────────────────────────────────────────────────

  legacy_documents: defineTable({
    organization_id: v.string(),
    kind: v.union(
      v.literal("invoice"),
      v.literal("quotation"),
      v.literal("delivery_form"),
    ),
    source_file: v.string(),
    legacy_number: v.string(),
    client_id: v.union(v.id("clients"), v.null()),
    client_legacy_name: v.string(),
    client_match_method: v.union(
      v.literal("exact"),
      v.literal("strict"),
      v.literal("fuzzy"),
      v.literal("manual"),
      v.literal("unknown"),
      v.literal("empty"),
    ),
    document_date: v.number(),
    due_date: v.union(v.number(), v.null()),
    amount_paid: v.union(v.number(), v.null()),
    total_ht: v.number(),
    total_vat: v.number(),
    total_ttc: v.number(),
    comment: v.union(v.string(), v.null()),
    // Optional flag: invoice rows with negative HT/TTC or with "ANNULATION" /
    // "RETOUR" labels are credit notes. Kept optional for retrocompat with
    // documents inserted before the marker was introduced.
    is_credit_note: v.optional(v.boolean()),
  })
    .index("by_organization", ["organization_id"])
    .index("by_organization_and_kind_and_date", [
      "organization_id",
      "kind",
      "document_date",
    ])
    .index("by_client_and_date", ["client_id", "document_date"])
    .index("by_organization_and_legacy_number", [
      "organization_id",
      "legacy_number",
    ]),

  legacy_document_lines: defineTable({
    organization_id: v.string(),
    document_id: v.id("legacy_documents"),
    document_kind: v.union(
      v.literal("invoice"),
      v.literal("quotation"),
      v.literal("delivery_form"),
    ),
    document_date: v.number(),
    client_id: v.union(v.id("clients"), v.null()),
    product_id: v.union(v.id("products"), v.null()),
    product_legacy_code: v.string(),
    product_legacy_name: v.string(),
    quantity: v.number(),
    unit_price_ttc: v.number(),
    unit_cost_pmp: v.number(),
    line_total_ht: v.number(),
    vat_rate: v.number(),
    vat_amount: v.number(),
  })
    .index("by_organization", ["organization_id"])
    .index("by_document", ["document_id"])
    .index("by_client_and_date", ["client_id", "document_date"])
    .index("by_product_and_date", ["product_id", "document_date"]),

  // Agrégat pré-2011 conservé en bloc (1 ligne par client/an), sans détail ligne.
  legacy_archive_summary: defineTable({
    organization_id: v.string(),
    client_id: v.union(v.id("clients"), v.null()),
    client_legacy_name: v.string(),
    year: v.number(),
    invoice_count: v.number(),
    ca_ht: v.number(),
    ca_ttc: v.number(),
  })
    .index("by_organization", ["organization_id"])
    .index("by_client_and_year", ["client_id", "year"])
    .index("by_organization_and_year", ["organization_id", "year"]),

  // Noms non rattachés (HORECA ponctuel, clients radiés) — en attente de mapping.
  legacy_unknown_aliases: defineTable({
    organization_id: v.string(),
    raw_name: v.string(),
    normalized_name: v.string(),
    occurrence_count: v.number(),
    total_ca_ht: v.number(),
    first_seen: v.number(),
    last_seen: v.number(),
    resolved_client_id: v.union(v.id("clients"), v.null()),
    resolution_method: v.union(
      v.literal("pending"),
      v.literal("manual"),
      v.literal("merged_to_bucket"),
    ),
  })
    .index("by_organization", ["organization_id"])
    .index("by_organization_and_normalized", [
      "organization_id",
      "normalized_name",
    ])
    .index("by_organization_and_resolution", [
      "organization_id",
      "resolution_method",
    ]),

  // Agrégats précomputés post-import (alimentent les fiches client/produit enrichies).
  client_monthly_stats: defineTable({
    organization_id: v.string(),
    client_id: v.id("clients"),
    year: v.number(),
    month: v.number(),
    invoice_count: v.number(),
    quotation_count: v.number(),
    delivery_form_count: v.number(),
    ca_ht: v.number(),
    ca_ttc: v.number(),
    unique_products: v.number(),
  })
    .index("by_organization", ["organization_id"])
    .index("by_client_and_period", ["client_id", "year", "month"])
    .index("by_organization_and_period", ["organization_id", "year", "month"]),

  product_monthly_stats: defineTable({
    organization_id: v.string(),
    product_id: v.id("products"),
    year: v.number(),
    month: v.number(),
    quantity_sold: v.number(),
    ca_ht: v.number(),
    margin_ht: v.number(),
    unique_clients: v.number(),
  })
    .index("by_organization", ["organization_id"])
    .index("by_product_and_period", ["product_id", "year", "month"])
    .index("by_organization_and_period", ["organization_id", "year", "month"]),
});
