import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DormantClientDto } from "@convex/insights/dto/dormantClient";

function formatAmount(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDate(ms: number | null): string {
  if (ms === null) return "—";
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function DormantClientsCard({ rows }: { rows: DormantClientDto[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          À relancer · {rows.length} dormants
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-muted-foreground text-[13px]">
            Aucun client dormant à relancer.
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <div className="text-muted-foreground grid grid-cols-[1fr_80px_60px_84px] gap-x-3 text-[11px]">
              <div>Client</div>
              <div>Dernier</div>
              <div className="text-right">Depuis</div>
              <div className="text-right">LTV HT</div>
            </div>
            {rows.map((row) => (
              <Link
                key={row.client_id}
                to="/app/clients/$clientId"
                params={{ clientId: row.client_id }}
                className="border-border/40 hover:bg-muted/50 grid grid-cols-[1fr_80px_60px_84px] gap-x-3 border-t py-1 font-mono text-[12px]"
              >
                <div className="flex min-w-0 flex-col self-center">
                  <span className="truncate">{row.name}</span>
                  <span className="text-muted-foreground truncate text-[10px]">
                    {row.code} · {row.vendor ?? "—"}
                  </span>
                </div>
                <div className="self-center">
                  {formatDate(row.last_invoice_at)}
                </div>
                <div className="self-center text-right tabular-nums">
                  {row.days_since_last !== null
                    ? `${row.days_since_last} j`
                    : "—"}
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
