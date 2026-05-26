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
import { InvoiceFromBlAction } from "@/features/invoicing/invoice-from-bl-action";
import type { Id } from "@convex/_generated/dataModel";
import type { DeliveryFormListItemDto } from "@convex/delivery_forms/dto/deliveryFormListItem";

const STATUS_LABEL: Record<DeliveryFormListItemDto["status"], string> = {
  in_preparation: "En préparation",
  ready_to_ship: "Prêt à expédier",
  shipped: "Expédié",
  delivered: "Livré",
  invoiced: "Facturé",
  cancelled: "Annulé",
};

const STATUS_VARIANT: Record<
  DeliveryFormListItemDto["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  in_preparation: "secondary",
  ready_to_ship: "secondary",
  shipped: "default",
  delivered: "default",
  invoiced: "outline",
  cancelled: "destructive",
};

function formatDate(ms: number | null): string {
  if (ms === null) return "—";
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

type Row = Omit<DeliveryFormListItemDto, "id"> & { id: string };

export function DeliveryFormsListTable({
  rows,
}: {
  rows: readonly DeliveryFormListItemDto[];
}) {
  const navigate = useNavigate();
  const normalizedRows: Row[] = rows.map((row) => ({
    ...row,
    id: String(row.id),
  }));

  const { getRowProps } = useTableKeyboardNav<Row>(normalizedRows, {
    scopeId: "delivery-forms-list",
    onActivate: (row) =>
      void navigate({
        to: "/app/delivery-forms/$deliveryFormId",
        params: { deliveryFormId: row.id },
      }),
  });

  if (normalizedRows.length === 0) {
    return <Typography variant="muted">Aucun BL pour le moment.</Typography>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="py-1.5 text-[13px]">N°</TableHead>
          <TableHead className="py-1.5 text-[13px]">Date</TableHead>
          <TableHead className="py-1.5 text-[13px]">Code client</TableHead>
          <TableHead className="py-1.5 text-[13px]">Client</TableHead>
          <TableHead className="py-1.5 text-right text-[13px]">
            Total HT
          </TableHead>
          <TableHead className="py-1.5 text-right text-[13px]">
            Total TTC
          </TableHead>
          <TableHead className="py-1.5 text-[13px]">Statut</TableHead>
          <TableHead className="w-10 py-1.5 text-[13px]">
            <span className="sr-only">Actions</span>
          </TableHead>
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
              className={cn("cursor-pointer", "data-[active=true]:bg-muted/70")}
              onClick={() =>
                void navigate({
                  to: "/app/delivery-forms/$deliveryFormId",
                  params: { deliveryFormId: row.id },
                })
              }
            >
              <TableCell className="py-1.5 font-mono text-[13px] tabular-nums">
                {row.number}
              </TableCell>
              <TableCell className="py-1.5 font-mono text-[13px] tabular-nums">
                {formatDate(row.deliveredAt ?? row.createdAt)}
              </TableCell>
              <TableCell className="py-1.5 font-mono text-[13px]">
                {row.clientCode}
              </TableCell>
              <TableCell className="py-1.5 text-[13px]">
                {row.clientName}
              </TableCell>
              <TableCell className="py-1.5 text-right font-mono text-[13px] tabular-nums">
                {formatAmount(row.total_ht)} €
              </TableCell>
              <TableCell className="py-1.5 text-right font-mono text-[13px] tabular-nums">
                {formatAmount(row.total_ttc)} €
              </TableCell>
              <TableCell className="py-1.5 text-[13px]">
                <Badge variant={STATUS_VARIANT[row.status]}>
                  {STATUS_LABEL[row.status]}
                </Badge>
              </TableCell>
              <TableCell className="w-10 py-1.5">
                {row.status === "delivered" ? (
                  <InvoiceFromBlAction
                    deliveryFormId={row.id as unknown as Id<"delivery_forms">}
                    deliveryFormNumber={row.number}
                  />
                ) : null}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
