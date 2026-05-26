import { useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEUR } from "@/features/quotations/format-amount";
import { useTableKeyboardNav } from "@/hooks/use-table-keyboard-nav";
import type { DashboardDeliveryFormRowDto } from "@convex/dashboard/dto/todayDigest";
import { EmptyRow } from "./empty-row";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link";

const STATUS_VARIANT: Record<
  DashboardDeliveryFormRowDto["status"],
  BadgeVariant
> = {
  in_preparation: "secondary",
  ready_to_ship: "secondary",
  shipped: "default",
  delivered: "default",
  invoiced: "outline",
  cancelled: "destructive",
};

const STATUS_LABEL: Record<DashboardDeliveryFormRowDto["status"], string> = {
  in_preparation: "En préparation",
  ready_to_ship: "Prêt à expédier",
  shipped: "Expédié",
  delivered: "Livré",
  invoiced: "Facturé",
  cancelled: "Annulé",
};

type Props = {
  items: readonly DashboardDeliveryFormRowDto[];
  enabled: boolean;
  onFocusRequest: () => void;
};

export function TodayDeliveryFormsCard({
  items,
  enabled,
  onFocusRequest,
}: Props) {
  const navigate = useNavigate();
  const rows = items.map((item) => ({ ...item, id: String(item.id) }));

  const { getRowProps } = useTableKeyboardNav(rows, {
    scopeId: "dashboard-delivery-forms",
    enabled,
    onActivate: (row) => {
      void navigate({
        to: "/app/delivery-forms/$deliveryFormId",
        params: { deliveryFormId: row.id },
      });
    },
  });

  return (
    <Card
      data-active-card={enabled}
      data-testid="dashboard-delivery-forms-card"
      onClick={onFocusRequest}
      className="data-[active-card=true]:ring-ring data-[active-card=true]:ring-2"
    >
      <CardHeader>
        <CardTitle>Bons de livraison ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyRow message="Aucun BL aujourd'hui" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-8 px-2 text-xs">N°</TableHead>
                <TableHead className="h-8 px-2 text-xs">Client</TableHead>
                <TableHead className="h-8 px-2 text-right text-xs">
                  Total HT
                </TableHead>
                <TableHead className="h-8 px-2 text-xs">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow
                  key={row.id}
                  {...getRowProps(idx)}
                  data-testid={`dashboard-delivery-form-row-${row.id}`}
                  className="data-[active=true]:bg-muted/60 cursor-pointer"
                  onClick={() => {
                    void navigate({
                      to: "/app/delivery-forms/$deliveryFormId",
                      params: { deliveryFormId: row.id },
                    });
                  }}
                >
                  <TableCell className="px-2 py-1 font-mono text-[13px]">
                    {row.number}
                  </TableCell>
                  <TableCell className="px-2 py-1 font-mono text-[13px]">
                    {row.clientCode} - {row.clientName}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right font-mono text-[13px]">
                    {formatEUR(row.totalHT)}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-[13px]">
                    <Badge variant={STATUS_VARIANT[row.status]}>
                      {STATUS_LABEL[row.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
