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
import { TicketCategoryBadge } from "./ticket-category-badge";
import { TicketPriorityBadge } from "./ticket-priority-badge";
import { TicketStatusBadge } from "./ticket-status-badge";

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

type Row = Omit<TicketListItemDto, "id"> & { id: string };

export function TicketsListTable({
  rows,
}: {
  rows: readonly TicketListItemDto[];
}) {
  const navigate = useNavigate();
  const normalizedRows: Row[] = rows.map((row) => ({
    ...row,
    id: String(row.id),
  }));

  const { getRowProps } = useTableKeyboardNav<Row>(normalizedRows, {
    scopeId: "tickets-list",
    onActivate: (row) =>
      void navigate({
        to: "/app/tickets/$ticketId",
        params: { ticketId: row.id },
      }),
  });

  if (normalizedRows.length === 0) {
    return (
      <Typography variant="muted">Aucun ticket pour le moment.</Typography>
    );
  }

  return (
    <Table data-testid="tickets-list-table">
      <TableHeader>
        <TableRow>
          <TableHead className="py-1.5 text-[13px]">N°</TableHead>
          <TableHead className="py-1.5 text-[13px]">Date</TableHead>
          <TableHead className="py-1.5 text-[13px]">Client</TableHead>
          <TableHead className="py-1.5 text-[13px]">Titre</TableHead>
          <TableHead className="py-1.5 text-[13px]">Catégorie</TableHead>
          <TableHead className="py-1.5 text-[13px]">Priorité</TableHead>
          <TableHead className="py-1.5 text-[13px]">Statut</TableHead>
          <TableHead className="py-1.5 text-[13px]">Assigné à</TableHead>
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
              data-testid={`ticket-row-${row.number}`}
            >
              <TableCell className="py-1.5 font-mono text-[13px] tabular-nums">
                {row.number}
              </TableCell>
              <TableCell className="py-1.5 font-mono text-[13px] tabular-nums">
                {formatDate(row.createdAt)}
              </TableCell>
              <TableCell className="py-1.5 text-[13px]">
                <span className="font-mono">{row.clientCode}</span>{" "}
                <span className="text-muted-foreground">
                  — {row.clientName}
                </span>
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
              <TableCell className="py-1.5 font-mono text-[13px]">
                {row.assignedTo ?? "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
