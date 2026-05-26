import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/nowts/typography";
import { Layout, LayoutContent } from "@/features/page/layout";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { cn } from "@/lib/utils";
import { ClientIdentityCard } from "../_components/client-identity-card";
import {
  ClientLegacyDocsCard,
  useLegacyDocsFilter,
} from "../_components/client-legacy-docs-card";
import { ClientLifetimeCard } from "../_components/client-lifetime-card";
import { ClientMonthlyTimelineCard } from "../_components/client-monthly-timeline-card";
import { ClientOpportunitiesCard } from "../_components/client-opportunities-card";
import { ClientPersonalSeasonalityCard } from "../_components/client-personal-seasonality-card";
import { ClientProductMixCard } from "../_components/client-product-mix-card";
import { ClientYearlyRevenueCard } from "../_components/client-yearly-revenue-card";
import { ClientRecentDeliveryFormsTable } from "../_components/client-recent-delivery-forms-table";
import { ClientRecentInvoicesTable } from "../_components/client-recent-invoices-table";
import { ClientRecentQuotationsTable } from "../_components/client-recent-quotations-table";
import { ClientRecentTicketsTable } from "../_components/client-recent-tickets-table";
import { ClientSummaryCard } from "../_components/client-summary-card";
import { ClientDetailSkeleton } from "../_components/clients-skeleton";

const SECTIONS = [
  "quotations",
  "deliveryForms",
  "invoices",
  "tickets",
  "legacy",
] as const;
type Section = (typeof SECTIONS)[number];

export const Route = createFileRoute("/app/clients/$clientId/")({
  component: ClientDetailRoute,
  pendingComponent: ClientDetailSkeleton,
});

function nextSection(current: Section): Section {
  const index = SECTIONS.indexOf(current);
  return SECTIONS[(index + 1) % SECTIONS.length] ?? "quotations";
}

function ClientDetailRoute() {
  const { clientId } = Route.useParams();
  const id = clientId as unknown as Id<"clients">;
  const navigate = useNavigate();
  const router = useRouter();
  const session = authClient.useSession();
  const isAdmin =
    (session.data?.user as { role?: string } | undefined)?.role === "admin";
  const [activeSection, setActiveSection] = useState<Section>("quotations");
  const { filter: legacyFilter, setFilter: setLegacyFilter } =
    useLegacyDocsFilter();
  const activity = useQuery(api.clients.queries.getActivityById, { id });
  const summary = useQuery(api.clients.queries.getActivitySummary, { id });
  const tickets = useQuery(api.support_tickets.queries.listByClient, {
    client_id: id,
    limit: 10,
  });
  const lifetime = useQuery(api.legacy.queries.getClientLifetimeStats, { id });
  const timeline = useQuery(api.legacy.queries.getClientMonthlyTimeline, {
    id,
  });
  const productMix = useQuery(api.legacy.queries.getClientProductMix, { id });
  const legacyDocs = useQuery(api.legacy.queries.getClientLegacyDocuments, {
    id,
    kind: legacyFilter === "all" ? undefined : legacyFilter,
    limit: 50,
  });
  const yearly = useQuery(api.legacy.clientDrilldown.getClientYearlyRevenue, {
    client_id: id,
  });
  const seasonality = useQuery(
    api.legacy.clientDrilldown.getClientPersonalSeasonality,
    { client_id: id },
  );
  const opportunities = useQuery(
    api.legacy.clientDrilldown.getClientOpportunities,
    { client_id: id },
  );

  useKeyboardScope("client-detail", {
    Escape: () => {
      void navigate({ to: "/app/clients" });
    },
    Tab: () => setActiveSection((current) => nextSection(current)),
    F5: () => {
      void router.invalidate();
    },
  });

  if (
    activity === undefined ||
    summary === undefined ||
    tickets === undefined ||
    lifetime === undefined ||
    timeline === undefined ||
    productMix === undefined ||
    legacyDocs === undefined ||
    yearly === undefined ||
    seasonality === undefined ||
    opportunities === undefined
  ) {
    return <ClientDetailSkeleton />;
  }
  if (activity === null || summary === null) {
    return (
      <Layout size="xl">
        <LayoutContent>
          <Typography variant="muted">Client introuvable.</Typography>
        </LayoutContent>
      </Layout>
    );
  }

  return (
    <Layout size="xl">
      <LayoutContent>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ClientIdentityCard client={activity.client} isAdmin={isAdmin} />
            <ClientSummaryCard summary={summary} />
          </div>

          {lifetime ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ClientLifetimeCard stats={lifetime} />
              {timeline ? (
                <ClientMonthlyTimelineCard clientId={id} timeline={timeline} />
              ) : null}
            </div>
          ) : null}

          {yearly || seasonality ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {yearly ? <ClientYearlyRevenueCard yearly={yearly} /> : null}
              {seasonality ? (
                <ClientPersonalSeasonalityCard seasonality={seasonality} />
              ) : null}
            </div>
          ) : null}

          {productMix ? (
            <ClientProductMixCard clientId={id} mix={productMix} />
          ) : null}

          {opportunities ? (
            <ClientOpportunitiesCard opportunities={opportunities} />
          ) : null}

          <Card
            className={cn(
              activeSection === "quotations" && "border-primary/60",
            )}
          >
            <CardHeader>
              <CardTitle className="text-base">Derniers devis</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientRecentQuotationsTable
                rows={activity.recentQuotations}
                enabled={activeSection === "quotations"}
              />
            </CardContent>
          </Card>

          <Card
            className={cn(
              activeSection === "deliveryForms" && "border-primary/60",
            )}
          >
            <CardHeader>
              <CardTitle className="text-base">Derniers BL</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientRecentDeliveryFormsTable
                rows={activity.recentDeliveryForms}
                enabled={activeSection === "deliveryForms"}
              />
            </CardContent>
          </Card>

          <Card
            className={cn(activeSection === "invoices" && "border-primary/60")}
          >
            <CardHeader>
              <CardTitle className="text-base">Dernières factures</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientRecentInvoicesTable
                rows={activity.recentInvoices}
                enabled={activeSection === "invoices"}
              />
            </CardContent>
          </Card>

          <Card
            className={cn(activeSection === "tickets" && "border-primary/60")}
          >
            <CardHeader>
              <CardTitle className="text-base">Tickets SAV</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientRecentTicketsTable
                rows={tickets}
                enabled={activeSection === "tickets"}
              />
            </CardContent>
          </Card>

          <ClientLegacyDocsCard
            rows={legacyDocs ?? []}
            enabled={activeSection === "legacy"}
            filter={legacyFilter}
            onFilterChange={setLegacyFilter}
          />
        </div>
      </LayoutContent>
    </Layout>
  );
}
