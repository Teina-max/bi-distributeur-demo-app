import { act, render, screen } from "@testing-library/react";
import { useNavigate } from "@tanstack/react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Id } from "@convex/_generated/dataModel";
import type { DashboardInvoiceRowDto } from "@convex/dashboard/dto/todayDigest";
import { TodayInvoicesCard } from "@/routes/app/_components/dashboard/today-invoices-card";

const navigate = vi.fn();

beforeEach(() => {
  navigate.mockReset();
  vi.mocked(useNavigate).mockReturnValue(
    navigate as unknown as ReturnType<typeof useNavigate>,
  );
});

const press = (key: string) => {
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
};

const row = (
  id: string,
  number: string,
  status: DashboardInvoiceRowDto["status"] = "sent",
): DashboardInvoiceRowDto => ({
  id: id as unknown as Id<"invoices">,
  number,
  clientCode: "CLI-001",
  clientName: "Café Test",
  totalTTC: 120,
  status,
  createdAt: 1_700_000_000_000,
});

describe("TodayInvoicesCard", () => {
  test("renders count and rows", () => {
    render(
      <TodayInvoicesCard
        items={[row("i1", "F26-0001"), row("i2", "F26-0002")]}
        enabled
        onFocusRequest={vi.fn()}
      />,
    );
    expect(screen.getByText(/Factures du jour \(2\)/)).toBeInTheDocument();
    expect(screen.getByText("F26-0001")).toBeInTheDocument();
  });

  test("empty state", () => {
    render(
      <TodayInvoicesCard items={[]} enabled onFocusRequest={vi.fn()} />,
    );
    expect(screen.getByText("Aucune facture aujourd'hui")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  test("Enter navigates to invoice detail", () => {
    render(
      <TodayInvoicesCard
        items={[row("i1", "F26-0001")]}
        enabled
        onFocusRequest={vi.fn()}
      />,
    );
    press("Enter");
    expect(navigate).toHaveBeenCalledWith({
      to: "/app/invoices/$invoiceId",
      params: { invoiceId: "i1" },
    });
  });

  test("overdue status renders destructive badge", () => {
    render(
      <TodayInvoicesCard
        items={[row("i1", "F26-0001", "overdue")]}
        enabled
        onFocusRequest={vi.fn()}
      />,
    );
    expect(screen.getByText("En retard")).toBeInTheDocument();
  });
});
