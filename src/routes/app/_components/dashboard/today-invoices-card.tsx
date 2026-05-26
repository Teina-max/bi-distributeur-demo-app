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
import type { DashboardInvoiceRowDto } from "@convex/dashboard/dto/todayDigest";
import { EmptyRow } from "./empty-row";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link";

const STATUS_VARIANT: Record<DashboardInvoiceRowDto["status"], BadgeVariant> = {
  draft: "secondary",
  sent: "default",
  paid: "default",
  overdue: "destructive",
};

const STATUS_LABEL: Record<DashboardInvoiceRowDto["status"], string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  overdue: "En retard",
};

type Props = {
  items: readonly DashboardInvoiceRowDto[];
  enabled: boolean;
  onFocusRequest: () => void;
};

export function TodayInvoicesCard({ items, enabled, onFocusRequest }: Props) {
  const navigate = useNavigate();
  const rows = items.map((item) => ({ ...item, id: String(item.id) }));

  const { getRowProps } = useTableKeyboardNav(rows, {
    scopeId: "dashboard-invoices",
    enabled,
    onActivate: (row) => {
      void navigate({
        to: "/app/invoices/$invoiceId",
        params: { invoiceId: row.id },
      });
    },
  });

  return (
    <Card
      data-active-card={enabled}
      data-testid="dashboard-invoices-card"
      onClick={onFocusRequest}
      className="data-[active-card=true]:ring-ring data-[active-card=true]:ring-2"
    >
      <CardHeader>
        <CardTitle>Factures du jour ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyRow message="Aucune facture aujourd'hui" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-8 px-2 text-xs">N°</TableHead>
                <TableHead className="h-8 px-2 text-xs">Client</TableHead>
                <TableHead className="h-8 px-2 text-right text-xs">
                  Total TTC
                </TableHead>
                <TableHead className="h-8 px-2 text-xs">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow
                  key={row.id}
                  {...getRowProps(idx)}
                  data-testid={`dashboard-invoice-row-${row.id}`}
                  className="data-[active=true]:bg-muted/60 cursor-pointer"
                  onClick={() => {
                    void navigate({
                      to: "/app/invoices/$invoiceId",
                      params: { invoiceId: row.id },
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
                    {formatEUR(row.totalTTC)}
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
