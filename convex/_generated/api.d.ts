/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_dto_account from "../admin/dto/account.js";
import type * as admin_dto_membership from "../admin/dto/membership.js";
import type * as admin_dto_organization from "../admin/dto/organization.js";
import type * as admin_dto_session from "../admin/dto/session.js";
import type * as admin_dto_user from "../admin/dto/user.js";
import type * as admin_helpers from "../admin/helpers.js";
import type * as admin_mutations from "../admin/mutations.js";
import type * as admin_queries from "../admin/queries.js";
import type * as apiKeys_actions from "../apiKeys/actions.js";
import type * as apiKeys_dto_apiKey from "../apiKeys/dto/apiKey.js";
import type * as apiKeys_functions from "../apiKeys/functions.js";
import type * as apiKeys_helpers from "../apiKeys/helpers.js";
import type * as apiKeys_mutations from "../apiKeys/mutations.js";
import type * as apiKeys_queries from "../apiKeys/queries.js";
import type * as auth_allowlist from "../auth/allowlist.js";
import type * as auth_config from "../auth/config.js";
import type * as auth_emailTemplates from "../auth/emailTemplates.js";
import type * as auth_functions from "../auth/functions.js";
import type * as auth_helpers from "../auth/helpers.js";
import type * as auth_mutations from "../auth/mutations.js";
import type * as auth_orgAccess from "../auth/orgAccess.js";
import type * as auth_permissions from "../auth/permissions.js";
import type * as auth_queries from "../auth/queries.js";
import type * as auth_roles from "../auth/roles.js";
import type * as clients_dto_clientActivity from "../clients/dto/clientActivity.js";
import type * as clients_dto_clientActivitySummary from "../clients/dto/clientActivitySummary.js";
import type * as clients_dto_clientDetail from "../clients/dto/clientDetail.js";
import type * as clients_dto_clientListItem from "../clients/dto/clientListItem.js";
import type * as clients_mutations from "../clients/mutations.js";
import type * as clients_queries from "../clients/queries.js";
import type * as contact_mutations from "../contact/mutations.js";
import type * as dashboard_dto_todayDigest from "../dashboard/dto/todayDigest.js";
import type * as dashboard_queries from "../dashboard/queries.js";
import type * as dashboard_utils from "../dashboard/utils.js";
import type * as delivery_forms_conversionHelpers from "../delivery_forms/conversionHelpers.js";
import type * as delivery_forms_dto_deliveryFormDetail from "../delivery_forms/dto/deliveryFormDetail.js";
import type * as delivery_forms_dto_deliveryFormInvoiceable from "../delivery_forms/dto/deliveryFormInvoiceable.js";
import type * as delivery_forms_dto_deliveryFormListItem from "../delivery_forms/dto/deliveryFormListItem.js";
import type * as delivery_forms_mutations from "../delivery_forms/mutations.js";
import type * as delivery_forms_queries from "../delivery_forms/queries.js";
import type * as email_actions from "../email/actions.js";
import type * as email_markdownEmail from "../email/markdownEmail.js";
import type * as email_mutations from "../email/mutations.js";
import type * as files_actions from "../files/actions.js";
import type * as http from "../http.js";
import type * as insights_drilldown from "../insights/drilldown.js";
import type * as insights_dto_activeClientsDrilldown from "../insights/dto/activeClientsDrilldown.js";
import type * as insights_dto_basketHistogramDrilldown from "../insights/dto/basketHistogramDrilldown.js";
import type * as insights_dto_clientSegments from "../insights/dto/clientSegments.js";
import type * as insights_dto_dormantClient from "../insights/dto/dormantClient.js";
import type * as insights_dto_familyDetailsDrilldown from "../insights/dto/familyDetailsDrilldown.js";
import type * as insights_dto_familyMix from "../insights/dto/familyMix.js";
import type * as insights_dto_globalSeasonality from "../insights/dto/globalSeasonality.js";
import type * as insights_dto_growthYoY from "../insights/dto/growthYoY.js";
import type * as insights_dto_insightsOverview from "../insights/dto/insightsOverview.js";
import type * as insights_dto_monthDetailsDrilldown from "../insights/dto/monthDetailsDrilldown.js";
import type * as insights_dto_revenueTimeline from "../insights/dto/revenueTimeline.js";
import type * as insights_dto_seasonalMonthDrilldown from "../insights/dto/seasonalMonthDrilldown.js";
import type * as insights_dto_segmentClientsDrilldown from "../insights/dto/segmentClientsDrilldown.js";
import type * as insights_dto_topClient from "../insights/dto/topClient.js";
import type * as insights_queries from "../insights/queries.js";
import type * as insights_shared from "../insights/shared.js";
import type * as invoices_dto_invoiceDetail from "../invoices/dto/invoiceDetail.js";
import type * as invoices_dto_invoiceListItem from "../invoices/dto/invoiceListItem.js";
import type * as invoices_mutations from "../invoices/mutations.js";
import type * as invoices_queries from "../invoices/queries.js";
import type * as legacy_actions from "../legacy/actions.js";
import type * as legacy_clientDrilldown from "../legacy/clientDrilldown.js";
import type * as legacy_dto_clientLegacyDocument from "../legacy/dto/clientLegacyDocument.js";
import type * as legacy_dto_clientLifetimeStats from "../legacy/dto/clientLifetimeStats.js";
import type * as legacy_dto_clientMonthInvoices from "../legacy/dto/clientMonthInvoices.js";
import type * as legacy_dto_clientMonthlyTimeline from "../legacy/dto/clientMonthlyTimeline.js";
import type * as legacy_dto_clientOpportunities from "../legacy/dto/clientOpportunities.js";
import type * as legacy_dto_clientPersonalSeasonality from "../legacy/dto/clientPersonalSeasonality.js";
import type * as legacy_dto_clientProductHistory from "../legacy/dto/clientProductHistory.js";
import type * as legacy_dto_clientProductMix from "../legacy/dto/clientProductMix.js";
import type * as legacy_dto_clientYearlyRevenue from "../legacy/dto/clientYearlyRevenue.js";
import type * as legacy_dto_legacyImportReport from "../legacy/dto/legacyImportReport.js";
import type * as legacy_mutations from "../legacy/mutations.js";
import type * as legacy_queries from "../legacy/queries.js";
import type * as legacy_seedAliases from "../legacy/seedAliases.js";
import type * as organizations_queries from "../organizations/queries.js";
import type * as products_dto_productDetail from "../products/dto/productDetail.js";
import type * as products_dto_productListItem from "../products/dto/productListItem.js";
import type * as products_mutations from "../products/mutations.js";
import type * as products_queries from "../products/queries.js";
import type * as purchase_orders_dto_purchaseOrderDetail from "../purchase_orders/dto/purchaseOrderDetail.js";
import type * as purchase_orders_dto_purchaseOrderListItem from "../purchase_orders/dto/purchaseOrderListItem.js";
import type * as purchase_orders_helpers from "../purchase_orders/helpers.js";
import type * as purchase_orders_mutations from "../purchase_orders/mutations.js";
import type * as purchase_orders_queries from "../purchase_orders/queries.js";
import type * as quotations_dto_quotationDraft from "../quotations/dto/quotationDraft.js";
import type * as quotations_dto_quotationListItem from "../quotations/dto/quotationListItem.js";
import type * as quotations_helpers from "../quotations/helpers.js";
import type * as quotations_mutations from "../quotations/mutations.js";
import type * as quotations_queries from "../quotations/queries.js";
import type * as search_buckets from "../search/buckets.js";
import type * as search_dto_clientSearch from "../search/dto/clientSearch.js";
import type * as search_dto_productSearch from "../search/dto/productSearch.js";
import type * as search_queries from "../search/queries.js";
import type * as seeds_additionalClients from "../seeds/additionalClients.js";
import type * as seeds_catalog from "../seeds/catalog.js";
import type * as seeds_data_clients from "../seeds/data/clients.js";
import type * as seeds_data_products from "../seeds/data/products.js";
import type * as seeds_data_suppliers from "../seeds/data/suppliers.js";
import type * as seeds_documents from "../seeds/documents.js";
import type * as seeds_historicalFaker from "../seeds/historicalFaker.js";
import type * as seeds_users from "../seeds/users.js";
import type * as seeds_wipe from "../seeds/wipe.js";
import type * as seeds_wipePaginated from "../seeds/wipePaginated.js";
import type * as stock_movements_dto_stockMovement from "../stock_movements/dto/stockMovement.js";
import type * as stock_movements_queries from "../stock_movements/queries.js";
import type * as suppliers_dto_supplierSuggestion from "../suppliers/dto/supplierSuggestion.js";
import type * as suppliers_queries from "../suppliers/queries.js";
import type * as support_tickets_dto_ticketDetail from "../support_tickets/dto/ticketDetail.js";
import type * as support_tickets_dto_ticketListItem from "../support_tickets/dto/ticketListItem.js";
import type * as support_tickets_dto_ticketMessage from "../support_tickets/dto/ticketMessage.js";
import type * as support_tickets_mutations from "../support_tickets/mutations.js";
import type * as support_tickets_queries from "../support_tickets/queries.js";
import type * as utils_clientNameMatch from "../utils/clientNameMatch.js";
import type * as utils_clientStatus from "../utils/clientStatus.js";
import type * as utils_dateFns from "../utils/dateFns.js";
import type * as utils_detectCreditNote from "../utils/detectCreditNote.js";
import type * as utils_errors from "../utils/errors.js";
import type * as utils_legacyLineFilter from "../utils/legacyLineFilter.js";
import type * as utils_numbering from "../utils/numbering.js";
import type * as utils_parseHorizonDate from "../utils/parseHorizonDate.js";
import type * as utils_searchTokens from "../utils/searchTokens.js";
import type * as utils_siteConfig from "../utils/siteConfig.js";
import type * as utils_vatBreakdown from "../utils/vatBreakdown.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/dto/account": typeof admin_dto_account;
  "admin/dto/membership": typeof admin_dto_membership;
  "admin/dto/organization": typeof admin_dto_organization;
  "admin/dto/session": typeof admin_dto_session;
  "admin/dto/user": typeof admin_dto_user;
  "admin/helpers": typeof admin_helpers;
  "admin/mutations": typeof admin_mutations;
  "admin/queries": typeof admin_queries;
  "apiKeys/actions": typeof apiKeys_actions;
  "apiKeys/dto/apiKey": typeof apiKeys_dto_apiKey;
  "apiKeys/functions": typeof apiKeys_functions;
  "apiKeys/helpers": typeof apiKeys_helpers;
  "apiKeys/mutations": typeof apiKeys_mutations;
  "apiKeys/queries": typeof apiKeys_queries;
  "auth/allowlist": typeof auth_allowlist;
  "auth/config": typeof auth_config;
  "auth/emailTemplates": typeof auth_emailTemplates;
  "auth/functions": typeof auth_functions;
  "auth/helpers": typeof auth_helpers;
  "auth/mutations": typeof auth_mutations;
  "auth/orgAccess": typeof auth_orgAccess;
  "auth/permissions": typeof auth_permissions;
  "auth/queries": typeof auth_queries;
  "auth/roles": typeof auth_roles;
  "clients/dto/clientActivity": typeof clients_dto_clientActivity;
  "clients/dto/clientActivitySummary": typeof clients_dto_clientActivitySummary;
  "clients/dto/clientDetail": typeof clients_dto_clientDetail;
  "clients/dto/clientListItem": typeof clients_dto_clientListItem;
  "clients/mutations": typeof clients_mutations;
  "clients/queries": typeof clients_queries;
  "contact/mutations": typeof contact_mutations;
  "dashboard/dto/todayDigest": typeof dashboard_dto_todayDigest;
  "dashboard/queries": typeof dashboard_queries;
  "dashboard/utils": typeof dashboard_utils;
  "delivery_forms/conversionHelpers": typeof delivery_forms_conversionHelpers;
  "delivery_forms/dto/deliveryFormDetail": typeof delivery_forms_dto_deliveryFormDetail;
  "delivery_forms/dto/deliveryFormInvoiceable": typeof delivery_forms_dto_deliveryFormInvoiceable;
  "delivery_forms/dto/deliveryFormListItem": typeof delivery_forms_dto_deliveryFormListItem;
  "delivery_forms/mutations": typeof delivery_forms_mutations;
  "delivery_forms/queries": typeof delivery_forms_queries;
  "email/actions": typeof email_actions;
  "email/markdownEmail": typeof email_markdownEmail;
  "email/mutations": typeof email_mutations;
  "files/actions": typeof files_actions;
  http: typeof http;
  "insights/drilldown": typeof insights_drilldown;
  "insights/dto/activeClientsDrilldown": typeof insights_dto_activeClientsDrilldown;
  "insights/dto/basketHistogramDrilldown": typeof insights_dto_basketHistogramDrilldown;
  "insights/dto/clientSegments": typeof insights_dto_clientSegments;
  "insights/dto/dormantClient": typeof insights_dto_dormantClient;
  "insights/dto/familyDetailsDrilldown": typeof insights_dto_familyDetailsDrilldown;
  "insights/dto/familyMix": typeof insights_dto_familyMix;
  "insights/dto/globalSeasonality": typeof insights_dto_globalSeasonality;
  "insights/dto/growthYoY": typeof insights_dto_growthYoY;
  "insights/dto/insightsOverview": typeof insights_dto_insightsOverview;
  "insights/dto/monthDetailsDrilldown": typeof insights_dto_monthDetailsDrilldown;
  "insights/dto/revenueTimeline": typeof insights_dto_revenueTimeline;
  "insights/dto/seasonalMonthDrilldown": typeof insights_dto_seasonalMonthDrilldown;
  "insights/dto/segmentClientsDrilldown": typeof insights_dto_segmentClientsDrilldown;
  "insights/dto/topClient": typeof insights_dto_topClient;
  "insights/queries": typeof insights_queries;
  "insights/shared": typeof insights_shared;
  "invoices/dto/invoiceDetail": typeof invoices_dto_invoiceDetail;
  "invoices/dto/invoiceListItem": typeof invoices_dto_invoiceListItem;
  "invoices/mutations": typeof invoices_mutations;
  "invoices/queries": typeof invoices_queries;
  "legacy/actions": typeof legacy_actions;
  "legacy/clientDrilldown": typeof legacy_clientDrilldown;
  "legacy/dto/clientLegacyDocument": typeof legacy_dto_clientLegacyDocument;
  "legacy/dto/clientLifetimeStats": typeof legacy_dto_clientLifetimeStats;
  "legacy/dto/clientMonthInvoices": typeof legacy_dto_clientMonthInvoices;
  "legacy/dto/clientMonthlyTimeline": typeof legacy_dto_clientMonthlyTimeline;
  "legacy/dto/clientOpportunities": typeof legacy_dto_clientOpportunities;
  "legacy/dto/clientPersonalSeasonality": typeof legacy_dto_clientPersonalSeasonality;
  "legacy/dto/clientProductHistory": typeof legacy_dto_clientProductHistory;
  "legacy/dto/clientProductMix": typeof legacy_dto_clientProductMix;
  "legacy/dto/clientYearlyRevenue": typeof legacy_dto_clientYearlyRevenue;
  "legacy/dto/legacyImportReport": typeof legacy_dto_legacyImportReport;
  "legacy/mutations": typeof legacy_mutations;
  "legacy/queries": typeof legacy_queries;
  "legacy/seedAliases": typeof legacy_seedAliases;
  "organizations/queries": typeof organizations_queries;
  "products/dto/productDetail": typeof products_dto_productDetail;
  "products/dto/productListItem": typeof products_dto_productListItem;
  "products/mutations": typeof products_mutations;
  "products/queries": typeof products_queries;
  "purchase_orders/dto/purchaseOrderDetail": typeof purchase_orders_dto_purchaseOrderDetail;
  "purchase_orders/dto/purchaseOrderListItem": typeof purchase_orders_dto_purchaseOrderListItem;
  "purchase_orders/helpers": typeof purchase_orders_helpers;
  "purchase_orders/mutations": typeof purchase_orders_mutations;
  "purchase_orders/queries": typeof purchase_orders_queries;
  "quotations/dto/quotationDraft": typeof quotations_dto_quotationDraft;
  "quotations/dto/quotationListItem": typeof quotations_dto_quotationListItem;
  "quotations/helpers": typeof quotations_helpers;
  "quotations/mutations": typeof quotations_mutations;
  "quotations/queries": typeof quotations_queries;
  "search/buckets": typeof search_buckets;
  "search/dto/clientSearch": typeof search_dto_clientSearch;
  "search/dto/productSearch": typeof search_dto_productSearch;
  "search/queries": typeof search_queries;
  "seeds/additionalClients": typeof seeds_additionalClients;
  "seeds/catalog": typeof seeds_catalog;
  "seeds/data/clients": typeof seeds_data_clients;
  "seeds/data/products": typeof seeds_data_products;
  "seeds/data/suppliers": typeof seeds_data_suppliers;
  "seeds/documents": typeof seeds_documents;
  "seeds/historicalFaker": typeof seeds_historicalFaker;
  "seeds/users": typeof seeds_users;
  "seeds/wipe": typeof seeds_wipe;
  "seeds/wipePaginated": typeof seeds_wipePaginated;
  "stock_movements/dto/stockMovement": typeof stock_movements_dto_stockMovement;
  "stock_movements/queries": typeof stock_movements_queries;
  "suppliers/dto/supplierSuggestion": typeof suppliers_dto_supplierSuggestion;
  "suppliers/queries": typeof suppliers_queries;
  "support_tickets/dto/ticketDetail": typeof support_tickets_dto_ticketDetail;
  "support_tickets/dto/ticketListItem": typeof support_tickets_dto_ticketListItem;
  "support_tickets/dto/ticketMessage": typeof support_tickets_dto_ticketMessage;
  "support_tickets/mutations": typeof support_tickets_mutations;
  "support_tickets/queries": typeof support_tickets_queries;
  "utils/clientNameMatch": typeof utils_clientNameMatch;
  "utils/clientStatus": typeof utils_clientStatus;
  "utils/dateFns": typeof utils_dateFns;
  "utils/detectCreditNote": typeof utils_detectCreditNote;
  "utils/errors": typeof utils_errors;
  "utils/legacyLineFilter": typeof utils_legacyLineFilter;
  "utils/numbering": typeof utils_numbering;
  "utils/parseHorizonDate": typeof utils_parseHorizonDate;
  "utils/searchTokens": typeof utils_searchTokens;
  "utils/siteConfig": typeof utils_siteConfig;
  "utils/vatBreakdown": typeof utils_vatBreakdown;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
};
