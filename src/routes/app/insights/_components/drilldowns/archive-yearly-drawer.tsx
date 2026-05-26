import { useQuery } from "convex/react";
import { Archive } from "lucide-react";
import { api } from "@convex/_generated/api";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { DrawerLoading, formatAmount } from "./drilldown-shared";

function ArchiveYearlyDrawer() {
  const data = useQuery(api.insights.queries.getArchiveYearly, {});
  if (data === undefined) return <DrawerLoading />;
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground text-[13px]">
        Aucune archive pré-2011.
      </div>
    );
  }
  const max = Math.max(...data.map((r) => r.ca_ht), 1);
  return (
    <div className="flex flex-col gap-1 text-[12px]">
      <div className="text-muted-foreground text-[11px]">
        Agrégat annuel de l'historique pré-2011 (lecture seule).
      </div>
      <div className="text-muted-foreground grid grid-cols-[60px_120px_70px_1fr] gap-x-3 text-[10px]">
        <div>Année</div>
        <div className="text-right">CA HT</div>
        <div className="text-right">Fact.</div>
        <div></div>
      </div>
      {data.map((r) => {
        const pct = (r.ca_ht / max) * 100;
        return (
          <div
            key={r.year}
            className="border-border/40 grid grid-cols-[60px_120px_70px_1fr] gap-x-3 border-t py-1 font-mono"
          >
            <div className="self-center">{r.year}</div>
            <div className="self-center text-right tabular-nums">
              {formatAmount(r.ca_ht)} €
            </div>
            <div className="text-muted-foreground self-center text-right tabular-nums">
              {r.invoice_count}
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
  );
}

export function openArchiveYearlyDrawer() {
  dialogManager.custom({
    title: "Archive · pré-2011",
    description: "Agrégat annuel des factures historiques.",
    icon: Archive,
    size: "lg",
    children: <ArchiveYearlyDrawer />,
  });
}
