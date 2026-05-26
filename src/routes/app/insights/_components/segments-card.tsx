import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientSegmentDto } from "@convex/insights/dto/clientSegments";
import type { ClientStatus } from "@convex/utils/clientStatus";
import { openSegmentClientsDrawer } from "./drilldowns/segment-clients-drawer";

const META: Record<ClientStatus, { label: string; tone: string; bar: string }> =
  {
    top: {
      label: "Top",
      tone: "bg-emerald-500/15 text-emerald-700",
      bar: "bg-emerald-500/70",
    },
    regular: {
      label: "Régulier",
      tone: "bg-blue-500/15 text-blue-700",
      bar: "bg-blue-500/70",
    },
    occasional: {
      label: "Occasionnel",
      tone: "bg-amber-500/15 text-amber-700",
      bar: "bg-amber-500/70",
    },
    dormant: {
      label: "Dormant",
      tone: "bg-orange-500/15 text-orange-700",
      bar: "bg-orange-500/70",
    },
    lost: {
      label: "Perdu",
      tone: "bg-destructive/15 text-destructive",
      bar: "bg-destructive/70",
    },
    new: {
      label: "Nouveau",
      tone: "bg-muted text-foreground",
      bar: "bg-muted-foreground/50",
    },
  };

function formatAmount(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function SegmentsCard({ segments }: { segments: ClientSegmentDto[] }) {
  const totalCount = segments.reduce((s, seg) => s + seg.count, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Segmentation clients · {totalCount}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {segments.map((seg) => {
            const meta = META[seg.status];
            const sharePct =
              totalCount > 0 ? (seg.count / totalCount) * 100 : 0;
            const interactive = seg.count > 0;
            return (
              <button
                key={seg.status}
                type="button"
                disabled={!interactive}
                onClick={() => openSegmentClientsDrawer(seg.status)}
                className="hover:bg-muted/40 flex flex-col gap-1 rounded-md p-1 text-left transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className={meta.tone} variant="outline">
                      {meta.label}
                    </Badge>
                    <span className="font-mono text-[13px] tabular-nums">
                      {seg.count}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      ({sharePct.toFixed(0)}%)
                    </span>
                  </div>
                  <span className="text-muted-foreground font-mono text-[12px] tabular-nums">
                    {formatAmount(seg.ca_12m_ht)} € HT 12m
                  </span>
                </div>
                <div className="bg-muted h-1.5 overflow-hidden rounded-sm">
                  <div
                    className={`h-full ${meta.bar}`}
                    style={{ width: `${sharePct.toFixed(1)}%` }}
                  />
                </div>
                {seg.sample_names.length > 0 ? (
                  <div className="text-muted-foreground truncate text-[11px]">
                    {seg.sample_names.join(" · ")}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
