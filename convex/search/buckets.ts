import type { Doc } from "@convex/_generated/dataModel";
import { toClientSearchDto, type ClientSearchDto } from "./dto/clientSearch";
import { toProductSearchDto, type ProductSearchDto } from "./dto/productSearch";

export type SearchScope = "clients" | "products" | "global";

export type BucketsInput = {
  scope: SearchScope;
  clientsRaw: readonly Doc<"clients">[];
  productsRaw: readonly Doc<"products">[];
};

export type BucketsResponse = {
  clients: ClientSearchDto[];
  products: ProductSearchDto[];
};

export const buildBucketsResponse = (input: BucketsInput): BucketsResponse => {
  const clients =
    input.scope === "products" ? [] : input.clientsRaw.map(toClientSearchDto);
  const products =
    input.scope === "clients" ? [] : input.productsRaw.map(toProductSearchDto);
  return { clients, products };
};

export const EMPTY_BUCKETS: BucketsResponse = { clients: [], products: [] };
