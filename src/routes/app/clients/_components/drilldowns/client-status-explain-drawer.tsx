import { Info } from "lucide-react";
import type { ClientLifetimeStatsDto } from "@convex/legacy/dto/clientLifetimeStats";
import type { ClientStatus } from "@convex/utils/clientStatus";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { formatAmount } from "./drilldown-shared";

const STATUS_DEFINITION: Record<ClientStatus, string> = {
  new: "Aucune facture enregistrée à ce jour.",
  top: "CA 12 mois ≥ 5 000 € HT et dernier achat dans les 180 derniers jours.",
  regular: "Dernier achat dans les 90 derniers jours.",
  occasional: "Dernier achat entre 91 et 180 jours.",
  dormant: "Dernier achat entre 181 et 540 jours — relance recommandée.",
  lost: "Dernier achat il y a plus de 540 jours — client à reconquérir.",
};

function Rule({
  label,
  expected,
  current,
  match,
}: {
  label: string;
  expected: string;
  current: string;
  match: boolean | null;
}) {
  const matchCls =
    match === null ? "" : match ? "text-emerald-700" : "text-muted-foreground";
  return (
    <div className="border-border/40 grid grid-cols-[1fr_auto_auto] gap-x-3 border-t py-1 text-[12px]">
      <div>{label}</div>
      <div className="text-muted-foreground font-mono text-[11px]">
        {expected}
      </div>
      <div className={`font-mono text-[11px] tabular-nums ${matchCls}`}>
        {current}
      </div>
    </div>
  );
}

function ClientStatusExplainDrawer({
  stats,
}: {
  stats: ClientLifetimeStatsDto;
}) {
  const days = stats.days_since_last;
  return (
    <div className="flex flex-col gap-3 text-[12px]">
      <div className="bg-muted/30 rounded-md p-3">
        <div className="text-muted-foreground text-[11px] tracking-wide uppercase">
          Status actuel : {stats.status.toUpperCase()}
        </div>
        <div className="mt-1">{STATUS_DEFINITION[stats.status]}</div>
      </div>

      <div className="flex flex-col gap-0.5">
        <div className="text-muted-foreground grid grid-cols-[1fr_auto_auto] gap-x-3 text-[10px]">
          <div>Critère</div>
          <div>Seuil</div>
          <div>Valeur</div>
        </div>
        <Rule
          label="Aucune facture"
          expected="= 0"
          current={`${stats.total_invoices}`}
          match={stats.status === "new"}
        />
        <Rule
          label="CA 12 mois HT"
          expected="≥ 5 000 €"
          current={`${formatAmount(stats.ca_12m_ht)} €`}
          match={stats.ca_12m_ht >= 5000}
        />
        <Rule
          label="Dernier achat — régulier"
          expected="≤ 90 jours"
          current={days !== null ? `${days} j` : "—"}
          match={days !== null ? days <= 90 : null}
        />
        <Rule
          label="Dernier achat — occasionnel"
          expected="≤ 180 jours"
          current={days !== null ? `${days} j` : "—"}
          match={days !== null ? days <= 180 : null}
        />
        <Rule
          label="Dernier achat — dormant"
          expected="≤ 540 jours"
          current={days !== null ? `${days} j` : "—"}
          match={days !== null ? days <= 540 : null}
        />
        <Rule
          label="Dernier achat — perdu"
          expected="> 540 jours"
          current={days !== null ? `${days} j` : "—"}
          match={days !== null ? days > 540 : null}
        />
      </div>
    </div>
  );
}

export function openClientStatusExplainDrawer(stats: ClientLifetimeStatsDto) {
  dialogManager.custom({
    title: "Pourquoi ce status ?",
    description:
      "Règles de scoring auto à partir du CA 12m et du dernier achat.",
    icon: Info,
    size: "lg",
    children: <ClientStatusExplainDrawer stats={stats} />,
  });
}
