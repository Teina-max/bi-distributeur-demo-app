import { describe, expect, test, vi } from "vitest";
import { act, render } from "@testing-library/react";
import type { Id } from "@convex/_generated/dataModel";
import type { DeliveryFormInvoiceableDto } from "@convex/delivery_forms/dto/deliveryFormInvoiceable";
import { InvoiceableBLsTable } from "@/routes/app/invoices/_components/aggregate/invoiceable-bls-table";

const makeRow = (
  id: string,
  number: string,
): DeliveryFormInvoiceableDto => ({
  id: id as unknown as Id<"delivery_forms">,
  number,
  deliveredAt: 1_700_000_000_000,
  total_ht: 100,
  total_ttc: 120,
  createdAt: 1_700_000_000_000,
});

const ROWS: DeliveryFormInvoiceableDto[] = [
  makeRow("bl_1", "B26-0001"),
  makeRow("bl_2", "B26-0002"),
  makeRow("bl_3", "B26-0003"),
];

const press = (key: string, opts?: KeyboardEventInit) => {
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, ...opts }));
  });
};

describe("InvoiceableBLsTable", () => {
  test("renders empty state when rows is empty", () => {
    const { getByTestId, queryByTestId } = render(
      <InvoiceableBLsTable
        rows={[]}
        selectedIds={new Set()}
        onToggle={vi.fn()}
        onToggleAll={vi.fn()}
      />,
    );
    expect(getByTestId("invoiceable-bls-empty")).toBeTruthy();
    expect(queryByTestId("invoiceable-bls-table")).toBeNull();
  });

  test("renders one row per BL when populated", () => {
    const { getByTestId } = render(
      <InvoiceableBLsTable
        rows={ROWS}
        selectedIds={new Set(["bl_1", "bl_2", "bl_3"])}
        onToggle={vi.fn()}
        onToggleAll={vi.fn()}
      />,
    );
    expect(getByTestId("invoiceable-bl-row-bl_1")).toBeTruthy();
    expect(getByTestId("invoiceable-bl-row-bl_2")).toBeTruthy();
    expect(getByTestId("invoiceable-bl-row-bl_3")).toBeTruthy();
  });

  test("Space key toggles checkbox of active row (first row by default)", () => {
    const onToggle = vi.fn();
    render(
      <InvoiceableBLsTable
        rows={ROWS}
        selectedIds={new Set()}
        onToggle={onToggle}
        onToggleAll={vi.fn()}
      />,
    );
    press(" ");
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith("bl_1");
  });

  test("Arrow Down then Space toggles the next row", () => {
    const onToggle = vi.fn();
    render(
      <InvoiceableBLsTable
        rows={ROWS}
        selectedIds={new Set()}
        onToggle={onToggle}
        onToggleAll={vi.fn()}
      />,
    );
    press("ArrowDown");
    press(" ");
    expect(onToggle).toHaveBeenLastCalledWith("bl_2");
  });

  test("Ctrl+A triggers onToggleAll once", () => {
    const onToggleAll = vi.fn();
    render(
      <InvoiceableBLsTable
        rows={ROWS}
        selectedIds={new Set()}
        onToggle={vi.fn()}
        onToggleAll={onToggleAll}
      />,
    );
    press("a", { ctrlKey: true });
    expect(onToggleAll).toHaveBeenCalledTimes(1);
  });
});
