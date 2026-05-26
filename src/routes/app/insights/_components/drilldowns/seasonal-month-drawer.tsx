import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { CalendarDays } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { SeasonalClientRow } from "@convex/insights/dto/seasonalMonthDrilldown";
import {
  DrillDownFooter,
  DrillDownSearch,
  DrillDownShell,
  DrillDownTable,
  usePaginatedList,
  type DrillDownColumn,
} from "@/components/nowts/drilldown-layout";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { DrawerLoading, formatAmount } from "./drilldown-shared";

function SeasonalMonthDrawer({ month }: { month: number }) {
  const data = useQuery(api.insights.drilldown.getSeasonalMonthDetails, {
    month,
    yearsBack: 5,
  });
  const navigate = useNavigate();
  const { search, setSearch, visible, total, hasMore, loadMore } =
    usePaginatedList<SeasonalClientRow>({
      rows: data?.top_clients ?? [],
      searchKeys: ["name", "code"],
    });

  if (data === undefined) return <DrawerLoading />;
  if (data.year_breakdown.length === 0) {
    return (
      <div className="text-muted-foreground text-[13px]">
        Aucune activité sur ce mois calendaire.
      </div>
    );
  }

  const maxCa = Math.max(...data.year_breakdown.map((r) => r.ca_ht), 1);

  const columns: DrillDownColumn<SeasonalClientRow>[] = [
    {
      key: "name",
      label: "Client",
      render: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate">{row.name}</span>
          <span className="text-muted-foreground truncate text-[10px]">
            {row.code}
          </span>
        </div>
      ),
    },
    {
      key: "invoices",
      label: "Fact.",
      align: "right",
      render: (row) => row.invoice_count,
    },
    {
      key: "ca",
      label: "CA HT",
      align: "right",
      render: (row) => `${formatAmount(row.ca_ht)} €`,
    },
  ];

  return (
    <DrillDownShell>
      <div className="flex items-center gap-4 px-3 py-2 text-[12px]">
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[11px]">
            Moyenne {data.years_back} ans
          </span>
          <span className="font-mono text-[15px] tabular-nums">
            {formatAmount(data.avg_ca_ht)} €
          </span>
        </div>
      </div>

      <div className="border-border/40 border-t px-3 py-2 text-[12px]">
        <div className="text-muted-foreground mb-1 text-[11px]">
          Année par année
        </div>
        <div className="text-muted-foreground grid grid-cols-[60px_92px_60px_1fr] gap-x-3 text-[10px]">
          <div>Année</div>
          <div className="text-right">CA HT</div>
          <div className="text-right">Fact.</div>
          <div></div>
        </div>
        {data.year_breakdown.map((r) => {
          const pct = (r.ca_ht / maxCa) * 100;
          return (
            <div
              key={r.year}
              className="border-border/40 grid grid-cols-[60px_92px_60px_1fr] gap-x-3 border-t py-1 font-mono"
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

      <DrillDownSearch
        value={search}
        onChange={setSearch}
        placeholder="Filtrer client sur ce mois (toutes années)…"
      />
      <DrillDownTable<SeasonalClientRow>
        columns={columns}
        rows={visible}
        rowKey={(r) => r.client_id as string}
        gridTemplate="1fr 70px 110px"
        onRowClick={(row) => {
          dialogManager.closeAll();
          void navigate({
            to: "/app/clients/$clientId",
            params: { clientId: row.client_id as Id<"clients"> },
          });
        }}
      />
      <DrillDownFooter
        shown={visible.length}
        total={total}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />
    </DrillDownShell>
  );
}

const MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export function openSeasonalMonthDrawer(month: number) {
  const label = MONTH_LABELS[month - 1] ?? `M${month}`;
  dialogManager.custom({
    title: `${label} · saisonnalité`,
    description:
      "Détail année par année et top clients sur ce mois calendaire.",
    icon: CalendarDays,
    size: "xl",
    children: <SeasonalMonthDrawer month={month} />,
  });
}
