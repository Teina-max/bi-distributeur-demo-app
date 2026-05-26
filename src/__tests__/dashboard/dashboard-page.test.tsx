import { act, render, screen } from "@testing-library/react";
import { useNavigate } from "@tanstack/react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Id } from "@convex/_generated/dataModel";
import type {
  DashboardDeliveryFormRowDto,
  DashboardInvoiceRowDto,
  DashboardQuotationRowDto,
  DashboardTodayDigestDto,
} from "@convex/dashboard/dto/todayDigest";

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { Route } from "@/routes/app/index";

const navigate = vi.fn();

beforeEach(() => {
  navigate.mockReset();
  mockUseQuery.mockReset();
  vi.mocked(useNavigate).mockReturnValue(
    navigate as unknown as ReturnType<typeof useNavigate>,
  );
});

const quot = (id: string, number: string): DashboardQuotationRowDto => ({
  id: id as unknown as Id<"quotations">,
  number,
  clientCode: "CLI-001",
  clientName: "Café Test",
  totalHT: 100,
  status: "draft",
  createdAt: 1_700_000_000_000,
});

const deliv = (id: string, number: string): DashboardDeliveryFormRowDto => ({
  id: id as unknown as Id<"delivery_forms">,
  number,
  clientCode: "CLI-001",
  clientName: "Café Test",
  totalHT: 50,
  status: "delivered",
  createdAt: 1_700_000_000_000,
});

const inv = (id: string, number: string): DashboardInvoiceRowDto => ({
  id: id as unknown as Id<"invoices">,
  number,
  clientCode: "CLI-001",
  clientName: "Café Test",
  totalTTC: 120,
  status: "sent",
  createdAt: 1_700_000_000_000,
});

const digest = (
  q: DashboardQuotationRowDto[],
  d: DashboardDeliveryFormRowDto[],
  i: DashboardInvoiceRowDto[],
): DashboardTodayDigestDto => ({
  quotations: q,
  deliveryForms: d,
  invoices: i,
});

const press = (key: string, shiftKey = false) => {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key, shiftKey, bubbles: true }),
    );
  });
};

function renderPage() {
  const Component = Route.options.component;
  if (!Component) throw new Error("Route component missing");
  return render(<Component />);
}

describe("DashboardIndex page", () => {
  test("returns skeleton while digest is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    renderPage();
    // skeleton has no Card testid
    expect(screen.queryByTestId("dashboard-quotations-card")).toBeNull();
  });

  test("renders the 3 cards once data is ready", () => {
    mockUseQuery.mockReturnValue(
      digest(
        [quot("q1", "D26-0001")],
        [deliv("d1", "B26-0001")],
        [inv("i1", "F26-0001")],
      ),
    );
    renderPage();
    expect(screen.getByTestId("dashboard-quotations-card")).toBeInTheDocument();
    expect(
      screen.getByTestId("dashboard-delivery-forms-card"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-invoices-card")).toBeInTheDocument();
  });

  test("quotations card is active by default", () => {
    mockUseQuery.mockReturnValue(
      digest(
        [quot("q1", "D26-0001")],
        [deliv("d1", "B26-0001")],
        [inv("i1", "F26-0001")],
      ),
    );
    renderPage();
    expect(
      screen
        .getByTestId("dashboard-quotations-card")
        .getAttribute("data-active-card"),
    ).toBe("true");
    expect(
      screen
        .getByTestId("dashboard-delivery-forms-card")
        .getAttribute("data-active-card"),
    ).toBe("false");
  });

  test("Tab cycles quotations → delivery-forms → invoices → quotations", () => {
    mockUseQuery.mockReturnValue(
      digest(
        [quot("q1", "D26-0001")],
        [deliv("d1", "B26-0001")],
        [inv("i1", "F26-0001")],
      ),
    );
    renderPage();

    press("Tab");
    expect(
      screen
        .getByTestId("dashboard-delivery-forms-card")
        .getAttribute("data-active-card"),
    ).toBe("true");

    press("Tab");
    expect(
      screen
        .getByTestId("dashboard-invoices-card")
        .getAttribute("data-active-card"),
    ).toBe("true");

    press("Tab");
    expect(
      screen
        .getByTestId("dashboard-quotations-card")
        .getAttribute("data-active-card"),
    ).toBe("true");
  });

  test("Shift+Tab cycles backwards", () => {
    mockUseQuery.mockReturnValue(
      digest(
        [quot("q1", "D26-0001")],
        [deliv("d1", "B26-0001")],
        [inv("i1", "F26-0001")],
      ),
    );
    renderPage();

    press("Tab", true);
    expect(
      screen
        .getByTestId("dashboard-invoices-card")
        .getAttribute("data-active-card"),
    ).toBe("true");
  });

  test("Tab skips empty cards", () => {
    // Only quotations and invoices have data — delivery-forms empty
    mockUseQuery.mockReturnValue(
      digest([quot("q1", "D26-0001")], [], [inv("i1", "F26-0001")]),
    );
    renderPage();

    press("Tab");
    // Should skip delivery-forms straight to invoices
    expect(
      screen
        .getByTestId("dashboard-invoices-card")
        .getAttribute("data-active-card"),
    ).toBe("true");
  });

  test("Tab is no-op when all cards are empty", () => {
    mockUseQuery.mockReturnValue(digest([], [], []));
    renderPage();
    press("Tab");
    // Still on quotations (default) — no error thrown
    expect(
      screen
        .getByTestId("dashboard-quotations-card")
        .getAttribute("data-active-card"),
    ).toBe("true");
  });

  test("auto-jumps to first non-empty card when default is empty", () => {
    // quotations empty, delivery-forms has data
    mockUseQuery.mockReturnValue(
      digest([], [deliv("d1", "B26-0001")], [inv("i1", "F26-0001")]),
    );
    renderPage();
    expect(
      screen
        .getByTestId("dashboard-delivery-forms-card")
        .getAttribute("data-active-card"),
    ).toBe("true");
  });
});
