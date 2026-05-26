import { Card, CardContent } from "@/components/ui/card";
import type { InsightsOverviewDto } from "@convex/insights/dto/insightsOverview";
import { openActiveClientsDrawer } from "./drilldowns/active-clients-drawer";
import { openArchiveYearlyDrawer } from "./drilldowns/archive-yearly-drawer";
import { openBasketHistogramDrawer } from "./drilldowns/basket-histogram-drawer";
import { openTopClientsDrawer } from "./drilldowns/top-clients-drawer";

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

function Tile({
  label,
  value,
  hint,
  tone = "default",
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "negative";
  onClick?: () => void;
}) {
  const toneCls =
    tone === "positive"
      ? "text-emerald-700"
      : tone === "negative"
        ? "text-destructive"
        : "";
  const interactive = onClick !== undefined;
  return (
    <Card
      onClick={onClick}
      className={
        interactive ? "hover:ring-primary/40 cursor-pointer hover:ring-2" : ""
      }
    >
      <CardContent className="flex flex-col gap-1 py-4">
        <div className="text-muted-foreground text-[11px] tracking-wide uppercase">
          {label}
        </div>
        <div className={`font-mono text-[20px] tabular-nums ${toneCls}`}>
          {value}
        </div>
        {hint ? (
          <div className="text-muted-foreground text-[11px]">{hint}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function OverviewKpisCard({
  overview,
}: {
  overview: InsightsOverviewDto;
}) {
  const growthTone =
    overview.growth_pct === null
      ? "default"
      : overview.growth_pct >= 0
        ? "positive"
        : "negative";
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Tile
        label="CA HT 12 mois"
        value={`${formatAmount(overview.ca_12m_ht)} €`}
        hint={`${overview.total_invoices_12m} factures`}
        onClick={openTopClientsDrawer}
      />
      <Tile
        label="Croissance N/N-1"
        value={formatPct(overview.growth_pct)}
        hint={
          overview.ca_prev_12m_ht > 0
            ? `vs ${formatAmount(overview.ca_prev_12m_ht)} €`
            : "n-1 indisponible"
        }
        tone={growthTone}
      />
      <Tile
        label="Clients actifs 12m"
        value={`${overview.active_clients_12m}`}
        hint={`/ ${overview.total_clients} en base`}
        onClick={openActiveClientsDrawer}
      />
      <Tile
        label="Panier moyen HT"
        value={
          overview.avg_basket_ht !== null
            ? `${formatAmount(overview.avg_basket_ht)} €`
            : "—"
        }
        onClick={openBasketHistogramDrawer}
      />
      <Tile
        label="Profondeur historique"
        value={
          overview.oldest_data_year !== null
            ? `${overview.oldest_data_year} →`
            : "—"
        }
        hint="première année observée"
        onClick={openArchiveYearlyDrawer}
      />
    </div>
  );
}
