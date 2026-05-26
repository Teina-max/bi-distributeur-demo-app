import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Id } from "@convex/_generated/dataModel";
import type { TicketDetailDto } from "@convex/support_tickets/dto/ticketDetail";
import { TicketActions } from "@/routes/app/tickets/_components/ticket-actions";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { setup } from "@/test/setup";

const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

vi.mock("@/features/dialog-manager/dialog-manager", () => ({
  dialogManager: {
    custom: vi.fn(),
    confirm: vi.fn(),
    input: vi.fn(),
    close: vi.fn(),
    closeAll: vi.fn(),
  },
}));

const TICKET_ID = "t_actions" as unknown as Id<"support_tickets">;
const CLIENT_ID = "c_actions" as unknown as Id<"clients">;

function ticketFixture(
  overrides: Partial<TicketDetailDto> = {},
): TicketDetailDto {
  return {
    id: TICKET_ID,
    number: "T26-0001",
    title: "Cafetière HS",
    description: "panne",
    status: "open",
    category: "machine_panne",
    priority: "normal",
    client: { id: CLIENT_ID, code: "BAR", name: "BISTROT DU PORT" },
    linkedDeliveryForm: null,
    linkedInvoice: null,
    linkedProduct: null,
    assignedTo: null,
    resolvedAt: null,
    closedAt: null,
    createdBy: "op",
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

beforeEach(() => {
  mockUseMutation.mockReset();
  vi.mocked(dialogManager.confirm).mockClear();
  vi.mocked(dialogManager.input).mockClear();
});

describe("TicketActions", () => {
  test("admin sees Clôturer and clicking it opens dialogManager.confirm", async () => {
    mockUseMutation.mockReturnValue(vi.fn());

    const { user } = setup(<TicketActions ticket={ticketFixture()} isAdmin />);

    const closeBtn = screen.getByTestId("ticket-action-close");
    expect(closeBtn).toBeInTheDocument();
    await user.click(closeBtn);
    expect(vi.mocked(dialogManager.confirm)).toHaveBeenCalled();
    expect(vi.mocked(dialogManager.confirm)).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        action: expect.objectContaining({
          label: "Clôturer définitivement",
        }),
      }),
    );
  });

  test("operator does not see Assigner nor Clôturer", () => {
    mockUseMutation.mockReturnValue(vi.fn());

    setup(<TicketActions ticket={ticketFixture()} isAdmin={false} />);

    expect(screen.queryByTestId("ticket-action-assign")).toBeNull();
    expect(screen.queryByTestId("ticket-action-close")).toBeNull();
  });

  test("Réouvrir visible only when ticket is closed", () => {
    mockUseMutation.mockReturnValue(vi.fn());

    const { rerender } = setup(
      <TicketActions ticket={ticketFixture({ status: "open" })} isAdmin />,
    );
    expect(screen.queryByTestId("ticket-action-reopen")).toBeNull();

    rerender(
      <TicketActions
        ticket={ticketFixture({ status: "closed", closedAt: 1 })}
        isAdmin
      />,
    );
    expect(screen.getByTestId("ticket-action-reopen")).toBeInTheDocument();
  });
});
