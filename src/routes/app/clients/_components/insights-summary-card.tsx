import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatAmount(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatPct(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-muted-foreground text-[11px] tracking-wide uppercase">
        {label}
      </div>
      <div className="font-mono text-[15px] tabular-nums">{value}</div>
    </div>
  );
}

export function InsightsSummaryCard() {
  const overview = useQuery(api.insights.queries.getOverview, {});

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
        {overview === undefined ? (
          <div className="flex flex-wrap items-center gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Tile
              label="CA 12m HT"
              value={`${formatAmount(overview.ca_12m_ht)} €`}
            />
            <Tile label="Croissance" value={formatPct(overview.growth_pct)} />
            <Tile
              label="Clients actifs"
              value={`${overview.active_clients_12m} / ${overview.total_clients}`}
            />
            <Tile
              label="Panier moyen"
              value={
                overview.avg_basket_ht !== null
                  ? `${formatAmount(overview.avg_basket_ht)} €`
                  : "—"
              }
            />
          </div>
        )}
        <Link
          to="/app/insights"
          className="hover:bg-muted inline-flex items-center gap-1 self-end rounded-md border px-3 py-2 font-mono text-[12px] lg:self-center"
        >
          Tableau de bord BI
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
