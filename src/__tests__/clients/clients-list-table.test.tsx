import { act } from "@testing-library/react";
import { useNavigate } from "@tanstack/react-router";
import { describe, expect, test, vi } from "vitest";
import type { Id } from "@convex/_generated/dataModel";
import type { ClientListItemDto } from "@convex/clients/dto/clientListItem";
import { ClientsListTable } from "@/routes/app/clients/_components/clients-list-table";
import { setup } from "@/test/setup";

const id = (value: string) => value as unknown as Id<"clients">;

const CLIENT: ClientListItemDto = {
  id: id("client_001"),
  code: "CLI-001",
  name: "BISTROT DU PORT",
  type: "horeca",
  city: "Nice",
  email: "bar@example.test",
  phone: "04 95 00 00 00",
  paymentTermsLabel: "30 jours",
};

const ROWS: ClientListItemDto[] = [
  CLIENT,
  { ...CLIENT, id: id("client_002"), code: "CLI-002", name: "HOTEL CENTRAL" },
];

const press = (key: string) => {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
};

describe("ClientsListTable", () => {
  test("renders empty state", () => {
    const { getByText } = setup(<ClientsListTable items={[]} />);
    expect(getByText("Aucun client trouvé.")).toBeInTheDocument();
  });

  test("renders rows with code, name and city", () => {
    const { getByTestId } = setup(<ClientsListTable items={ROWS} />);
    expect(getByTestId("client-row-client_001")).toHaveTextContent("CLI-001");
    expect(getByTestId("client-row-client_001")).toHaveTextContent(
      "BISTROT DU PORT",
    );
    expect(getByTestId("client-row-client_001")).toHaveTextContent("Nice");
  });

  test("ArrowDown then Enter navigates to client detail", () => {
    const navigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigate);
    setup(<ClientsListTable items={ROWS} />);

    act(() => press("ArrowDown"));
    act(() => press("Enter"));

    expect(navigate).toHaveBeenCalledWith({
      to: "/app/clients/$clientId",
      params: { clientId: "client_002" },
    });
  });
});
