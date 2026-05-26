import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Users } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { ActiveClientRow } from "@convex/insights/dto/activeClientsDrilldown";
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

function ActiveClientsDrawer() {
  const data = useQuery(api.insights.drilldown.getActiveClientsList, {
    monthsBack: 12,
  });
  const navigate = useNavigate();
  const { search, setSearch, visible, total, hasMore, loadMore } =
    usePaginatedList<ActiveClientRow>({
      rows: data?.rows ?? [],
      searchKeys: ["name", "code", "vendor"],
    });

  if (data === undefined) return <DrawerLoading />;

  const columns: DrillDownColumn<ActiveClientRow>[] = [
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
      key: "fact",
      label: "Fact.",
      align: "right",
      render: (row) => row.invoice_count,
    },
    {
      key: "ca",
      label: "CA HT",
      align: "right",
      render: (row) => `${formatAmount(row.ca_period_ht)} €`,
    },
  ];

  return (
    <DrillDownShell>
      <DrillDownSearch value={search} onChange={setSearch} />
      <DrillDownTable<ActiveClientRow>
        columns={columns}
        rows={visible}
        rowKey={(r) => r.client_id as string}
        gridTemplate="1fr 90px 60px 90px"
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

export function openActiveClientsDrawer() {
  dialogManager.custom({
    title: "Clients actifs · 12 mois",
    description: "Liste complète, recherche par nom/code/vendeur.",
    icon: Users,
    size: "xl",
    children: <ActiveClientsDrawer />,
  });
}
