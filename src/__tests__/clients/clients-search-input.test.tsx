import { act, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ClientsSearchInput } from "@/routes/app/clients/_components/clients-search-input";
import { setup } from "@/test/setup";

describe("ClientsSearchInput", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("calls onQueryChange with empty string on mount", () => {
    const onQueryChange = vi.fn();
    setup(<ClientsSearchInput onQueryChange={onQueryChange} />);
    expect(onQueryChange).toHaveBeenCalledWith("");
  });

  test("debounces typing by 80ms", () => {
    const onQueryChange = vi.fn();
    const { getByTestId } = setup(
      <ClientsSearchInput onQueryChange={onQueryChange} />,
    );
    onQueryChange.mockClear();
    const input = getByTestId("clients-search-input") as HTMLInputElement;

    act(() => {
      fireEvent.change(input, { target: { value: "bar" } });
    });
    expect(onQueryChange).not.toHaveBeenCalledWith("bar");

    act(() => {
      vi.advanceTimersByTime(80);
    });
    expect(onQueryChange).toHaveBeenCalledWith("bar");
  });
});
