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
import { InvoicesListTable } from "./_components/invoices-list-table";
import { InvoicesListSkeleton } from "./_components/invoices-skeleton";

export const Route = createFileRoute("/app/invoices/")({
  component: InvoicesIndex,
  pendingComponent: InvoicesListSkeleton,
});

function InvoicesIndex() {
  const navigate = useNavigate();
  const list = useQuery(api.invoices.queries.listRecent, {});
  if (list === undefined) return <InvoicesListSkeleton />;
  return (
    <Layout size="xl">
      <LayoutHeader>
        <LayoutTitle>Factures</LayoutTitle>
        <Typography variant="muted">
          50 dernières (anti-chronologique)
        </Typography>
        <LayoutActions>
          <Button
            size="sm"
            onClick={() => void navigate({ to: "/app/invoices/new" })}
            data-testid="new-invoice-link"
          >
            <Plus className="size-4" />
            Nouvelle facture (agrégée)
          </Button>
        </LayoutActions>
      </LayoutHeader>
      <LayoutContent>
        <Card>
          <CardContent>
            <InvoicesListTable rows={list} />
          </CardContent>
        </Card>
      </LayoutContent>
    </Layout>
  );
}
