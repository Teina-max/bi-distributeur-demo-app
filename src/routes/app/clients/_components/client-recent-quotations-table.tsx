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
import type { QuotationListItemDto } from "@convex/quotations/dto/quotationListItem";

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  converted_to_delivery: "Converti",
  cancelled: "Annulé",
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

type Row = Omit<QuotationListItemDto, "id"> & { id: string };

export function ClientRecentQuotationsTable({
  rows,
  enabled = true,
}: {
  rows: readonly QuotationListItemDto[];
  enabled?: boolean;
}) {
  const navigate = useNavigate();
  const normalizedRows: Row[] = rows.map((row) => ({
    ...row,
    id: String(row.id),
  }));

  const { getRowProps } = useTableKeyboardNav<Row>(normalizedRows, {
    scopeId: "client-recent-quotations",
    enabled,
    onActivate: (row) =>
      void navigate({
        to: "/app/quotations/$quotationId",
        params: { quotationId: row.id },
      }),
  });

  if (normalizedRows.length === 0) {
    return <Typography variant="muted">Aucun devis pour ce client.</Typography>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="py-1 text-[13px]">N°</TableHead>
          <TableHead className="py-1 text-[13px]">Date</TableHead>
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
              data-testid={`client-quotation-row-${row.id}`}
              className={cn("cursor-pointer", "data-[active=true]:bg-muted/70")}
              onClick={() =>
                void navigate({
                  to: "/app/quotations/$quotationId",
                  params: { quotationId: row.id },
                })
              }
            >
              <TableCell className="py-1 font-mono text-[13px]">
                {row.number}
              </TableCell>
              <TableCell className="py-1 font-mono text-[13px] tabular-nums">
                {formatDate(row.createdAt)}
              </TableCell>
              <TableCell className="py-1 text-right font-mono text-[13px] tabular-nums">
                {formatAmount(row.total_ht)} €
              </TableCell>
              <TableCell className="py-1 text-right font-mono text-[13px] tabular-nums">
                {formatAmount(row.total_ttc)} €
              </TableCell>
              <TableCell className="py-1 text-[13px]">
                <Badge variant="outline">
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
