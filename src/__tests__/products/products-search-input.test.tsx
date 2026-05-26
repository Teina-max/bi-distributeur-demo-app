import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent } from "@testing-library/react";
import { ProductsSearchInput } from "@/routes/app/products/_components/products-search-input";
import { setup } from "@/test/setup";

describe("ProductsSearchInput", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("calls onQueryChange with empty string on mount", () => {
    const onQueryChange = vi.fn();
    setup(<ProductsSearchInput onQueryChange={onQueryChange} />);
    expect(onQueryChange).toHaveBeenCalledWith("");
  });

  test("debounces typing (80ms) — emits final value after delay", () => {
    const onQueryChange = vi.fn();
    const { getByTestId } = setup(
      <ProductsSearchInput onQueryChange={onQueryChange} />,
    );
    onQueryChange.mockClear();
    const input = getByTestId("products-search-input") as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: "caf" } });
    });
    // Before debounce window: no call yet
    expect(onQueryChange).not.toHaveBeenCalledWith("caf");
    act(() => {
      vi.advanceTimersByTime(80);
    });
    expect(onQueryChange).toHaveBeenCalledWith("caf");
    expect(onQueryChange).toHaveBeenCalledTimes(1);
  });

  test("only emits the latest value when value changes fast", () => {
    const onQueryChange = vi.fn();
    const { getByTestId } = setup(
      <ProductsSearchInput onQueryChange={onQueryChange} />,
    );
    onQueryChange.mockClear();
    const input = getByTestId("products-search-input") as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: "a" } });
    });
    act(() => {
      vi.advanceTimersByTime(40);
    });
    act(() => {
      fireEvent.change(input, { target: { value: "ab" } });
    });
    act(() => {
      vi.advanceTimersByTime(80);
    });
    const values = onQueryChange.mock.calls.map((c) => c[0]);
    expect(values).toContain("ab");
    expect(values).not.toContain("a");
  });
});
