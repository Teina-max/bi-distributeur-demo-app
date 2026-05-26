import type { Id } from "@convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientMonthlyTimelineDto } from "@convex/legacy/dto/clientMonthlyTimeline";
import { openClientMonthInvoicesDrawer } from "./drilldowns/client-month-invoices-drawer";

const MONTHS_LABEL = [
  "J",
  "F",
  "M",
  "A",
  "M",
  "J",
  "J",
  "A",
  "S",
  "O",
  "N",
  "D",
];

function formatAmount(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function ClientMonthlyTimelineCard({
  clientId,
  timeline,
}: {
  clientId: Id<"clients">;
  timeline: ClientMonthlyTimelineDto;
}) {
  const { monthly, archive } = timeline;
  if (monthly.length === 0 && archive.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activité par mois</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-[13px]">
            Aucune donnée historique pour ce client.
          </div>
        </CardContent>
      </Card>
    );
  }

  const monthlyByKey = new Map<string, (typeof monthly)[number]>();
  let maxCa = 0;
  const years = new Set<number>();
  for (const entry of monthly) {
    monthlyByKey.set(`${entry.year}-${entry.month}`, entry);
    if (entry.ca_ht > maxCa) maxCa = entry.ca_ht;
    years.add(entry.year);
  }
  const sortedYears = [...years].sort((a, b) => b - a);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activité mensuelle</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <div className="text-muted-foreground flex items-center gap-1 pl-12 text-[10px]">
            {MONTHS_LABEL.map((m, i) => (
              <div
                key={`m-${String(i)}`}
                className="flex-1 text-center font-mono"
              >
                {m}
              </div>
            ))}
          </div>
          {sortedYears.map((year) => (
            <div key={year} className="flex items-center gap-1">
              <div className="text-muted-foreground w-10 font-mono text-[11px]">
                {year}
              </div>
              <div className="flex flex-1 items-center gap-1">
                {Array.from({ length: 12 }).map((_, i) => {
                  const month = i + 1;
                  const entry = monthlyByKey.get(`${year}-${month}`);
                  const intensity =
                    entry && maxCa > 0 ? entry.ca_ht / maxCa : 0;
                  const opacity = entry ? 0.15 + intensity * 0.85 : 0;
                  const title = entry
                    ? `${String(month).padStart(2, "0")}/${year} · ${formatAmount(entry.ca_ht)} € HT · ${entry.invoice_count} fact. · cliquez pour le détail`
                    : `${String(month).padStart(2, "0")}/${year} · aucune activité`;
                  return (
                    <button
                      key={`cell-${year}-${String(month)}`}
                      type="button"
                      disabled={!entry}
                      onClick={() =>
                        entry
                          ? openClientMonthInvoicesDrawer(clientId, year, month)
                          : undefined
                      }
                      title={title}
                      className="border-border/30 hover:ring-primary/60 h-5 flex-1 cursor-pointer rounded-sm border transition hover:ring-2 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: entry
                          ? `rgba(59, 130, 246, ${opacity.toFixed(3)})`
                          : "transparent",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
          {archive.length > 0 ? (
            <div className="mt-2 border-t pt-2">
              <div className="text-muted-foreground mb-1 text-[11px]">
                Archive pré-2011 (agrégat annuel)
              </div>
              <div className="flex flex-wrap gap-2">
                {archive.map((row) => (
                  <div
                    key={row.year}
                    className="flex flex-col rounded border px-2 py-1"
                  >
                    <div className="text-muted-foreground font-mono text-[11px]">
                      {row.year}
                    </div>
                    <div className="font-mono text-[12px] tabular-nums">
                      {formatAmount(row.ca_ht)} €
                    </div>
                    <div className="text-muted-foreground text-[10px]">
                      {row.invoice_count} fact.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
