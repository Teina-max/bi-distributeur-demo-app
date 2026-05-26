import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { ClientSearchDto } from "../../../convex/search/dto/clientSearch";
import type { ProductSearchDto } from "../../../convex/search/dto/productSearch";
import type { SearchScope } from "./types";

const TOSCANA_ORG_ID = "toscana-beverages-demo";

type Results = {
  clients: readonly ClientSearchDto[];
  products: readonly ProductSearchDto[];
};

const EMPTY: Results = { clients: [], products: [] };

export function useSearchResults(
  query: string,
  scope: SearchScope,
  debounceMs = 80,
): { results: Results; isLoading: boolean } {
  const debouncedQuery = useDebouncedValue(query, debounceMs);
  const data = useQuery(
    api.search.queries.searchAll,
    debouncedQuery.trim().length === 0
      ? "skip"
      : {
          query: debouncedQuery,
          scope,
          organizationId: TOSCANA_ORG_ID,
        },
  );

  if (debouncedQuery.trim().length === 0) {
    return { results: EMPTY, isLoading: false };
  }

  return {
    results: data ?? EMPTY,
    isLoading: data === undefined,
  };
}
