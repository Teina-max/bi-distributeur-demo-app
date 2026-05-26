import { describe, expect, test } from "vitest";
import type { Id } from "@convex/_generated/dataModel";
import type { TicketMessageDto } from "@convex/support_tickets/dto/ticketMessage";
import { TicketMessagesTimeline } from "@/routes/app/tickets/_components/ticket-messages-timeline";
import { setup } from "@/test/setup";

const mid = (value: string) => value as unknown as Id<"ticket_messages">;
const tid = (value: string) => value as unknown as Id<"support_tickets">;

describe("TicketMessagesTimeline", () => {
  test("renders empty state", () => {
    const { getByText } = setup(<TicketMessagesTimeline messages={[]} />);
    expect(getByText("Aucun message pour le moment.")).toBeInTheDocument();
  });

  test("preserves whitespace and line breaks in body", () => {
    const message: TicketMessageDto = {
      id: mid("m_1"),
      ticketId: tid("t_1"),
      authorEmail: "op@example.test",
      body: "Client rappelle demain matin\nApportera la machine au bureau",
      createdAt: 1_700_000_000_000,
    };

    const { container } = setup(
      <TicketMessagesTimeline messages={[message]} />,
    );
    const paragraph = container.querySelector(".whitespace-pre-wrap");
    expect(paragraph).not.toBeNull();
    expect(paragraph?.textContent).toBe(
      "Client rappelle demain matin\nApportera la machine au bureau",
    );
  });
});
