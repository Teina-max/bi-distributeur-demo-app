import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Id } from "@convex/_generated/dataModel";
import { TicketMessageForm } from "@/routes/app/tickets/_components/ticket-message-form";
import { setup } from "@/test/setup";

const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

const TICKET_ID = "t_msg" as unknown as Id<"support_tickets">;

beforeEach(() => {
  mockUseMutation.mockReset();
});

describe("TicketMessageForm", () => {
  test("submit calls addMessage mutation with body and ticket id", async () => {
    const addMessage = vi.fn().mockResolvedValue({ id: "m_inserted" });
    mockUseMutation.mockReturnValue(addMessage);

    const { user } = setup(<TicketMessageForm ticketId={TICKET_ID} />);

    const input = screen.getByTestId(
      "ticket-message-input",
    ) as HTMLTextAreaElement;
    await user.type(input, "Client a confirmé le RDV");
    await user.click(screen.getByTestId("ticket-message-submit"));

    expect(addMessage).toHaveBeenCalledWith({
      id: TICKET_ID,
      body: "Client a confirmé le RDV",
    });
  });

  test("submit button is disabled when ticket is closed", () => {
    mockUseMutation.mockReturnValue(vi.fn());

    setup(<TicketMessageForm ticketId={TICKET_ID} disabled />);

    expect(screen.getByTestId("ticket-message-submit")).toBeDisabled();
    expect(screen.getByTestId("ticket-message-input")).toBeDisabled();
  });
});
