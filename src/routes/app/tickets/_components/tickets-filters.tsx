import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TicketListItemDto } from "@convex/support_tickets/dto/ticketListItem";
import { TICKET_CATEGORY_LABEL } from "./ticket-category-badge";
import { TICKET_PRIORITY_LABEL } from "./ticket-priority-badge";
import { TICKET_STATUS_LABEL } from "./ticket-status-badge";

export type StatusFilter = TicketListItemDto["status"] | "all";
export type CategoryFilter = TicketListItemDto["category"] | "all";
export type PriorityFilter = TicketListItemDto["priority"] | "all";

type Props = {
  status: StatusFilter;
  category: CategoryFilter;
  priority: PriorityFilter;
  assignedTo: string | "all";
  assignees: readonly string[];
  onStatus: (value: StatusFilter) => void;
  onCategory: (value: CategoryFilter) => void;
  onPriority: (value: PriorityFilter) => void;
  onAssignee: (value: string | "all") => void;
};

const STATUS_VALUES: StatusFilter[] = [
  "all",
  "open",
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
];
const CATEGORY_VALUES: CategoryFilter[] = [
  "all",
  "machine_panne",
  "produit_defaut",
  "facturation",
];
const PRIORITY_VALUES: PriorityFilter[] = [
  "all",
  "low",
  "normal",
  "high",
  "urgent",
];

function labelForStatus(value: StatusFilter): string {
  return value === "all" ? "Tous" : TICKET_STATUS_LABEL[value];
}
function labelForCategory(value: CategoryFilter): string {
  return value === "all" ? "Toutes" : TICKET_CATEGORY_LABEL[value];
}
function labelForPriority(value: PriorityFilter): string {
  return value === "all" ? "Toutes" : TICKET_PRIORITY_LABEL[value];
}

function FacetButtons<TValue extends string>({
  values,
  active,
  onChange,
  label,
  testidPrefix,
  renderLabel,
}: {
  values: readonly TValue[];
  active: TValue;
  onChange: (value: TValue) => void;
  label: string;
  testidPrefix: string;
  renderLabel: (value: TValue) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-muted-foreground mr-1 text-xs">{label}</span>
      {values.map((value) => (
        <Button
          key={value}
          type="button"
          size="sm"
          variant={value === active ? "default" : "outline"}
          className={cn("h-7 px-2 text-xs")}
          onClick={() => onChange(value)}
          data-testid={`${testidPrefix}-${value}`}
        >
          {renderLabel(value)}
        </Button>
      ))}
    </div>
  );
}

export function TicketsFilters({
  status,
  category,
  priority,
  assignedTo,
  assignees,
  onStatus,
  onCategory,
  onPriority,
  onAssignee,
}: Props) {
  return (
    <div className="flex flex-col gap-2" data-testid="tickets-filters">
      <FacetButtons
        values={STATUS_VALUES}
        active={status}
        onChange={onStatus}
        label="Statut"
        testidPrefix="filter-status"
        renderLabel={labelForStatus}
      />
      <FacetButtons
        values={CATEGORY_VALUES}
        active={category}
        onChange={onCategory}
        label="Catégorie"
        testidPrefix="filter-category"
        renderLabel={labelForCategory}
      />
      <FacetButtons
        values={PRIORITY_VALUES}
        active={priority}
        onChange={onPriority}
        label="Priorité"
        testidPrefix="filter-priority"
        renderLabel={labelForPriority}
      />
      {assignees.length > 0 ? (
        <FacetButtons
          values={["all", ...assignees]}
          active={assignedTo}
          onChange={onAssignee}
          label="Assigné"
          testidPrefix="filter-assignee"
          renderLabel={(value) => (value === "all" ? "Tous" : value)}
        />
      ) : null}
    </div>
  );
}
