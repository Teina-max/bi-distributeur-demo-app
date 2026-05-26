import type { Id } from "@convex/_generated/dataModel";

export type SupplierSuggestion = {
  id: Id<"suppliers">;
  code: string;
  name: string;
};

export type ProductSupplySuggestion = {
  id: Id<"products">;
  code: string;
  name: string;
  vat_rate: number;
};

export type FilledSupplyLine = {
  kind: "filled";
  product_id: Id<"products">;
  product_code: string;
  product_name: string;
  quantity_ordered: number;
  unit_purchase_price_ht: number;
  vat_rate: number;
};

export type EmptySupplyLine = {
  kind: "empty";
};

export type SupplyDraftLine = FilledSupplyLine | EmptySupplyLine;

export type SupplyLineItemPayload = {
  product_id: Id<"products">;
  product_code: string;
  product_name: string;
  quantity_ordered: number;
  unit_purchase_price_ht: number;
  vat_rate: number;
};
