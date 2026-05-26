import { act, render } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { useTableKeyboardNav } from "@/hooks/use-table-keyboard-nav";

type Row = { id: string; label: string };

function Harness({
  rows,
  scopeId,
  onActivate,
  enabled,
}: {
  rows: readonly Row[];
  scopeId: string;
  onActivate?: (row: Row, index: number) => void;
  enabled?: boolean;
}) {
  const { activeIndex, getRowProps } = useTableKeyboardNav(rows, {
    scopeId,
    onActivate,
    enabled,
  });
  return (
    <table>
      <tbody>
        {rows.map((row, i) => {
          const props = getRowProps(i);
          return (
            <tr
              key={row.id}
              data-testid={`row-${i}`}
              data-active={props["data-active"]}
              aria-selected={props["aria-selected"]}
              tabIndex={props.tabIndex}
            >
              <td>{row.label}</td>
              <td data-testid="active-index">{activeIndex}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const press = (key: string) => {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
};

describe("useTableKeyboardNav", () => {
  test("starts at index 0 with first row active", () => {
    const rows: Row[] = [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
    ];
    const { getByTestId } = render(<Harness rows={rows} scopeId="t1" />);
    expect(getByTestId("row-0").getAttribute("data-active")).toBe("true");
    expect(getByTestId("row-1").getAttribute("data-active")).toBe("false");
  });

  test("ArrowDown moves active row, clamped at last", () => {
    const rows: Row[] = [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ];
    const { getByTestId } = render(<Harness rows={rows} scopeId="t2" />);
    act(() => press("ArrowDown"));
    expect(getByTestId("row-1").getAttribute("data-active")).toBe("true");
    act(() => press("ArrowDown"));
    expect(getByTestId("row-1").getAttribute("data-active")).toBe("true");
  });

  test("ArrowUp moves active row, clamped at first", () => {
    const rows: Row[] = [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ];
    const { getByTestId } = render(<Harness rows={rows} scopeId="t3" />);
    act(() => press("ArrowDown"));
    act(() => press("ArrowUp"));
    expect(getByTestId("row-0").getAttribute("data-active")).toBe("true");
    act(() => press("ArrowUp"));
    expect(getByTestId("row-0").getAttribute("data-active")).toBe("true");
  });

  test("Enter triggers onActivate with active row", () => {
    const rows: Row[] = [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ];
    const onActivate = vi.fn();
    render(<Harness rows={rows} scopeId="t4" onActivate={onActivate} />);
    act(() => press("ArrowDown"));
    act(() => press("Enter"));
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledWith({ id: "b", label: "B" }, 1);
  });

  test("enabled=false disables nav and selection", () => {
    const rows: Row[] = [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ];
    const onActivate = vi.fn();
    const { getByTestId } = render(
      <Harness
        rows={rows}
        scopeId="t5"
        enabled={false}
        onActivate={onActivate}
      />,
    );
    expect(getByTestId("row-0").getAttribute("data-active")).toBe("false");
    act(() => press("ArrowDown"));
    act(() => press("Enter"));
    expect(onActivate).not.toHaveBeenCalled();
  });

  test("clamps activeIndex when rows shrink", () => {
    const rowsBig: Row[] = [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
    ];
    const { rerender, getByTestId } = render(
      <Harness rows={rowsBig} scopeId="t6" />,
    );
    act(() => press("ArrowDown"));
    act(() => press("ArrowDown"));
    expect(getByTestId("row-2").getAttribute("data-active")).toBe("true");
    rerender(<Harness rows={[{ id: "a", label: "A" }]} scopeId="t6" />);
    expect(getByTestId("row-0").getAttribute("data-active")).toBe("true");
  });
});
