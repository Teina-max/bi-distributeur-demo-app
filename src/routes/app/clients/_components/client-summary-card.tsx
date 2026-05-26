import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientActivitySummaryDto } from "@convex/clients/dto/clientActivitySummary";

function formatAmount(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function StatusCounts({
  title,
  counts,
}: {
  title: string;
  counts: Record<string, number>;
}) {
  const entries = Object.entries(counts);
  return (
    <div className="flex flex-col gap-1">
      <div className="text-muted-foreground text-[13px]">{title}</div>
      {entries.length === 0 ? (
        <div className="text-muted-foreground text-[13px]">Aucun</div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {entries.map(([status, count]) => (
            <Badge key={status} variant="outline" className="font-mono">
              {status}: {count}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function ClientSummaryCard({
  summary,
}: {
  summary: ClientActivitySummaryDto;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Synthèse activité</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <div>
            <div className="text-muted-foreground text-[13px]">CA HT</div>
            <div
              className="font-mono text-[15px] tabular-nums"
              data-testid="client-summary-total"
            >
              {formatAmount(summary.totalRevenueHt)} €
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-[13px]">Encours HT</div>
            <div
              className="font-mono text-[15px] tabular-nums"
              data-testid="client-summary-pending"
            >
              {formatAmount(summary.pendingRevenueHt)} €
            </div>
          </div>
          <StatusCounts title="Devis" counts={summary.countQuotations} />
          <StatusCounts title="BL" counts={summary.countDeliveryForms} />
          <StatusCounts title="Factures" counts={summary.countInvoices} />
        </div>
      </CardContent>
    </Card>
  );
}
