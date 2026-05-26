import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TopClientDto } from "@convex/insights/dto/topClient";

function formatAmount(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-6 items-end gap-px">
      {values.map((v, i) => {
        const h = max > 0 ? Math.max((v / max) * 100, 2) : 2;
        return (
          <div
            key={i}
            className="bg-primary/70 w-1 rounded-sm"
            style={{ height: `${h.toFixed(1)}%` }}
          />
        );
      })}
    </div>
  );
}

export function TopClientsCard({ rows }: { rows: TopClientDto[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Top {rows.length} clients · CA HT 12m
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-muted-foreground text-[13px]">
            Aucune activité sur les 12 derniers mois.
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <div className="text-muted-foreground grid grid-cols-[24px_1fr_72px_100px_84px] gap-x-3 text-[11px]">
              <div>#</div>
              <div>Client</div>
              <div>Activité 12m</div>
              <div className="text-right">CA 12m HT</div>
              <div className="text-right">LTV HT</div>
            </div>
            {rows.map((row, idx) => (
              <Link
                key={row.client_id}
                to="/app/clients/$clientId"
                params={{ clientId: row.client_id }}
                className="border-border/40 hover:bg-muted/50 grid grid-cols-[24px_1fr_72px_100px_84px] gap-x-3 border-t py-1 font-mono text-[12px]"
              >
                <div className="text-muted-foreground self-center">
                  {idx + 1}
                </div>
                <div className="flex min-w-0 flex-col self-center">
                  <span className="truncate text-[12px]">{row.name}</span>
                  <span className="text-muted-foreground truncate text-[10px]">
                    {row.code} · {row.vendor ?? "—"} · {row.sector ?? "—"}
                  </span>
                </div>
                <div className="self-center">
                  <Sparkline values={row.sparkline_12m} />
                </div>
                <div className="self-center text-right tabular-nums">
                  {formatAmount(row.ca_12m_ht)} €
                </div>
                <div className="flex flex-col items-end self-center">
                  <span className="tabular-nums">
                    {formatAmount(row.ca_total_ht)} €
                  </span>
                  <Badge
                    variant="outline"
                    className="h-4 px-1 text-[9px] uppercase"
                  >
                    {row.status}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
