import { createFileRoute } from "@tanstack/react-router";
import { PurchaseOrderForm } from "./_components/purchase-order-form";
import { PurchaseOrderFormSkeleton } from "./_components/purchase-orders-skeleton";

export const Route = createFileRoute("/app/purchase-orders/new")({
  component: NewPurchaseOrderPage,
  pendingComponent: PurchaseOrderFormSkeleton,
});

function NewPurchaseOrderPage() {
  return <PurchaseOrderForm />;
}
