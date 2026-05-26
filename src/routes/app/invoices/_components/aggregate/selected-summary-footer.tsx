import { Typography } from "@/components/nowts/typography";
import type { DeliveryFormInvoiceableDto } from "@convex/delivery_forms/dto/deliveryFormInvoiceable";

type Props = {
  rows: readonly DeliveryFormInvoiceableDto[];
  selectedIds: ReadonlySet<string>;
};

function formatAmount(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function SelectedSummaryFooter({ rows, selectedIds }: Props) {
  const selected = rows.filter((r) => selectedIds.has(r.id as string));
  const count = selected.length;
  const totalHt = selected.reduce((acc, r) => acc + r.total_ht, 0);
  const totalTtc = selected.reduce((acc, r) => acc + r.total_ttc, 0);

  return (
    <div
      className="border-border bg-muted/30 flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2"
      data-testid="selected-summary-footer"
    >
      <Typography variant="muted" className="font-mono text-[13px]">
        <span data-testid="selected-count">{count}</span>
        {" BL "}
        {count > 1 ? "sélectionnés" : "sélectionné"}
      </Typography>
      <div className="flex flex-wrap items-center gap-6">
        <Typography variant="muted" className="font-mono text-[13px] tabular-nums">
          Total HT :{" "}
          <span data-testid="selected-total-ht">{formatAmount(totalHt)}</span> €
        </Typography>
        <Typography variant="large" className="font-mono text-[13px] tabular-nums">
          Total TTC :{" "}
          <span data-testid="selected-total-ttc">{formatAmount(totalTtc)}</span>{" "}
          €
        </Typography>
      </div>
    </div>
  );
}
