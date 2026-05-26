import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Package } from "lucide-react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type {
  FamilyClientRow,
  FamilyProductRow,
} from "@convex/insights/dto/familyDetailsDrilldown";
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

function FamilyDetailsDrawer({ familyCode }: { familyCode: string }) {
  const data = useQuery(api.insights.drilldown.getFamilyDetails, {
    family_code: familyCode,
    monthsBack: 12,
  });
  const navigate = useNavigate();
  const [view, setView] = useState<"products" | "clients">("products");
  const productsList = usePaginatedList<FamilyProductRow>({
    rows: data?.top_products ?? [],
    searchKeys: ["name", "code"],
  });
  const clientsList = usePaginatedList<FamilyClientRow>({
    rows: data?.top_clients ?? [],
    searchKeys: ["name", "code"],
  });

  if (data === undefined) return <DrawerLoading />;
  if (data.product_count === 0) {
    return (
      <div className="text-muted-foreground text-[13px]">
        Aucun article dans cette famille.
      </div>
    );
  }

  const productColumns: DrillDownColumn<FamilyProductRow>[] = [
    {
      key: "name",
      label: "Article",
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
      key: "qty",
      label: "Qté",
      align: "right",
      render: (row) => formatAmount(row.qty_sold),
    },
    {
      key: "ca",
      label: "CA HT",
      align: "right",
      render: (row) => `${formatAmount(row.ca_ht)} €`,
    },
  ];

  const clientColumns: DrillDownColumn<FamilyClientRow>[] = [
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
      key: "qty",
      label: "Qté",
      align: "right",
      render: (row) => formatAmount(row.qty_purchased),
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
      <div className="grid grid-cols-4 gap-3 px-3 py-2 text-[12px]">
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[11px]">CA 12m HT</span>
          <span className="font-mono text-[15px] tabular-nums">
            {formatAmount(data.total_ca_ht)} €
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[11px]">Quantité</span>
          <span className="font-mono text-[15px] tabular-nums">
            {formatAmount(data.total_qty)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[11px]">Références</span>
          <span className="font-mono text-[15px] tabular-nums">
            {data.product_count}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[11px]">Clients</span>
          <span className="font-mono text-[15px] tabular-nums">
            {data.client_count}
          </span>
        </div>
      </div>

      <div className="border-border/40 flex gap-2 border-t px-3 py-2 text-[12px]">
        <button
          type="button"
          onClick={() => setView("products")}
          className={`rounded-md px-2 py-1 ${
            view === "products"
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Produits ({data.top_products.length})
        </button>
        <button
          type="button"
          onClick={() => setView("clients")}
          className={`rounded-md px-2 py-1 ${
            view === "clients"
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Clients ({data.top_clients.length})
        </button>
      </div>

      {view === "products" ? (
        <>
          <DrillDownSearch
            value={productsList.search}
            onChange={productsList.setSearch}
            placeholder="Filtrer article (nom, code)…"
          />
          <DrillDownTable<FamilyProductRow>
            columns={productColumns}
            rows={productsList.visible}
            rowKey={(r) => r.product_id as string}
            gridTemplate="1fr 90px 110px"
          />
          <DrillDownFooter
            shown={productsList.visible.length}
            total={productsList.total}
            hasMore={productsList.hasMore}
            onLoadMore={productsList.loadMore}
          />
        </>
      ) : (
        <>
          <DrillDownSearch
            value={clientsList.search}
            onChange={clientsList.setSearch}
            placeholder="Filtrer client (nom, code)…"
          />
          <DrillDownTable<FamilyClientRow>
            columns={clientColumns}
            rows={clientsList.visible}
            rowKey={(r) => r.client_id as string}
            gridTemplate="1fr 90px 110px"
            onRowClick={(row) => {
              dialogManager.closeAll();
              void navigate({
                to: "/app/clients/$clientId",
                params: { clientId: row.client_id as Id<"clients"> },
              });
            }}
          />
          <DrillDownFooter
            shown={clientsList.visible.length}
            total={clientsList.total}
            hasMore={clientsList.hasMore}
            onLoadMore={clientsList.loadMore}
          />
        </>
      )}
    </DrillDownShell>
  );
}

export function openFamilyDetailsDrawer(familyCode: string) {
  dialogManager.custom({
    title: `Famille ${familyCode}`,
    description: "Top produits + top clients sur les 12 derniers mois.",
    icon: Package,
    size: "xl",
    children: <FamilyDetailsDrawer familyCode={familyCode} />,
  });
}
