import { describe, expect, test } from "vitest";
import type { ClientActivitySummaryDto } from "@convex/clients/dto/clientActivitySummary";
import { ClientSummaryCard } from "@/routes/app/clients/_components/client-summary-card";
import { setup } from "@/test/setup";

const SUMMARY: ClientActivitySummaryDto = {
  totalRevenueHt: 300,
  pendingRevenueHt: 120,
  countQuotations: { draft: 1, sent: 2 },
  countDeliveryForms: { delivered: 1, cancelled: 1 },
  countInvoices: { sent: 1, paid: 1, cancelled: 1 },
};

describe("ClientSummaryCard", () => {
  test("renders amounts and status counts", () => {
    const { getAllByText, getByTestId, getByText } = setup(
      <ClientSummaryCard summary={SUMMARY} />,
    );

    expect(getByTestId("client-summary-total")).toHaveTextContent("300,00 €");
    expect(getByTestId("client-summary-pending")).toHaveTextContent(
      "120,00 €",
    );
    expect(getByText("draft: 1")).toBeInTheDocument();
    expect(getByText("delivered: 1")).toBeInTheDocument();
    expect(getAllByText("cancelled: 1")).toHaveLength(2);
  });
});
