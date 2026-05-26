import { beforeEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";
import { InvoiceAggregateForm } from "@/routes/app/invoices/_components/aggregate/invoice-aggregate-form";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

const navigate = vi.fn();

beforeEach(() => {
  navigate.mockReset();
  mockUseQuery.mockReset();
  mockUseMutation.mockReset();
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  vi.mocked(useNavigate).mockReturnValue(
    navigate as unknown as ReturnType<typeof useNavigate>,
  );
});

const CLIENT = {
  id: "client_1" as unknown as Id<"clients">,
  code: "BAR-001",
  name: "BISTROT DU PORT",
  city: "Nice",
};

const ROW_1 = {
  id: "bl_1" as unknown as Id<"delivery_forms">,
  number: "B26-0001",
  deliveredAt: 1_700_000_000_000,
  total_ht: 100,
  total_ttc: 120,
  createdAt: 1_700_000_000_000,
};

const ROW_2 = {
  id: "bl_2" as unknown as Id<"delivery_forms">,
  number: "B26-0002",
  deliveredAt: 1_700_000_100_000,
  total_ht: 50,
  total_ttc: 60,
  createdAt: 1_700_000_100_000,
};

describe("InvoiceAggregateForm", () => {
  test("renders the empty-client placeholder until a client is picked", () => {
    mockUseQuery.mockReturnValue([]);
    mockUseMutation.mockReturnValue(vi.fn());
    const { getByTestId } = render(<InvoiceAggregateForm />);
    expect(getByTestId("aggregate-no-client")).toBeTruthy();
  });

  test("after picking a client and rows arrive, submit calls mutation with all selected ids and redirects", async () => {
    // 1) Pas de client: useQuery skipped → 1er call retourne undefined côté React
    // mais on retourne directement les rows pour simplifier (le composant gère le skip).
    mockUseQuery
      .mockReturnValueOnce(undefined) // before client pick (skipped)
      .mockReturnValue([ROW_1, ROW_2]); // after pick, rows arrive

    const convertMock = vi.fn().mockResolvedValue({
      id: "inv_new",
      number: "F26-0001",
    });
    mockUseMutation.mockReturnValue(convertMock);

    const { getByTestId } = render(<InvoiceAggregateForm />);

    // Pick a client via the picker input → simulate Enter to pick first suggestion
    mockUseQuery.mockReturnValue([CLIENT]);
    const input = getByTestId("aggregate-client-picker-input");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "bar" } });
    await waitFor(
      () => {
        expect(getByTestId("aggregate-client-suggestions")).toBeTruthy();
      },
      { timeout: 300 },
    );

    // Make subsequent queries (after pick) return the rows
    mockUseQuery.mockReturnValue([ROW_1, ROW_2]);
    act(() => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    await waitFor(() => {
      expect(getByTestId("aggregate-submit")).toBeTruthy();
    });

    // Default: all 2 selected, footer reads 2
    expect(getByTestId("selected-count").textContent).toBe("2");

    // Submit
    await act(async () => {
      fireEvent.click(getByTestId("aggregate-submit"));
    });

    expect(convertMock).toHaveBeenCalledTimes(1);
    expect(convertMock).toHaveBeenCalledWith({
      delivery_form_ids: [ROW_1.id, ROW_2.id],
    });
    expect(toast.success).toHaveBeenCalledWith(
      "Facture F26-0001 créée (2 BL agrégés)",
    );
    expect(navigate).toHaveBeenCalledWith({
      to: "/app/invoices/$invoiceId",
      params: { invoiceId: "inv_new" },
    });
  });

  test("submit button is disabled when no BL is selected", async () => {
    mockUseQuery.mockReturnValue([CLIENT]);
    mockUseMutation.mockReturnValue(vi.fn());

    const { getByTestId } = render(<InvoiceAggregateForm />);
    const input = getByTestId("aggregate-client-picker-input");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "bar" } });
    await waitFor(
      () => {
        expect(getByTestId("aggregate-client-suggestions")).toBeTruthy();
      },
      { timeout: 300 },
    );

    // Provide rows for after pick
    mockUseQuery.mockReturnValue([ROW_1]);
    act(() => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    await waitFor(() => {
      expect(getByTestId("aggregate-submit")).toBeTruthy();
    });

    // 1 BL selected by default — toggle it off
    act(() => {
      fireEvent.click(getByTestId(`invoiceable-bl-checkbox-${ROW_1.id}`));
    });

    const btn = getByTestId("aggregate-submit") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
