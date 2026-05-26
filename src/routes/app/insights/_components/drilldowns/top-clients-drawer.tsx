import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Crown } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { TopClientDto } from "@convex/insights/dto/topClient";
import {
  DrillDownFooter,
  DrillDownSearch,
  DrillDownShell,
  DrillDownTable,
  usePaginatedList,
  type DrillDownColumn,
} from "@/components/nowts/drilldown-layout";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { DrawerLoading, formatAmount, formatDate } from "./drilldown-shared";

function TopClientsDrawer() {
  const data = useQuery(api.insights.queries.getTopClients, { limit: 200 });
  const navigate = useNavigate();
  const { search, setSearch, visible, total, hasMore, loadMore } =
    usePaginatedList<TopClientDto>({
      rows: data ?? [],
      searchKeys: ["name", "code", "vendor"],
    });

  if (data === undefined) return <DrawerLoading />;

  const indexById = new Map<string, number>(
    data.map((r, i) => [r.client_id as string, i]),
  );

  const columns: DrillDownColumn<TopClientDto>[] = [
    {
      key: "rank",
      label: "#",
      render: (row) => (
        <span className="text-muted-foreground">
          {(indexById.get(row.client_id as string) ?? 0) + 1}
        </span>
      ),
    },
    {
      key: "name",
      label: "Client",
      render: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate">{row.name}</span>
          <span className="text-muted-foreground truncate text-[10px]">
            {row.code} · {row.vendor ?? "—"}
          </span>
        </div>
      ),
    },
    {
      key: "last",
      label: "Dernier",
      render: (row) => formatDate(row.last_invoice_at),
    },
    {
      key: "ca12",
      label: "CA 12m",
      align: "right",
      render: (row) => `${formatAmount(row.ca_12m_ht)} €`,
    },
    {
      key: "ltv",
      label: "LTV",
      align: "right",
      render: (row) => `${formatAmount(row.ca_total_ht)} €`,
    },
  ];

  return (
    <DrillDownShell>
      <DrillDownSearch value={search} onChange={setSearch} />
      <DrillDownTable<TopClientDto>
        columns={columns}
        rows={visible}
        rowKey={(r) => r.client_id as string}
        gridTemplate="24px 1fr 90px 90px 90px"
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

export function openTopClientsDrawer() {
  dialogManager.custom({
    title: "Top clients · CA 12m",
    description: "Classement par chiffre d'affaires sur 12 mois.",
    icon: Crown,
    size: "xl",
    children: <TopClientsDrawer />,
  });
}
