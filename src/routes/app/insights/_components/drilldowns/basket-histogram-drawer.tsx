import { useQuery } from "convex/react";
import { ShoppingBag } from "lucide-react";
import { api } from "@convex/_generated/api";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { DrawerLoading, formatAmount } from "./drilldown-shared";

function BasketHistogramDrawer() {
  const data = useQuery(api.insights.drilldown.getBasketHistogram, {
    monthsBack: 12,
  });
  if (data === undefined) return <DrawerLoading />;
  const maxCount = Math.max(...data.bins.map((b) => b.count), 1);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3 text-[12px]">
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[11px]">Factures</span>
          <span className="font-mono text-[15px] tabular-nums">
            {data.total_invoices}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[11px]">
            Panier moyen
          </span>
          <span className="font-mono text-[15px] tabular-nums">
            {formatAmount(data.avg_basket_ht)} €
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[11px]">Médiane</span>
          <span className="font-mono text-[15px] tabular-nums">
            {formatAmount(data.median_basket_ht)} €
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {data.bins.map((b) => {
          const widthPct = (b.count / maxCount) * 100;
          return (
            <div key={b.label} className="flex flex-col gap-1 text-[12px]">
              <div className="flex items-baseline justify-between font-mono">
                <span>{b.label}</span>
                <span className="tabular-nums">
                  {b.count} fact. · {formatAmount(b.ca_ht)} € (
                  {b.share_pct.toFixed(1)}%)
                </span>
              </div>
              <div className="bg-muted h-2 overflow-hidden rounded-sm">
                <div
                  className="bg-primary/70 h-full"
                  style={{ width: `${widthPct.toFixed(1)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function openBasketHistogramDrawer() {
  dialogManager.custom({
    title: "Histogramme paniers · 12 mois",
    description: "Distribution des paniers facture par fourchette.",
    icon: ShoppingBag,
    size: "lg",
    children: <BasketHistogramDrawer />,
  });
}
