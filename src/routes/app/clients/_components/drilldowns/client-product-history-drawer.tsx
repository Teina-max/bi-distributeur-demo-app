import { useQuery } from "convex/react";
import { Package } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import {
  ClientLink,
  DrawerLoading,
  formatAmount,
  formatDate,
} from "./drilldown-shared";

function ClientProductHistoryDrawer({
  clientId,
  productId,
}: {
  clientId: Id<"clients">;
  productId: Id<"products">;
}) {
  const data = useQuery(api.legacy.clientDrilldown.getClientProductHistory, {
    client_id: clientId,
    product_id: productId,
  });
  if (data === undefined) return <DrawerLoading />;
  if (data === null || data.purchase_count === 0) {
    return (
      <div className="text-muted-foreground text-[13px]">
        Aucun achat de cet article par ce client.
      </div>
    );
  }
  const maxQty = Math.max(...data.timeline.map((t) => t.qty), 1);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 text-[12px] lg:grid-cols-4">
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[11px]">Qté totale</span>
          <span className="font-mono text-[15px] tabular-nums">
            {formatAmount(data.total_qty)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[11px]">
            CA HT cumulé
          </span>
          <span className="font-mono text-[15px] tabular-nums">
            {formatAmount(data.total_ca_ht)} €
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[11px]">PU TTC moy.</span>
          <span className="font-mono text-[15px] tabular-nums">
            {formatAmount(data.avg_unit_price_ttc, 2)} €
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[11px]">
            Premier / dernier
          </span>
          <span className="font-mono text-[12px] tabular-nums">
            {formatDate(data.first_purchase_at)} →{" "}
            {formatDate(data.last_purchase_at)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-1 text-[12px]">
          <div className="text-muted-foreground text-[11px]">
            Achats par mois — qté et CA HT
          </div>
          <div className="text-muted-foreground grid grid-cols-[80px_60px_80px_90px_1fr] gap-x-3 text-[10px]">
            <div>Période</div>
            <div className="text-right">Qté</div>
            <div className="text-right">PU TTC</div>
            <div className="text-right">CA HT</div>
            <div></div>
          </div>
          {data.timeline.map((t) => {
            const pct = (t.qty / maxQty) * 100;
            return (
              <div
                key={`${t.year}-${t.month}`}
                className="border-border/40 grid grid-cols-[80px_60px_80px_90px_1fr] gap-x-3 border-t py-1 font-mono"
              >
                <div className="self-center">
                  {String(t.month).padStart(2, "0")}/{t.year}
                </div>
                <div className="self-center text-right tabular-nums">
                  {formatAmount(t.qty)}
                </div>
                <div className="self-center text-right tabular-nums">
                  {formatAmount(t.avg_unit_price_ttc, 2)} €
                </div>
                <div className="self-center text-right tabular-nums">
                  {formatAmount(t.ca_ht)} €
                </div>
                <div className="bg-muted h-1.5 self-center overflow-hidden rounded-sm">
                  <div
                    className="bg-primary/70 h-full"
                    style={{ width: `${pct.toFixed(1)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-1 text-[12px]">
          <div className="text-muted-foreground text-[11px]">
            Autres clients de cet article
          </div>
          {data.similar_clients.length === 0 ? (
            <div className="text-muted-foreground text-[11px]">
              Aucun autre client.
            </div>
          ) : (
            data.similar_clients.map((s) => (
              <ClientLink key={s.client_id} id={s.client_id}>
                <div className="border-border/40 grid grid-cols-[1fr_60px_80px] gap-x-3 border-t py-1">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{s.name}</span>
                    <span className="text-muted-foreground truncate text-[10px]">
                      {s.code}
                    </span>
                  </div>
                  <div className="self-center text-right tabular-nums">
                    {formatAmount(s.qty_purchased)}
                  </div>
                  <div className="self-center text-right tabular-nums">
                    {formatAmount(s.ca_ht)} €
                  </div>
                </div>
              </ClientLink>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function openClientProductHistoryDrawer(
  clientId: Id<"clients">,
  productId: Id<"products">,
  productLabel?: string,
) {
  dialogManager.custom({
    title: productLabel ? `Article ${productLabel}` : "Historique article",
    description:
      "Courbe d'achat du client pour cet article + autres clients similaires.",
    icon: Package,
    size: "xl",
    children: (
      <ClientProductHistoryDrawer clientId={clientId} productId={productId} />
    ),
  });
}
