import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientPersonalSeasonalityDto } from "@convex/legacy/dto/clientPersonalSeasonality";

function formatAmount(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function ClientPersonalSeasonalityCard({
  seasonality,
}: {
  seasonality: ClientPersonalSeasonalityDto;
}) {
  const max = Math.max(...seasonality.months.map((m) => m.avg_ca_ht), 1);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Saisonnalité client · {seasonality.years_observed} ans
        </CardTitle>
      </CardHeader>
      <CardContent>
        {seasonality.years_observed === 0 ? (
          <div className="text-muted-foreground text-[13px]">
            Pas assez de données pour calculer la saisonnalité.
          </div>
        ) : (
          <div className="flex h-32 items-end gap-2">
            {seasonality.months.map((m) => {
              const h = max > 0 ? (m.avg_ca_ht / max) * 100 : 0;
              return (
                <div
                  key={m.month}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={`${m.label} · ${formatAmount(m.avg_ca_ht)} € moyen sur ${m.years_count} ans`}
                >
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={`w-full rounded-t-sm ${m.peak ? "bg-emerald-500/80" : "bg-primary/70"}`}
                      style={{ height: `${h.toFixed(1)}%` }}
                    />
                  </div>
                  <div
                    className={`font-mono text-[10px] ${m.peak ? "font-semibold text-emerald-700" : "text-muted-foreground"}`}
                  >
                    {m.label}
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
