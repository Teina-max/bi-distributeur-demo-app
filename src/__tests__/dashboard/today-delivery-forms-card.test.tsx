import { act, render, screen } from "@testing-library/react";
import { useNavigate } from "@tanstack/react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Id } from "@convex/_generated/dataModel";
import type { DashboardDeliveryFormRowDto } from "@convex/dashboard/dto/todayDigest";
import { TodayDeliveryFormsCard } from "@/routes/app/_components/dashboard/today-delivery-forms-card";

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
  status: DashboardDeliveryFormRowDto["status"] = "delivered",
): DashboardDeliveryFormRowDto => ({
  id: id as unknown as Id<"delivery_forms">,
  number,
  clientCode: "CLI-001",
  clientName: "Café Test",
  totalHT: 75,
  status,
  createdAt: 1_700_000_000_000,
});

describe("TodayDeliveryFormsCard", () => {
  test("renders count and rows", () => {
    render(
      <TodayDeliveryFormsCard
        items={[row("d1", "B26-0001"), row("d2", "B26-0002")]}
        enabled
        onFocusRequest={vi.fn()}
      />,
    );
    expect(screen.getByText(/Bons de livraison \(2\)/)).toBeInTheDocument();
    expect(screen.getByText("B26-0001")).toBeInTheDocument();
  });

  test("empty state", () => {
    render(
      <TodayDeliveryFormsCard
        items={[]}
        enabled
        onFocusRequest={vi.fn()}
      />,
    );
    expect(screen.getByText("Aucun BL aujourd'hui")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  test("Enter navigates to delivery form detail", () => {
    render(
      <TodayDeliveryFormsCard
        items={[row("d1", "B26-0001")]}
        enabled
        onFocusRequest={vi.fn()}
      />,
    );
    press("Enter");
    expect(navigate).toHaveBeenCalledWith({
      to: "/app/delivery-forms/$deliveryFormId",
      params: { deliveryFormId: "d1" },
    });
  });

  test("enabled=false disables Enter", () => {
    render(
      <TodayDeliveryFormsCard
        items={[row("d1", "B26-0001")]}
        enabled={false}
        onFocusRequest={vi.fn()}
      />,
    );
    press("Enter");
    expect(navigate).not.toHaveBeenCalled();
  });

  test("invoiced status renders outline badge", () => {
    render(
      <TodayDeliveryFormsCard
        items={[row("d1", "B26-0001", "invoiced")]}
        enabled
        onFocusRequest={vi.fn()}
      />,
    );
    expect(screen.getByText("Facturé")).toBeInTheDocument();
  });
});
