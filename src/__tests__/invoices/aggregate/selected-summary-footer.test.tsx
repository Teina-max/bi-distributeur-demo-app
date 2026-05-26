import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import type { Id } from "@convex/_generated/dataModel";
import type { DeliveryFormInvoiceableDto } from "@convex/delivery_forms/dto/deliveryFormInvoiceable";
import { SelectedSummaryFooter } from "@/routes/app/invoices/_components/aggregate/selected-summary-footer";

const makeRow = (
  id: string,
  number: string,
  totalHt: number,
  totalTtc: number,
): DeliveryFormInvoiceableDto => ({
  id: id as unknown as Id<"delivery_forms">,
  number,
  deliveredAt: 1_700_000_000_000,
  total_ht: totalHt,
  total_ttc: totalTtc,
  createdAt: 1_700_000_000_000,
});

const ROWS: DeliveryFormInvoiceableDto[] = [
  makeRow("bl_1", "B26-0001", 100, 120),
  makeRow("bl_2", "B26-0002", 50.5, 60.6),
  makeRow("bl_3", "B26-0003", 25.25, 30.3),
];

describe("SelectedSummaryFooter", () => {
  test("count = 0 when no selection, totals stay at 0,00", () => {
    const { getByTestId } = render(
      <SelectedSummaryFooter rows={ROWS} selectedIds={new Set()} />,
    );
    expect(getByTestId("selected-count").textContent).toBe("0");
    expect(getByTestId("selected-total-ht").textContent).toBe("0,00");
    expect(getByTestId("selected-total-ttc").textContent).toBe("0,00");
  });

  test("sums HT and TTC only for selected ids", () => {
    const selected = new Set(["bl_1", "bl_3"]);
    const { getByTestId } = render(
      <SelectedSummaryFooter rows={ROWS} selectedIds={selected} />,
    );
    expect(getByTestId("selected-count").textContent).toBe("2");
    expect(getByTestId("selected-total-ht").textContent).toBe("125,25");
    expect(getByTestId("selected-total-ttc").textContent).toBe("150,30");
  });

  test("updates when selection changes (re-render)", () => {
    const { getByTestId, rerender } = render(
      <SelectedSummaryFooter rows={ROWS} selectedIds={new Set(["bl_1"])} />,
    );
    expect(getByTestId("selected-count").textContent).toBe("1");
    expect(getByTestId("selected-total-ht").textContent).toBe("100,00");

    rerender(
      <SelectedSummaryFooter
        rows={ROWS}
        selectedIds={new Set(["bl_1", "bl_2", "bl_3"])}
      />,
    );
    expect(getByTestId("selected-count").textContent).toBe("3");
    expect(getByTestId("selected-total-ht").textContent).toBe("175,75");
    expect(getByTestId("selected-total-ttc").textContent).toBe("210,90");
  });
});
