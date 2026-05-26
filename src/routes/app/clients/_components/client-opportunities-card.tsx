import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientOpportunitiesDto } from "@convex/legacy/dto/clientOpportunities";

function formatAmount(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function ClientOpportunitiesCard({
  opportunities,
}: {
  opportunities: ClientOpportunitiesDto;
}) {
  const noContent =
    opportunities.abandoned.length === 0 &&
    opportunities.cross_sell.length === 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Opportunités · {opportunities.months_threshold} mois
        </CardTitle>
      </CardHeader>
      <CardContent>
        {noContent ? (
          <div className="text-muted-foreground text-[13px]">
            Aucune opportunité détectée — client à jour sur ses habitudes.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-1 text-[12px]">
              <div className="text-muted-foreground text-[11px]">
                Articles abandonnés · à relancer
              </div>
              {opportunities.abandoned.length === 0 ? (
                <div className="text-muted-foreground text-[11px]">
                  Aucun article abandonné.
                </div>
              ) : (
                opportunities.abandoned.slice(0, 10).map((a) => (
                  <div
                    key={a.code}
                    className="border-border/40 grid grid-cols-[1fr_80px_80px_80px] gap-x-3 border-t py-1 font-mono"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">{a.name}</span>
                      <span className="text-muted-foreground truncate text-[10px]">
                        {a.code}
                      </span>
                    </div>
                    <div className="text-muted-foreground self-center text-right text-[11px] tabular-nums">
                      {formatDate(a.last_purchase_at)}
                    </div>
                    <div className="self-center text-right tabular-nums">
                      {a.days_since} j
                    </div>
                    <div className="self-center text-right tabular-nums">
                      {formatAmount(a.ca_historical_ht)} €
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-col gap-1 text-[12px]">
              <div className="text-muted-foreground text-[11px]">
                Cross-sell · articles populaires non achetés
              </div>
              {opportunities.cross_sell.length === 0 ? (
                <div className="text-muted-foreground text-[11px]">
                  Pas de suggestion.
                </div>
              ) : (
                opportunities.cross_sell.map((c) => (
                  <div
                    key={c.code}
                    className="border-border/40 grid grid-cols-[1fr_72px_84px] gap-x-3 border-t py-1 font-mono"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">{c.name}</span>
                      <span className="text-muted-foreground truncate text-[10px]">
                        {c.code} {c.family_code ? `· ${c.family_code}` : ""}
                      </span>
                    </div>
                    <div className="text-muted-foreground self-center text-right text-[11px] tabular-nums">
                      {c.top_buyer_count} mois
                    </div>
                    <div className="self-center text-right tabular-nums">
                      {formatAmount(c.popularity_score)} €
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
