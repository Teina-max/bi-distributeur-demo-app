import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Calendar } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { MonthClientRow } from "@convex/insights/dto/monthDetailsDrilldown";
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

function MonthDetailsDrawer({ year, month }: { year: number; month: number }) {
  const data = useQuery(api.insights.drilldown.getMonthDetails, {
    year,
    month,
  });
  const navigate = useNavigate();
  const { search, setSearch, visible, total, hasMore, loadMore } =
    usePaginatedList<MonthClientRow>({
      rows: data?.top_clients ?? [],
      searchKeys: ["name", "code"],
    });

  if (data === undefined) return <DrawerLoading />;
  if (data.total_invoices === 0) {
    return (
      <div className="text-muted-foreground text-[13px]">
        Aucune activité ce mois-ci.
      </div>
    );
  }

  const columns: DrillDownColumn<MonthClientRow>[] = [
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
      <div className="grid grid-cols-3 gap-3 px-3 py-2 text-[12px]">
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[11px]">CA HT</span>
          <span className="font-mono text-[15px] tabular-nums">
            {formatAmount(data.total_ca_ht)} €
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[11px]">Factures</span>
          <span className="font-mono text-[15px] tabular-nums">
            {data.total_invoices}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[11px]">
            Clients actifs
          </span>
          <span className="font-mono text-[15px] tabular-nums">
            {data.active_clients}
          </span>
        </div>
      </div>

      <div className="border-border/40 border-t px-3 py-2">
        <div className="text-muted-foreground mb-1 text-[11px]">
          Mix familles
        </div>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {data.family_breakdown.map((f) => (
            <div key={f.family_code} className="flex flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-2 font-mono text-[11px]">
                <span className="truncate">{f.family_code}</span>
                <span className="tabular-nums">
                  {formatAmount(f.ca_ht)} €
                  <span className="text-muted-foreground ml-2">
                    {f.share_pct.toFixed(0)}%
                  </span>
                </span>
              </div>
              <div className="bg-muted h-1 overflow-hidden rounded-sm">
                <div
                  className="bg-primary/70 h-full"
                  style={{ width: `${f.share_pct.toFixed(1)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <DrillDownSearch
        value={search}
        onChange={setSearch}
        placeholder="Filtrer client (nom, code)…"
      />
      <DrillDownTable<MonthClientRow>
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
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export function openMonthDetailsDrawer(year: number, month: number) {
  const label = MONTH_LABELS[month - 1] ?? `M${month}`;
  dialogManager.custom({
    title: `${label} ${year}`,
    description: "Top clients + ventilation par famille pour ce mois.",
    icon: Calendar,
    size: "xl",
    children: <MonthDetailsDrawer year={year} month={month} />,
  });
}
