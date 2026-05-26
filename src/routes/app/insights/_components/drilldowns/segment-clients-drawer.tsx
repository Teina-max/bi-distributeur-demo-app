import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Users } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { SegmentClientRow } from "@convex/insights/dto/segmentClientsDrilldown";
import type { ClientStatus } from "@convex/utils/clientStatus";
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

const STATUS_LABEL: Record<ClientStatus, string> = {
  new: "Nouveaux",
  top: "Top clients",
  regular: "Réguliers",
  occasional: "Occasionnels",
  dormant: "Dormants",
  lost: "Perdus",
};

function SegmentClientsDrawer({ status }: { status: ClientStatus }) {
  const data = useQuery(api.insights.drilldown.getClientsBySegment, {
    status,
    limit: 500,
  });
  const navigate = useNavigate();
  const { search, setSearch, visible, total, hasMore, loadMore } =
    usePaginatedList<SegmentClientRow>({
      rows: data?.rows ?? [],
      searchKeys: ["name", "code", "vendor", "sector"],
    });

  if (data === undefined) return <DrawerLoading />;

  const columns: DrillDownColumn<SegmentClientRow>[] = [
    {
      key: "name",
      label: "Client",
      render: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate">{row.name}</span>
          <span className="text-muted-foreground truncate text-[10px]">
            {row.code} · {row.vendor ?? "—"} · {row.sector ?? "—"}
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
      render: (row) => row.total_invoices,
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
      <DrillDownTable<SegmentClientRow>
        columns={columns}
        rows={visible}
        rowKey={(r) => r.client_id as string}
        gridTemplate="1fr 90px 50px 90px 90px"
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

export function openSegmentClientsDrawer(status: ClientStatus) {
  dialogManager.custom({
    title: `${STATUS_LABEL[status]} · segment`,
    description: "Recherche par nom/code/vendeur/secteur.",
    icon: Users,
    size: "xl",
    children: <SegmentClientsDrawer status={status} />,
  });
}
