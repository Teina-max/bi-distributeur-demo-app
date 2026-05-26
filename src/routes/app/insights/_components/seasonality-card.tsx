import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SeasonalityMonthDto } from "@convex/insights/dto/globalSeasonality";
import { openSeasonalMonthDrawer } from "./drilldowns/seasonal-month-drawer";

function formatAmount(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function SeasonalityCard({ months }: { months: SeasonalityMonthDto[] }) {
  const max = Math.max(...months.map((m) => m.avg_ca_ht), 1);
  const yearsCount = Math.max(...months.map((m) => m.years_count), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Saisonnalité · {yearsCount} ans moyenne
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-32 items-end gap-2">
          {months.map((m) => {
            const h = max > 0 ? (m.avg_ca_ht / max) * 100 : 0;
            return (
              <button
                key={m.month}
                type="button"
                onClick={() => openSeasonalMonthDrawer(m.month)}
                className="hover:bg-muted/40 flex flex-1 flex-col items-center gap-1 rounded-md p-1 transition"
                title={`${m.label} · ${formatAmount(m.avg_ca_ht)} € moyen sur ${m.years_count} ans · cliquez pour le détail`}
              >
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="bg-primary/70 w-full rounded-t-sm"
                    style={{ height: `${h.toFixed(1)}%` }}
                  />
                </div>
                <div className="text-muted-foreground font-mono text-[10px]">
                  {m.label}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
