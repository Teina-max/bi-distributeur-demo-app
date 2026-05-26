import { useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Typography } from "@/components/nowts/typography";
import { useTableKeyboardNav } from "@/hooks/use-table-keyboard-nav";
import { cn } from "@/lib/utils";
import type { InvoiceListItemDto } from "@convex/invoices/dto/invoiceListItem";

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  overdue: "En retard",
  cancelled: "Annulée",
};

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatAmount(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Row = Omit<InvoiceListItemDto, "id"> & { id: string };

export function ClientRecentInvoicesTable({
  rows,
  enabled = true,
}: {
  rows: readonly InvoiceListItemDto[];
  enabled?: boolean;
}) {
  const navigate = useNavigate();
  const normalizedRows: Row[] = rows.map((row) => ({
    ...row,
    id: String(row.id),
  }));

  const { getRowProps } = useTableKeyboardNav<Row>(normalizedRows, {
    scopeId: "client-recent-invoices",
    enabled,
    onActivate: (row) =>
      void navigate({
        to: "/app/invoices/$invoiceId",
        params: { invoiceId: row.id },
      }),
  });

  if (normalizedRows.length === 0) {
    return (
      <Typography variant="muted">Aucune facture pour ce client.</Typography>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="py-1 text-[13px]">N°</TableHead>
          <TableHead className="py-1 text-[13px]">Date</TableHead>
          <TableHead className="py-1 text-[13px]">Échéance</TableHead>
          <TableHead className="py-1 text-right text-[13px]">HT</TableHead>
          <TableHead className="py-1 text-right text-[13px]">TTC</TableHead>
          <TableHead className="py-1 text-[13px]">Statut</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {normalizedRows.map((row, index) => {
          const props = getRowProps(index);
          return (
            <TableRow
              key={row.id}
              data-active={props["data-active"]}
              aria-selected={props["aria-selected"]}
              tabIndex={props.tabIndex}
              data-testid={`client-invoice-row-${row.id}`}
              className={cn("cursor-pointer", "data-[active=true]:bg-muted/70")}
              onClick={() =>
                void navigate({
                  to: "/app/invoices/$invoiceId",
                  params: { invoiceId: row.id },
                })
              }
            >
              <TableCell className="py-1 font-mono text-[13px]">
                {row.number}
              </TableCell>
              <TableCell className="py-1 font-mono text-[13px] tabular-nums">
                {formatDate(row.createdAt)}
              </TableCell>
              <TableCell className="py-1 font-mono text-[13px] tabular-nums">
                {formatDate(row.dueDate)}
              </TableCell>
              <TableCell className="py-1 text-right font-mono text-[13px] tabular-nums">
                {formatAmount(row.total_ht)} €
              </TableCell>
              <TableCell className="py-1 text-right font-mono text-[13px] tabular-nums">
                {formatAmount(row.total_ttc)} €
              </TableCell>
              <TableCell className="py-1 text-[13px]">
                <Badge variant={row.status === "cancelled" ? "destructive" : "outline"}>
                  {STATUS_LABEL[row.status] ?? row.status}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
