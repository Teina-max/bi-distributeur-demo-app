import { Badge } from "@/components/ui/badge";
import type { TicketListItemDto } from "@convex/support_tickets/dto/ticketListItem";

const PRIORITY_LABEL: Record<TicketListItemDto["priority"], string> = {
  low: "Basse",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
};

const PRIORITY_VARIANT: Record<
  TicketListItemDto["priority"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  low: "outline",
  normal: "secondary",
  high: "default",
  urgent: "destructive",
};

export function TicketPriorityBadge({
  priority,
}: {
  priority: TicketListItemDto["priority"];
}) {
  return (
    <Badge
      variant={PRIORITY_VARIANT[priority]}
      data-testid={`ticket-priority-${priority}`}
    >
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}

export { PRIORITY_LABEL as TICKET_PRIORITY_LABEL };
