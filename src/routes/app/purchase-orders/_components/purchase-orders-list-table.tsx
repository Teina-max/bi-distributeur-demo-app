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
import type { PurchaseOrderListItemDto } from "@convex/purchase_orders/dto/purchaseOrderListItem";

type Props = {
  items: readonly PurchaseOrderListItemDto[];
};

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link";

const STATUS_VARIANT: Record<PurchaseOrderListItemDto["status"], BadgeVariant> =
  {
    draft: "secondary",
    sent: "default",
    partially_received: "outline",
    received: "default",
    cancelled: "destructive",
  };

const STATUS_LABEL: Record<PurchaseOrderListItemDto["status"], string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  partially_received: "Reçu partiel",
  received: "Reçu",
  cancelled: "Annulé",
};

export function PurchaseOrdersListTable({ items }: Props) {
  const navigate = useNavigate();
  const rows = items.map((item) => ({ ...item, id: String(item.id) }));

  const { getRowProps } = useTableKeyboardNav(rows, {
    scopeId: "purchase-orders-list",
    onActivate: (row) => {
      void navigate({
        to: "/app/purchase-orders/$purchaseOrderId",
        params: { purchaseOrderId: row.id },
      });
    },
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="h-8 px-2 text-xs">N°</TableHead>
          <TableHead className="h-8 px-2 text-xs">Fournisseur</TableHead>
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
            data-testid={`purchase-order-row-${row.id}`}
            className="data-[active=true]:bg-muted/60 cursor-pointer"
            onClick={() => {
              void navigate({
                to: "/app/purchase-orders/$purchaseOrderId",
                params: { purchaseOrderId: row.id },
              });
            }}
          >
            <TableCell className="px-2 py-1.5 font-mono text-[13px]">
              {row.number}
            </TableCell>
            <TableCell className="px-2 py-1.5 font-mono text-[13px]">
              {row.supplierCode} - {row.supplierName}
            </TableCell>
            <TableCell className="px-2 py-1.5 text-[13px]">
              {formatDateFR(row.createdAt)}
            </TableCell>
            <TableCell className="px-2 py-1.5 text-right font-mono text-[13px]">
              {formatEUR(row.total_ht)}
            </TableCell>
            <TableCell className="px-2 py-1.5 text-[13px]">
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
