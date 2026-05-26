import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Typography } from "@/components/nowts/typography";
import {
  Layout,
  LayoutContent,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { DormantClientsCard } from "./_components/dormant-clients-card";
import { FamilyMixCard } from "./_components/family-mix-card";
import { GrowthYoYCard } from "./_components/growth-yoy-card";
import { InsightsDashboardSkeleton } from "./_components/insights-skeleton";
import { OverviewKpisCard } from "./_components/overview-kpis-card";
import { RevenueTimelineCard } from "./_components/revenue-timeline-card";
import { SeasonalityCard } from "./_components/seasonality-card";
import { SegmentsCard } from "./_components/segments-card";
import { TopClientsCard } from "./_components/top-clients-card";

export const Route = createFileRoute("/app/insights/")({
  component: InsightsIndex,
  pendingComponent: InsightsDashboardSkeleton,
});

function InsightsIndex() {
  const navigate = useNavigate();
  const overview = useQuery(api.insights.queries.getOverview, {});
  const segments = useQuery(api.insights.queries.getClientSegments, {});
  const topClients = useQuery(api.insights.queries.getTopClients, {
    limit: 20,
  });
  const dormants = useQuery(api.insights.queries.getDormantClients, {
    limit: 20,
  });
  const seasonality = useQuery(api.insights.queries.getGlobalSeasonality, {
    yearsBack: 5,
  });
  const familyMix = useQuery(api.insights.queries.getGlobalFamilyMix, {
    monthsBack: 12,
  });
  const revenueTimeline = useQuery(api.insights.queries.getRevenueTimeline, {});
  const archiveYearly = useQuery(api.insights.queries.getArchiveYearly, {});
  const growthYoy = useQuery(api.insights.queries.getGrowthYoY, { limit: 10 });

  useKeyboardScope("insights-index", {
    Escape: () => {
      void navigate({ to: "/app/clients" });
    },
  });

  if (
    overview === undefined ||
    segments === undefined ||
    topClients === undefined ||
    dormants === undefined ||
    seasonality === undefined ||
    familyMix === undefined ||
    revenueTimeline === undefined ||
    archiveYearly === undefined ||
    growthYoy === undefined
  ) {
    return <InsightsDashboardSkeleton />;
  }

  const timelineWithArchive = {
    ...revenueTimeline,
    archive: archiveYearly,
  };

  return (
    <Layout size="xl">
      <LayoutHeader>
        <LayoutTitle>Tableau de bord BI</LayoutTitle>
        <Typography variant="muted">
          Vue analytique sur les {overview.total_clients} clients et 16 ans
          d'historique. Échap pour revenir à la liste clients.
        </Typography>
      </LayoutHeader>
      <LayoutContent>
        <div className="flex flex-col gap-4">
          <OverviewKpisCard overview={overview} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SegmentsCard segments={segments} />
            <SeasonalityCard months={seasonality} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TopClientsCard rows={topClients} />
            <DormantClientsCard rows={dormants} />
          </div>
          <RevenueTimelineCard timeline={timelineWithArchive} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <FamilyMixCard mix={familyMix} />
            <GrowthYoYCard growth={growthYoy} />
          </div>
        </div>
      </LayoutContent>
    </Layout>
  );
}
