import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GrowthRow, GrowthYoYDto } from "@convex/insights/dto/growthYoY";

function formatAmount(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatPct(v: number | null): string {
  if (v === null) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(0)}%`;
}

function Section({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: GrowthRow[];
  tone: "positive" | "negative";
}) {
  const colorAbs =
    tone === "positive" ? "text-emerald-700" : "text-destructive";
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-muted-foreground text-[11px]">{title}</div>
      {rows.length === 0 ? (
        <div className="text-muted-foreground text-[12px]">Aucun</div>
      ) : (
        rows.map((r) => (
          <Link
            key={r.client_id}
            to="/app/clients/$clientId"
            params={{ clientId: r.client_id }}
            className="border-border/40 hover:bg-muted/50 grid grid-cols-[1fr_auto_auto] gap-x-3 border-t py-1 font-mono text-[12px]"
          >
            <div className="flex min-w-0 flex-col self-center">
              <span className="truncate">{r.name}</span>
              <span className="text-muted-foreground truncate text-[10px]">
                {r.code}
              </span>
            </div>
            <div className="text-muted-foreground self-center text-right font-mono text-[11px] tabular-nums">
              {formatAmount(r.ca_prev)} → {formatAmount(r.ca_current)} €
            </div>
            <div
              className={`flex flex-col items-end self-center font-mono tabular-nums ${colorAbs}`}
            >
              <span>{formatAmount(r.growth_abs)} €</span>
              <span className="text-[10px]">{formatPct(r.growth_pct)}</span>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}

export function GrowthYoYCard({ growth }: { growth: GrowthYoYDto }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Croissance {growth.prev_year} → {growth.year}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Section
            title="Top progressions"
            rows={growth.top_growers}
            tone="positive"
          />
          <Section
            title="Top reculs"
            rows={growth.top_decliners}
            tone="negative"
          />
        </div>
      </CardContent>
    </Card>
  );
}
