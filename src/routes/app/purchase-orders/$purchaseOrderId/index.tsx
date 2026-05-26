import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Typography } from "@/components/nowts/typography";
import { PurchaseOrderDetail } from "../_components/purchase-order-detail";
import { PurchaseOrderDetailSkeleton } from "../_components/purchase-orders-skeleton";

export const Route = createFileRoute("/app/purchase-orders/$purchaseOrderId/")({
  component: PurchaseOrderDetailRoute,
  pendingComponent: PurchaseOrderDetailSkeleton,
});

function PurchaseOrderDetailRoute() {
  const { purchaseOrderId } = Route.useParams();
  const id = purchaseOrderId as unknown as Id<"purchase_orders">;
  const purchaseOrder = useQuery(api.purchase_orders.queries.getById, { id });

  if (purchaseOrder === undefined) return <PurchaseOrderDetailSkeleton />;
  if (purchaseOrder === null) {
    return <Typography variant="muted">BC introuvable.</Typography>;
  }
  return <PurchaseOrderDetail purchaseOrder={purchaseOrder} />;
}
