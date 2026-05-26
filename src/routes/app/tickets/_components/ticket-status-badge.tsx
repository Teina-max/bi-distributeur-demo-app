import { Badge } from "@/components/ui/badge";
import type { TicketListItemDto } from "@convex/support_tickets/dto/ticketListItem";

const STATUS_LABEL: Record<TicketListItemDto["status"], string> = {
  open: "Ouvert",
  in_progress: "En cours",
  waiting_customer: "Attente client",
  resolved: "Résolu",
  closed: "Clôturé",
};

const STATUS_VARIANT: Record<
  TicketListItemDto["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  open: "default",
  in_progress: "secondary",
  waiting_customer: "outline",
  resolved: "outline",
  closed: "destructive",
};

export function TicketStatusBadge({
  status,
}: {
  status: TicketListItemDto["status"];
}) {
  return (
    <Badge
      variant={STATUS_VARIANT[status]}
      data-testid={`ticket-status-${status}`}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export { STATUS_LABEL as TICKET_STATUS_LABEL };
