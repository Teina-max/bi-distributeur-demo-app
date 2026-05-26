import { describe, expect, test } from "vitest";
import { TotalsPanel } from "@/routes/app/quotations/_components/totals-panel";
import { setup } from "@/test/setup";

const NBSP = " ";
const NNBSP = " ";
const stripNbsp = (s: string | null): string =>
  (s ?? "").split(NBSP).join(" ").split(NNBSP).join(" ");

describe("TotalsPanel", () => {
  test("renders one line per VAT rate + grand totals", () => {
    const { getByTestId, getAllByTestId } = setup(
      <TotalsPanel
        breakdown={{
          lines: [
            { vat_rate: 5.5, total_ht: 32, vat_amount: 1.76 },
            { vat_rate: 20, total_ht: 24.5, vat_amount: 4.9 },
          ],
          total_ht: 56.5,
          total_vat: 6.66,
          total_ttc: 63.16,
        }}
      />,
    );
    const vatLines = getAllByTestId(/^vat-line-/);
    expect(vatLines).toHaveLength(2);
    expect(stripNbsp(getByTestId("total-ht").textContent)).toMatch(
      /56,50\s?€/,
    );
    expect(stripNbsp(getByTestId("total-vat").textContent)).toMatch(
      /6,66\s?€/,
    );
    expect(stripNbsp(getByTestId("total-ttc").textContent)).toMatch(
      /63,16\s?€/,
    );
  });

  test("renders empty-state when no lines", () => {
    const { getByTestId, container } = setup(
      <TotalsPanel
        breakdown={{
          lines: [],
          total_ht: 0,
          total_vat: 0,
          total_ttc: 0,
        }}
      />,
    );
    expect(getByTestId("totals-panel")).toBeTruthy();
    expect(container.textContent).toContain("Aucune ligne");
  });
});
