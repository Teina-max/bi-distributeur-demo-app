import { describe, expect, test, vi } from "vitest";
import type { Id } from "@convex/_generated/dataModel";
import type { ClientDetailDto } from "@convex/clients/dto/clientDetail";
import { ClientIdentityCard } from "@/routes/app/clients/_components/client-identity-card";
import { setup } from "@/test/setup";

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
}));

const CLIENT: ClientDetailDto = {
  id: "client_001" as unknown as Id<"clients">,
  code: "CLI-001",
  name: "BISTROT DU PORT",
  type: "horeca",
  email: "bar@example.test",
  phone: "04 95 00 00 00",
  address: {
    street: "1 quai test",
    postal_code: "06000",
    city: "Nice",
    country: "FR",
  },
  paymentTermsDays: 30,
  paymentTermsLabel: "30 jours",
  createdAt: 1_700_000_000_000,
  correspondent: null,
  vendor: null,
  sector: null,
  depotCafe: null,
  accountingCode: null,
  creditLimit: null,
  outstandingAmount: 0,
  globalDiscountPct: 0,
  tariffLevel: 1,
  vatIntra: null,
  isVisible: true,
  notes: "",
};

describe("ClientIdentityCard", () => {
  test("renders all client identity fields", () => {
    const { getByTestId, getByText } = setup(
      <ClientIdentityCard client={CLIENT} isAdmin={false} />,
    );

    expect(getByText("CLI-001")).toBeInTheDocument();
    expect(getByTestId("client-detail-name")).toHaveTextContent("BISTROT DU PORT");
    expect(getByTestId("client-detail-type")).toHaveTextContent("horeca");
    expect(getByTestId("client-detail-email")).toHaveTextContent(
      "bar@example.test",
    );
    expect(getByTestId("client-detail-phone")).toHaveTextContent(
      "04 95 00 00 00",
    );
    expect(getByTestId("client-detail-address")).toHaveTextContent("Nice");
    expect(getByTestId("client-detail-payment")).toHaveTextContent("30 jours");
  });

  test("renders dash for nullable email and phone", () => {
    const { getByTestId } = setup(
      <ClientIdentityCard
        client={{ ...CLIENT, email: null, phone: null }}
        isAdmin={false}
      />,
    );

    expect(getByTestId("client-detail-email")).toHaveTextContent("—");
    expect(getByTestId("client-detail-phone")).toHaveTextContent("—");
  });
});
