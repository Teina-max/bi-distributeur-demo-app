import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Typography } from "@/components/nowts/typography";
import { Button } from "@/components/ui/button";
import { PurchaseOrdersListSkeleton } from "./_components/purchase-orders-skeleton";
import { PurchaseOrdersListTable } from "./_components/purchase-orders-list-table";

export const Route = createFileRoute("/app/purchase-orders/")({
  component: PurchaseOrdersIndex,
  pendingComponent: PurchaseOrdersListSkeleton,
});

function PurchaseOrdersIndex() {
  const navigate = useNavigate();
  const items = useQuery(api.purchase_orders.queries.listRecent, {});

  if (items === undefined) return <PurchaseOrdersListSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Typography variant="h2">BC fournisseurs récents</Typography>
        <Button
          size="sm"
          onClick={() => void navigate({ to: "/app/purchase-orders/new" })}
          data-testid="new-purchase-order-link"
        >
          Nouveau BC
          <kbd className="bg-primary-foreground/20 text-primary-foreground ml-2 inline-flex h-4 items-center rounded border border-current/30 px-1 font-mono text-[10px]">
            F2
          </kbd>
        </Button>
      </div>
      {items.length === 0 ? (
        <Typography variant="muted" className="text-sm">
          Aucun BC pour le moment. F2 pour démarrer.
        </Typography>
      ) : (
        <PurchaseOrdersListTable items={items} />
      )}
    </div>
  );
}
