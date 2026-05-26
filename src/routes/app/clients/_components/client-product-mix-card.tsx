import type { Id } from "@convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientProductMixDto } from "@convex/legacy/dto/clientProductMix";
import { openClientProductHistoryDrawer } from "./drilldowns/client-product-history-drawer";

function formatAmount(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatQty(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function ClientProductMixCard({
  clientId,
  mix,
}: {
  clientId: Id<"clients">;
  mix: ClientProductMixDto;
}) {
  if (mix.top_products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mix produits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-[13px]">
            Aucune ligne facture sur les {mix.months_back} derniers mois.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">
          Mix produits · {mix.months_back} mois
        </CardTitle>
        <span className="text-muted-foreground font-mono text-[12px]">
          {formatAmount(mix.total_ca_ht)} € HT
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-1">
            <div className="text-muted-foreground grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-1 text-[11px]">
              <div>Article</div>
              <div className="text-right">Qté</div>
              <div className="text-right">PU TTC moy.</div>
              <div className="text-right">CA HT</div>
            </div>
            {mix.top_products.map((p) => (
              <button
                key={`${p.code}-${p.product_id ?? "raw"}`}
                type="button"
                disabled={p.product_id === null}
                onClick={() =>
                  p.product_id
                    ? openClientProductHistoryDrawer(
                        clientId,
                        p.product_id,
                        `${p.code} · ${p.name}`,
                      )
                    : undefined
                }
                className="border-border/40 hover:bg-muted/40 grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-0.5 border-t py-1 text-left transition disabled:cursor-not-allowed disabled:opacity-70"
                title={`Dernier achat : ${formatDate(p.last_purchase_at)} · ${p.purchase_count} occurrences · cliquez pour l'historique`}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-mono text-[12px]">
                    {p.code}
                  </span>
                  <span className="text-muted-foreground truncate text-[11px]">
                    {p.name}
                  </span>
                </div>
                <div className="self-center text-right font-mono text-[12px] tabular-nums">
                  {formatQty(p.total_qty)}
                </div>
                <div className="self-center text-right font-mono text-[12px] tabular-nums">
                  {formatAmount(p.avg_unit_price_ttc)} €
                </div>
                <div className="self-center text-right font-mono text-[12px] tabular-nums">
                  {formatAmount(p.total_ht)} €
                </div>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-muted-foreground mb-1 text-[11px]">
              Répartition par famille
            </div>
            {mix.family_breakdown.slice(0, 8).map((f) => (
              <div key={f.family_code} className="flex flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-2 font-mono text-[11px]">
                  <span className="truncate">{f.family_code}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {f.share_pct.toFixed(1)}%
                  </span>
                </div>
                <div className="bg-muted h-1.5 overflow-hidden rounded-sm">
                  <div
                    className="bg-primary/70 h-full"
                    style={{ width: `${f.share_pct.toFixed(1)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
