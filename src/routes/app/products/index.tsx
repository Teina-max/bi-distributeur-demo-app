import { createFileRoute } from "@tanstack/react-router";
import { useId, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Layout,
  LayoutContent,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { Typography } from "@/components/nowts/typography";
import { ProductsListSkeleton } from "./_components/products-skeleton";
import { ProductsListTable } from "./_components/products-list-table";
import { ProductsSearchInput } from "./_components/products-search-input";

export const Route = createFileRoute("/app/products/")({
  component: ProductsIndex,
  pendingComponent: ProductsListSkeleton,
});

function ProductsIndex() {
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const switchId = useId();
  const items = useQuery(api.products.queries.listCatalog, {
    query,
    include_inactive: showInactive,
  });

  return (
    <Layout size="xl">
      <LayoutHeader>
        <LayoutTitle>Catalogue produits</LayoutTitle>
        <Typography variant="muted">
          Lecture seule — recherche par code, nom ou catégorie.
        </Typography>
      </LayoutHeader>
      <LayoutContent>
        <div className="flex flex-col gap-3">
          <ProductsSearchInput onQueryChange={setQuery} autoFocus />
          <div className="flex items-center gap-2">
            <Switch
              id={switchId}
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <label htmlFor={switchId} className="text-muted-foreground text-xs">
              Voir produits inactifs
            </label>
          </div>
          <Card>
            <CardContent>
              {items === undefined ? (
                <ProductsListSkeleton />
              ) : (
                <ProductsListTable items={items} />
              )}
            </CardContent>
          </Card>
        </div>
      </LayoutContent>
    </Layout>
  );
}
