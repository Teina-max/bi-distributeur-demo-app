import { useNavigate } from "@tanstack/react-router";
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
import type { TicketListItemDto } from "@convex/support_tickets/dto/ticketListItem";
import {
  TICKET_CATEGORY_LABEL,
  TicketCategoryBadge,
} from "@/routes/app/tickets/_components/ticket-category-badge";
import { TicketPriorityBadge } from "@/routes/app/tickets/_components/ticket-priority-badge";
import { TicketStatusBadge } from "@/routes/app/tickets/_components/ticket-status-badge";

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

type Row = Omit<TicketListItemDto, "id"> & { id: string };

export function ClientRecentTicketsTable({
  rows,
  enabled = true,
}: {
  rows: readonly TicketListItemDto[];
  enabled?: boolean;
}) {
  const navigate = useNavigate();
  const normalizedRows: Row[] = rows.map((row) => ({
    ...row,
    id: String(row.id),
  }));

  const { getRowProps } = useTableKeyboardNav<Row>(normalizedRows, {
    scopeId: "client-recent-tickets",
    enabled,
    onActivate: (row) =>
      void navigate({
        to: "/app/tickets/$ticketId",
        params: { ticketId: row.id },
      }),
  });

  if (normalizedRows.length === 0) {
    return (
      <Typography variant="muted">Aucun ticket SAV pour ce client.</Typography>
    );
  }

  return (
    <Table data-testid="client-recent-tickets-table">
      <TableHeader>
        <TableRow>
          <TableHead className="py-1.5 text-[13px]">N°</TableHead>
          <TableHead className="py-1.5 text-[13px]">Date</TableHead>
          <TableHead className="py-1.5 text-[13px]">Titre</TableHead>
          <TableHead className="py-1.5 text-[13px]">Catégorie</TableHead>
          <TableHead className="py-1.5 text-[13px]">Priorité</TableHead>
          <TableHead className="py-1.5 text-[13px]">Statut</TableHead>
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
                  to: "/app/tickets/$ticketId",
                  params: { ticketId: row.id },
                })
              }
              title={TICKET_CATEGORY_LABEL[row.category]}
            >
              <TableCell className="py-1.5 font-mono text-[13px] tabular-nums">
                {row.number}
              </TableCell>
              <TableCell className="py-1.5 font-mono text-[13px] tabular-nums">
                {formatDate(row.createdAt)}
              </TableCell>
              <TableCell className="py-1.5 text-[13px]">{row.title}</TableCell>
              <TableCell className="py-1.5 text-[13px]">
                <TicketCategoryBadge category={row.category} />
              </TableCell>
              <TableCell className="py-1.5 text-[13px]">
                <TicketPriorityBadge priority={row.priority} />
              </TableCell>
              <TableCell className="py-1.5 text-[13px]">
                <TicketStatusBadge status={row.status} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
