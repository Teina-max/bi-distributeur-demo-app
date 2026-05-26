import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import * as React from "react";
import { Plus } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { TicketListItemDto } from "@convex/support_tickets/dto/ticketListItem";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Typography } from "@/components/nowts/typography";
import {
  Layout,
  LayoutActions,
  LayoutContent,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { TicketListSkeleton } from "./_components/ticket-list-skeleton";
import { TicketsListTable } from "./_components/tickets-list-table";
import {
  type CategoryFilter,
  type PriorityFilter,
  type StatusFilter,
  TicketsFilters,
} from "./_components/tickets-filters";

export const Route = createFileRoute("/app/tickets/")({
  component: TicketsIndex,
  pendingComponent: TicketListSkeleton,
});

function applyFilters(
  tickets: readonly TicketListItemDto[],
  category: CategoryFilter,
  priority: PriorityFilter,
  assignedTo: string | "all",
): TicketListItemDto[] {
  return tickets.filter((ticket) => {
    if (category !== "all" && ticket.category !== category) return false;
    if (priority !== "all" && ticket.priority !== priority) return false;
    if (assignedTo !== "all" && (ticket.assignedTo ?? "") !== assignedTo)
      return false;
    return true;
  });
}

function TicketsIndex() {
  const navigate = useNavigate();
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [category, setCategory] = React.useState<CategoryFilter>("all");
  const [priority, setPriority] = React.useState<PriorityFilter>("all");
  const [assignedTo, setAssignedTo] = React.useState<string | "all">("all");

  const items = useQuery(
    api.support_tickets.queries.list,
    status === "all" ? { limit: 200 } : { status, limit: 200 },
  );

  useKeyboardScope("tickets-index", {
    F2: () => {
      void navigate({ to: "/app/tickets/new" });
    },
  });

  if (items === undefined) return <TicketListSkeleton />;

  const assignees = Array.from(
    new Set(
      items
        .map((ticket) => ticket.assignedTo)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const filtered = applyFilters(items, category, priority, assignedTo);

  return (
    <Layout size="xl">
      <LayoutHeader>
        <LayoutTitle>Tickets SAV</LayoutTitle>
        <Typography variant="muted">
          Suivi des demandes machine en panne, produit défectueux, facturation.
        </Typography>
        <LayoutActions>
          <Button
            type="button"
            size="sm"
            onClick={() => void navigate({ to: "/app/tickets/new" })}
            data-testid="tickets-new-button"
          >
            <Plus className="size-4" />
            Nouveau ticket
          </Button>
        </LayoutActions>
      </LayoutHeader>
      <LayoutContent>
        <div className="flex flex-col gap-3">
          <TicketsFilters
            status={status}
            category={category}
            priority={priority}
            assignedTo={assignedTo}
            assignees={assignees}
            onStatus={setStatus}
            onCategory={setCategory}
            onPriority={setPriority}
            onAssignee={setAssignedTo}
          />
          <Card>
            <CardContent>
              <TicketsListTable rows={filtered} />
            </CardContent>
          </Card>
        </div>
      </LayoutContent>
    </Layout>
  );
}
