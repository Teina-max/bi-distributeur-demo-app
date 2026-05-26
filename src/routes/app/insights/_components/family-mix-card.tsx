import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FamilyMixDto } from "@convex/insights/dto/familyMix";
import { openFamilyDetailsDrawer } from "./drilldowns/family-details-drawer";

function formatAmount(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function FamilyMixCard({ mix }: { mix: FamilyMixDto }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">
          Mix familles · {mix.months_back} mois
        </CardTitle>
        <span className="text-muted-foreground font-mono text-[12px]">
          {formatAmount(mix.total_ca_ht)} € HT
        </span>
      </CardHeader>
      <CardContent>
        {mix.entries.length === 0 ? (
          <div className="text-muted-foreground text-[13px]">
            Pas de ventes article sur la période.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {mix.entries.slice(0, 12).map((f) => (
              <button
                key={f.family_code}
                type="button"
                onClick={() => openFamilyDetailsDrawer(f.family_code)}
                className="hover:bg-muted/40 flex flex-col gap-0.5 rounded-md p-1 text-left transition"
              >
                <div className="flex items-baseline justify-between gap-2 font-mono text-[11px]">
                  <span className="truncate">
                    {f.family_code}
                    {f.product_count > 0 ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · {f.product_count} ref
                      </span>
                    ) : null}
                  </span>
                  <span className="tabular-nums">
                    {formatAmount(f.ca_ht)} €
                    <span className="text-muted-foreground ml-2">
                      {f.share_pct.toFixed(1)}%
                    </span>
                  </span>
                </div>
                <div className="bg-muted h-1.5 overflow-hidden rounded-sm">
                  <div
                    className="bg-primary/70 h-full"
                    style={{ width: `${f.share_pct.toFixed(1)}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
