import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientYearlyRevenueDto } from "@convex/legacy/dto/clientYearlyRevenue";

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

export function ClientYearlyRevenueCard({
  yearly,
}: {
  yearly: ClientYearlyRevenueDto;
}) {
  const max = Math.max(...yearly.rows.map((r) => r.ca_ht), 1);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Évolution annuelle</CardTitle>
        <div className="flex items-center gap-2 text-[12px]">
          {yearly.best_year !== null ? (
            <Badge
              variant="outline"
              className="bg-emerald-500/15 text-emerald-700"
            >
              Meilleure {yearly.best_year} ·{" "}
              {formatAmount(yearly.best_year_ca_ht)} €
            </Badge>
          ) : null}
          {yearly.growth_pct_last_year !== null ? (
            <Badge
              variant="outline"
              className={
                yearly.growth_pct_last_year >= 0
                  ? "bg-emerald-500/15 text-emerald-700"
                  : "bg-destructive/15 text-destructive"
              }
            >
              N/N-1 {formatPct(yearly.growth_pct_last_year)}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {yearly.rows.length === 0 ? (
          <div className="text-muted-foreground text-[13px]">
            Aucun historique annuel.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="text-muted-foreground grid grid-cols-[60px_24px_120px_70px_1fr] gap-x-3 text-[10px]">
              <div>Année</div>
              <div></div>
              <div className="text-right">CA HT</div>
              <div className="text-right">Fact.</div>
              <div></div>
            </div>
            {yearly.rows.map((r) => {
              const pct = (r.ca_ht / max) * 100;
              const isBest = r.year === yearly.best_year;
              return (
                <div
                  key={r.year}
                  className="border-border/40 grid grid-cols-[60px_24px_120px_70px_1fr] gap-x-3 border-t py-1 font-mono text-[12px]"
                >
                  <div className="self-center">{r.year}</div>
                  <div className="self-center">
                    {r.is_archive ? (
                      <span
                        className="text-muted-foreground text-[9px]"
                        title="Agrégat pré-2011"
                      >
                        ARC
                      </span>
                    ) : null}
                  </div>
                  <div
                    className={`self-center text-right tabular-nums ${
                      isBest ? "text-emerald-700" : ""
                    }`}
                  >
                    {formatAmount(r.ca_ht)} €
                  </div>
                  <div className="text-muted-foreground self-center text-right tabular-nums">
                    {r.invoice_count}
                  </div>
                  <div className="bg-muted h-1.5 self-center overflow-hidden rounded-sm">
                    <div
                      className={`h-full ${isBest ? "bg-emerald-500/70" : "bg-primary/70"}`}
                      style={{ width: `${pct.toFixed(1)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
