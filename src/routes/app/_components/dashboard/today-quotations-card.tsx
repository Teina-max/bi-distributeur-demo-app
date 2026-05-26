import { useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { DashboardQuotationRowDto } from "@convex/dashboard/dto/todayDigest";
import { EmptyRow } from "./empty-row";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link";

const STATUS_VARIANT: Record<
  DashboardQuotationRowDto["status"],
  BadgeVariant
> = {
  draft: "secondary",
  sent: "default",
  accepted: "outline",
  cancelled: "destructive",
  converted_to_delivery: "default",
};

const STATUS_LABEL: Record<DashboardQuotationRowDto["status"], string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  cancelled: "Annulé",
  converted_to_delivery: "→ BL",
};

type Props = {
  items: readonly DashboardQuotationRowDto[];
  enabled: boolean;
  onFocusRequest: () => void;
};

export function TodayQuotationsCard({ items, enabled, onFocusRequest }: Props) {
  const navigate = useNavigate();
  const rows = items.map((item) => ({ ...item, id: String(item.id) }));

  const { getRowProps } = useTableKeyboardNav(rows, {
    scopeId: "dashboard-quotations",
    enabled,
    onActivate: (row) => {
      void navigate({
        to: "/app/quotations/$quotationId",
        params: { quotationId: row.id },
      });
    },
  });

  return (
    <Card
      data-active-card={enabled}
      data-testid="dashboard-quotations-card"
      onClick={onFocusRequest}
      className="data-[active-card=true]:ring-ring data-[active-card=true]:ring-2"
    >
      <CardHeader>
        <CardTitle>Devis du jour ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyRow message="Aucun devis aujourd'hui" />
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
                  data-testid={`dashboard-quotation-row-${row.id}`}
                  className="data-[active=true]:bg-muted/60 cursor-pointer"
                  onClick={() => {
                    void navigate({
                      to: "/app/quotations/$quotationId",
                      params: { quotationId: row.id },
                    });
                  }}
                >
                  <TableCell className="py-1 px-2 text-[13px] font-mono">
                    {row.number}
                  </TableCell>
                  <TableCell className="py-1 px-2 text-[13px] font-mono">
                    {row.clientCode} - {row.clientName}
                  </TableCell>
                  <TableCell className="py-1 px-2 text-right text-[13px] font-mono">
                    {formatEUR(row.totalHT)}
                  </TableCell>
                  <TableCell className="py-1 px-2 text-[13px]">
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
