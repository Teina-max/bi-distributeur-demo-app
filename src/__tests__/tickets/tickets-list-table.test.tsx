import { describe, expect, test } from "vitest";
import type { Id } from "@convex/_generated/dataModel";
import type { TicketListItemDto } from "@convex/support_tickets/dto/ticketListItem";
import { TicketsListTable } from "@/routes/app/tickets/_components/tickets-list-table";
import { setup } from "@/test/setup";

const id = (value: string) => value as unknown as Id<"support_tickets">;
const cid = (value: string) => value as unknown as Id<"clients">;

const TICKET: TicketListItemDto = {
  id: id("t_001"),
  number: "T26-0001",
  title: "Cafetière X3 ne chauffe plus",
  status: "open",
  category: "machine_panne",
  priority: "high",
  clientId: cid("c_001"),
  clientCode: "BAR",
  clientName: "BISTROT DU PORT",
  assignedTo: "marco@toscana.local",
  createdAt: 1_700_000_000_000,
};

describe("TicketsListTable", () => {
  test("renders empty state", () => {
    const { getByText } = setup(<TicketsListTable rows={[]} />);
    expect(getByText("Aucun ticket pour le moment.")).toBeInTheDocument();
  });

  test("renders columns with category, priority, and status badges", () => {
    const { getByTestId, getByText } = setup(
      <TicketsListTable rows={[TICKET]} />,
    );

    expect(getByTestId("ticket-row-T26-0001")).toHaveTextContent("T26-0001");
    expect(getByText("Cafetière X3 ne chauffe plus")).toBeInTheDocument();
    expect(getByTestId("ticket-category-machine_panne")).toHaveTextContent(
      "Machine en panne",
    );
    expect(getByTestId("ticket-priority-high")).toHaveTextContent("Haute");
    expect(getByTestId("ticket-status-open")).toHaveTextContent("Ouvert");
    expect(getByTestId("ticket-row-T26-0001")).toHaveTextContent(
      "marco@toscana.local",
    );
  });
});
