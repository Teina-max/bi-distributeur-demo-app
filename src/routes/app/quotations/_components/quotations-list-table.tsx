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
import { formatEUR } from "@/features/quotations/format-amount";
import { useTableKeyboardNav } from "@/hooks/use-table-keyboard-nav";
import { formatDateFR } from "@convex/utils/dateFns";
import type { QuotationListItemDto } from "@convex/quotations/dto/quotationListItem";

type Props = {
  items: readonly QuotationListItemDto[];
};

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link";

const STATUS_VARIANT: Record<QuotationListItemDto["status"], BadgeVariant> = {
  draft: "secondary",
  sent: "default",
  accepted: "outline",
  cancelled: "destructive",
  converted_to_delivery: "default",
};

const STATUS_LABEL: Record<QuotationListItemDto["status"], string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  cancelled: "Annulé",
  converted_to_delivery: "→ BL",
};

export function QuotationsListTable({ items }: Props) {
  const navigate = useNavigate();

  const rows = items.map((item) => ({ ...item, id: String(item.id) }));

  const { getRowProps } = useTableKeyboardNav(rows, {
    scopeId: "quotations-list",
    onActivate: (row) => {
      void navigate({
        to: "/app/quotations/$quotationId",
        params: { quotationId: row.id },
      });
    },
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="h-8 px-2 text-xs">N°</TableHead>
          <TableHead className="h-8 px-2 text-xs">Client</TableHead>
          <TableHead className="h-8 px-2 text-xs">Date</TableHead>
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
            data-testid={`quotation-row-${row.id}`}
            className="data-[active=true]:bg-muted/60 cursor-pointer"
            onClick={() => {
              void navigate({
                to: "/app/quotations/$quotationId",
                params: { quotationId: row.id },
              });
            }}
          >
            <TableCell className="py-1.5 px-2 text-[13px] font-mono">
              {row.number}
            </TableCell>
            <TableCell className="py-1.5 px-2 text-[13px] font-mono">
              {row.clientCode} - {row.clientName}
            </TableCell>
            <TableCell className="py-1.5 px-2 text-[13px]">
              {formatDateFR(row.createdAt)}
            </TableCell>
            <TableCell className="py-1.5 px-2 text-right text-[13px] font-mono">
              {formatEUR(row.total_ht)}
            </TableCell>
            <TableCell className="py-1.5 px-2 text-[13px]">
              <Badge variant={STATUS_VARIANT[row.status]}>
                {STATUS_LABEL[row.status]}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
