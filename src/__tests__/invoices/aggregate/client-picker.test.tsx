import { beforeEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import type { Id } from "@convex/_generated/dataModel";
import { ClientPicker } from "@/routes/app/invoices/_components/aggregate/client-picker";

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

beforeEach(() => {
  mockUseQuery.mockReset();
});

const CLIENT = {
  id: "client_1" as unknown as Id<"clients">,
  code: "BAR-001",
  name: "BISTROT DU PORT",
  city: "Nice",
};

describe("ClientPicker", () => {
  test("renders no suggestion list when input has < 3 chars", () => {
    mockUseQuery.mockReturnValue([]);
    const { queryByTestId, getByTestId } = render(
      <ClientPicker
        selected={null}
        onPickClient={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    const input = getByTestId("aggregate-client-picker-input");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "ba" } });
    expect(queryByTestId("aggregate-client-suggestions")).toBeNull();
  });

  test("shows suggestions list after 3 chars + focus", async () => {
    mockUseQuery.mockReturnValue([CLIENT]);
    const { findByTestId, getByTestId } = render(
      <ClientPicker
        selected={null}
        onPickClient={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    const input = getByTestId("aggregate-client-picker-input");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "bar" } });
    // debounce 80ms → use findBy with reasonable timeout
    await waitFor(
      () => {
        expect(getByTestId("aggregate-client-suggestions")).toBeTruthy();
      },
      { timeout: 300 },
    );
    expect(await findByTestId("aggregate-client-suggestion-client_1")).toBeTruthy();
  });

  test("Enter on input picks the first suggestion", async () => {
    mockUseQuery.mockReturnValue([CLIENT]);
    const onPickClient = vi.fn();
    const { getByTestId } = render(
      <ClientPicker
        selected={null}
        onPickClient={onPickClient}
        onClear={vi.fn()}
      />,
    );
    const input = getByTestId("aggregate-client-picker-input");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "bar" } });
    await waitFor(
      () => {
        expect(getByTestId("aggregate-client-suggestions")).toBeTruthy();
      },
      { timeout: 300 },
    );
    act(() => {
      fireEvent.keyDown(input, { key: "Enter" });
    });
    expect(onPickClient).toHaveBeenCalledTimes(1);
    expect(onPickClient).toHaveBeenCalledWith(CLIENT);
  });

  test("Backspace clears selection when a client is selected", () => {
    mockUseQuery.mockReturnValue([]);
    const onClear = vi.fn();
    const { getByTestId } = render(
      <ClientPicker
        selected={CLIENT}
        onPickClient={vi.fn()}
        onClear={onClear}
      />,
    );
    const input = getByTestId("aggregate-client-picker-input");
    act(() => {
      fireEvent.keyDown(input, { key: "Backspace" });
    });
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
