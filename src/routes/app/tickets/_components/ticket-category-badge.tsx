import { Badge } from "@/components/ui/badge";
import type { TicketListItemDto } from "@convex/support_tickets/dto/ticketListItem";

const CATEGORY_LABEL: Record<TicketListItemDto["category"], string> = {
  machine_panne: "Machine en panne",
  produit_defaut: "Produit défectueux",
  facturation: "Facturation",
};

export function TicketCategoryBadge({
  category,
}: {
  category: TicketListItemDto["category"];
}) {
  return (
    <Badge variant="outline" data-testid={`ticket-category-${category}`}>
      {CATEGORY_LABEL[category]}
    </Badge>
  );
}

export { CATEGORY_LABEL as TICKET_CATEGORY_LABEL };
