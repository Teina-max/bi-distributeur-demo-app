import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout, LayoutContent } from "@/features/page/layout";
import { Typography } from "@/components/nowts/typography";
import { authClient } from "@/lib/auth-client";
import { ProductDetailCard } from "../_components/product-detail-card";
import { ProductStockMovementsTable } from "../_components/product-stock-movements-table";
import { ProductDetailSkeleton } from "../_components/products-skeleton";

export const Route = createFileRoute("/app/products/$productId/")({
  component: ProductDetailRoute,
  pendingComponent: ProductDetailSkeleton,
});

function ProductDetailRoute() {
  const { productId } = Route.useParams();
  const id = productId as unknown as Id<"products">;
  const product = useQuery(api.products.queries.getById, { id });
  const movements = useQuery(api.stock_movements.queries.listByProduct, {
    product_id: id,
  });
  const session = authClient.useSession();
  const isAdmin =
    (session.data?.user as { role?: string } | undefined)?.role === "admin";

  if (product === undefined || movements === undefined) {
    return <ProductDetailSkeleton />;
  }
  if (product === null) {
    return (
      <Layout size="xl">
        <LayoutContent>
          <Typography variant="muted">Produit introuvable.</Typography>
        </LayoutContent>
      </Layout>
    );
  }

  return (
    <Layout size="xl">
      <LayoutContent>
        <div className="flex flex-col gap-4">
          <ProductDetailCard product={product} isAdmin={isAdmin} />
          <Card>
            <CardHeader>
              <CardTitle>Derniers mouvements de stock</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductStockMovementsTable movements={movements} />
            </CardContent>
          </Card>
        </div>
      </LayoutContent>
    </Layout>
  );
}
