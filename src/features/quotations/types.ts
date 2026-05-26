import type { Id } from "@convex/_generated/dataModel";

export type ProductSuggestion = {
  id: Id<"products">;
  code: string;
  name: string;
  price_ht: number;
  vat_rate: number;
};

export type ClientSuggestion = {
  id: Id<"clients">;
  code: string;
  name: string;
  city: string;
};

export type FilledLine = {
  kind: "filled";
  product_id: Id<"products">;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price_ht: number;
  vat_rate: number;
  line_total_ht: number;
};

export type EmptyLine = {
  kind: "empty";
};

export type DraftLine = FilledLine | EmptyLine;

export type LineItemPayload = {
  product_id: Id<"products">;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price_ht: number;
  vat_rate: number;
  line_total_ht: number;
};
