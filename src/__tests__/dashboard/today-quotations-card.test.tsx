import { act, render, screen } from "@testing-library/react";
import { useNavigate } from "@tanstack/react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Id } from "@convex/_generated/dataModel";
import type { DashboardQuotationRowDto } from "@convex/dashboard/dto/todayDigest";
import { TodayQuotationsCard } from "@/routes/app/_components/dashboard/today-quotations-card";

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
  status: DashboardQuotationRowDto["status"] = "draft",
): DashboardQuotationRowDto => ({
  id: id as unknown as Id<"quotations">,
  number,
  clientCode: "CLI-001",
  clientName: "Café Test",
  totalHT: 100,
  status,
  createdAt: 1_700_000_000_000,
});

describe("TodayQuotationsCard", () => {
  test("renders count in title and a row per item", () => {
    render(
      <TodayQuotationsCard
        items={[row("q1", "D26-0001"), row("q2", "D26-0002")]}
        enabled
        onFocusRequest={vi.fn()}
      />,
    );
    expect(screen.getByText(/Devis du jour \(2\)/)).toBeInTheDocument();
    expect(screen.getByText("D26-0001")).toBeInTheDocument();
    expect(screen.getByText("D26-0002")).toBeInTheDocument();
  });

  test("empty state renders message and no table", () => {
    render(
      <TodayQuotationsCard items={[]} enabled onFocusRequest={vi.fn()} />,
    );
    expect(screen.getByText(/Devis du jour \(0\)/)).toBeInTheDocument();
    expect(screen.getByText("Aucun devis aujourd'hui")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  test("Enter navigates to /app/quotations/$id with the active row", () => {
    render(
      <TodayQuotationsCard
        items={[row("q1", "D26-0001"), row("q2", "D26-0002")]}
        enabled
        onFocusRequest={vi.fn()}
      />,
    );
    press("ArrowDown");
    press("Enter");
    expect(navigate).toHaveBeenCalledWith({
      to: "/app/quotations/$quotationId",
      params: { quotationId: "q2" },
    });
  });

  test("enabled=false disables keyboard nav (no navigate)", () => {
    render(
      <TodayQuotationsCard
        items={[row("q1", "D26-0001")]}
        enabled={false}
        onFocusRequest={vi.fn()}
      />,
    );
    press("ArrowDown");
    press("Enter");
    expect(navigate).not.toHaveBeenCalled();
  });

  test("active card carries data-active-card='true' attribute", () => {
    render(
      <TodayQuotationsCard
        items={[row("q1", "D26-0001")]}
        enabled
        onFocusRequest={vi.fn()}
      />,
    );
    const card = screen.getByTestId("dashboard-quotations-card");
    expect(card.getAttribute("data-active-card")).toBe("true");
  });

  test("click on card triggers onFocusRequest", () => {
    const onFocusRequest = vi.fn();
    render(
      <TodayQuotationsCard
        items={[row("q1", "D26-0001")]}
        enabled={false}
        onFocusRequest={onFocusRequest}
      />,
    );
    screen.getByTestId("dashboard-quotations-card").click();
    expect(onFocusRequest).toHaveBeenCalledTimes(1);
  });
});
