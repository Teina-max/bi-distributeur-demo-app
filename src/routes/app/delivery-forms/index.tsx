import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Layout,
  LayoutActions,
  LayoutContent,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { Typography } from "@/components/nowts/typography";
import { DeliveryFormsListTable } from "./_components/delivery-forms-list-table";
import { DeliveryFormsListSkeleton } from "./_components/delivery-forms-skeleton";

export const Route = createFileRoute("/app/delivery-forms/")({
  component: DeliveryFormsIndex,
  pendingComponent: DeliveryFormsListSkeleton,
});

function DeliveryFormsIndex() {
  const navigate = useNavigate();
  const list = useQuery(api.delivery_forms.queries.listRecent, {});

  if (list === undefined) return <DeliveryFormsListSkeleton />;

  return (
    <Layout size="xl">
      <LayoutHeader>
        <LayoutTitle>Bons de livraison</LayoutTitle>
        <Typography variant="muted">
          50 derniers (anti-chronologique)
        </Typography>
        <LayoutActions>
          <Button
            size="sm"
            onClick={() => void navigate({ to: "/app/delivery-forms/new" })}
            data-testid="new-delivery-form-link"
          >
            <Plus className="size-4" />
            Nouveau BL direct
          </Button>
        </LayoutActions>
      </LayoutHeader>
      <LayoutContent>
        <Card>
          <CardContent>
            <DeliveryFormsListTable rows={list} />
          </CardContent>
        </Card>
      </LayoutContent>
    </Layout>
  );
}
