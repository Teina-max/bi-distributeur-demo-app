import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useId, useState } from "react";
import { api } from "@convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Typography } from "@/components/nowts/typography";
import {
  Layout,
  LayoutContent,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { ClientsListTable } from "./_components/clients-list-table";
import { ClientsSearchInput } from "./_components/clients-search-input";
import { ClientsListSkeleton } from "./_components/clients-skeleton";
import { InsightsSummaryCard } from "./_components/insights-summary-card";

export const Route = createFileRoute("/app/clients/")({
  component: ClientsIndex,
  pendingComponent: ClientsListSkeleton,
});

function ClientsIndex() {
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const switchId = useId();
  const items = useQuery(api.clients.queries.listCatalog, {
    query,
    include_hidden: showArchived,
  });

  return (
    <Layout size="xl">
      <LayoutHeader>
        <LayoutTitle>Clients</LayoutTitle>
        <Typography variant="muted">
          Lecture seule — recherche par code, nom ou ville.
        </Typography>
      </LayoutHeader>
      <LayoutContent>
        <div className="flex flex-col gap-3">
          <InsightsSummaryCard />
          <ClientsSearchInput onQueryChange={setQuery} autoFocus />
          <div className="flex items-center gap-2">
            <Switch
              id={switchId}
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <label htmlFor={switchId} className="text-muted-foreground text-xs">
              Voir clients archivés
            </label>
          </div>
          <Card>
            <CardContent>
              {items === undefined ? (
                <ClientsListSkeleton />
              ) : (
                <ClientsListTable items={items} />
              )}
            </CardContent>
          </Card>
        </div>
      </LayoutContent>
    </Layout>
  );
}
