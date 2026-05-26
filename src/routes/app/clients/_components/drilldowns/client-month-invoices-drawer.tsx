import { useQuery } from "convex/react";
import { Calendar } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { ClientMonthInvoiceRow } from "@convex/legacy/dto/clientMonthInvoices";
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

function ClientMonthInvoicesDrawer({
  clientId,
  year,
  month,
}: {
  clientId: Id<"clients">;
  year: number;
  month: number;
}) {
  const data = useQuery(api.legacy.clientDrilldown.getClientMonthInvoices, {
    client_id: clientId,
    year,
    month,
  });
  const { search, setSearch, visible, total, hasMore, loadMore } =
    usePaginatedList<ClientMonthInvoiceRow>({
      rows: data?.invoices ?? [],
      searchKeys: ["legacy_number", "comment"],
    });
  if (data === undefined) return <DrawerLoading />;
  if (data === null) return null;

  const columns: DrillDownColumn<ClientMonthInvoiceRow>[] = [
    {
      key: "num",
      label: "N°",
      render: (row) => row.legacy_number,
    },
    {
      key: "date",
      label: "Date",
      render: (row) => formatDate(row.document_date),
    },
    {
      key: "comment",
      label: "Commentaire",
      render: (row) => (
        <span className="text-muted-foreground truncate text-[11px]">
          {row.comment ?? "—"}
        </span>
      ),
    },
    {
      key: "lines",
      label: "Lignes",
      align: "right",
      render: (row) => row.line_count,
    },
    {
      key: "ht",
      label: "HT",
      align: "right",
      render: (row) => `${formatAmount(row.total_ht)} €`,
    },
    {
      key: "ttc",
      label: "TTC",
      align: "right",
      render: (row) => `${formatAmount(row.total_ttc)} €`,
    },
  ];

  return (
    <DrillDownShell>
      <div className="border-border/40 grid grid-cols-3 gap-3 border-b px-3 py-2 text-[12px]">
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[11px]">Factures</span>
          <span className="font-mono text-[14px] tabular-nums">
            {data.invoice_count}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[11px]">CA HT</span>
          <span className="font-mono text-[14px] tabular-nums">
            {formatAmount(data.total_ca_ht)} €
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[11px]">CA TTC</span>
          <span className="font-mono text-[14px] tabular-nums">
            {formatAmount(data.total_ttc)} €
          </span>
        </div>
      </div>
      <DrillDownSearch
        value={search}
        onChange={setSearch}
        placeholder="Filtrer par numéro ou commentaire…"
      />
      <DrillDownTable<ClientMonthInvoiceRow>
        columns={columns}
        rows={visible}
        rowKey={(r) => r.id}
        gridTemplate="80px 84px 1fr 60px 80px 80px"
        emptyMessage="Aucune facture pour ce mois."
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

export function openClientMonthInvoicesDrawer(
  clientId: Id<"clients">,
  year: number,
  month: number,
) {
  const label = MONTH_LABELS[month - 1] ?? `M${month}`;
  dialogManager.custom({
    title: `Factures ${label} ${year}`,
    description: "Factures historiques de ce client pour le mois sélectionné.",
    icon: Calendar,
    size: "xl",
    children: (
      <ClientMonthInvoicesDrawer
        clientId={clientId}
        year={year}
        month={month}
      />
    ),
  });
}
