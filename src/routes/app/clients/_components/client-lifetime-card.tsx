import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientLifetimeStatsDto } from "@convex/legacy/dto/clientLifetimeStats";
import type { ClientStatus } from "@convex/utils/clientStatus";
import { openClientStatusExplainDrawer } from "./drilldowns/client-status-explain-drawer";

function formatAmount(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(ms: number | null): string {
  if (ms === null) return "—";
  const d = new Date(ms);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const STATUS_META: Record<ClientStatus, { label: string; tone: string }> = {
  new: { label: "Nouveau", tone: "bg-muted text-foreground" },
  top: { label: "Top client", tone: "bg-emerald-500/15 text-emerald-700" },
  regular: { label: "Régulier", tone: "bg-blue-500/15 text-blue-700" },
  occasional: { label: "Occasionnel", tone: "bg-amber-500/15 text-amber-700" },
  dormant: { label: "Dormant", tone: "bg-orange-500/15 text-orange-700" },
  lost: { label: "Perdu", tone: "bg-destructive/15 text-destructive" },
};

function KpiBlock({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-muted-foreground text-[13px]">{label}</div>
      <div className="font-mono text-[15px] tabular-nums">{value}</div>
      {hint ? (
        <div className="text-muted-foreground text-[11px]">{hint}</div>
      ) : null}
    </div>
  );
}

export function ClientLifetimeCard({
  stats,
}: {
  stats: ClientLifetimeStatsDto;
}) {
  const status = STATUS_META[stats.status];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Cycle de vie (16 ans)</CardTitle>
        <button
          type="button"
          onClick={() => openClientStatusExplainDrawer(stats)}
          className="hover:ring-primary/40 rounded-md transition hover:ring-2"
          title="Pourquoi ce status ?"
        >
          <Badge className={status.tone} variant="outline">
            {status.label}
          </Badge>
        </button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <KpiBlock
            label="LTV HT"
            value={`${formatAmount(stats.ltv_ht)} €`}
            hint={
              stats.archive_pre_2011_ht > 0
                ? `dont ${formatAmount(stats.archive_pre_2011_ht)} € avant 2011`
                : undefined
            }
          />
          <KpiBlock
            label="CA 12 mois"
            value={`${formatAmount(stats.ca_12m_ht)} €`}
          />
          <KpiBlock
            label="Panier moyen"
            value={
              stats.avg_basket_ht !== null
                ? `${formatAmount(stats.avg_basket_ht)} €`
                : "—"
            }
          />
          <KpiBlock
            label="Premier achat"
            value={formatDate(stats.first_invoice_at)}
            hint={`${stats.total_invoices} factures · ${stats.total_quotations} devis`}
          />
          <KpiBlock
            label="Dernier achat"
            value={formatDate(stats.last_invoice_at)}
            hint={
              stats.days_since_last !== null
                ? `il y a ${stats.days_since_last} jours`
                : undefined
            }
          />
          <KpiBlock
            label="Fréquence moyenne"
            value={
              stats.avg_days_between_invoices !== null
                ? `${stats.avg_days_between_invoices} j`
                : "—"
            }
            hint="entre factures"
          />
        </div>
      </CardContent>
    </Card>
  );
}
