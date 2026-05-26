import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatEUR, formatVatRate } from "@/features/quotations/format-amount";

export type VatBreakdownLine = {
  vat_rate: number;
  total_ht: number;
  vat_amount: number;
};

export type VatBreakdown = {
  lines: readonly VatBreakdownLine[];
  total_ht: number;
  total_vat: number;
  total_ttc: number;
};

type Props = {
  breakdown: VatBreakdown;
};

export function TotalsPanel({ breakdown }: Props) {
  return (
    <Card data-testid="totals-panel" className="py-3">
      <CardContent className="flex flex-col gap-2 px-4">
        {breakdown.lines.length === 0 ? (
          <div className="text-muted-foreground font-mono text-[13px]">
            Aucune ligne
          </div>
        ) : (
          breakdown.lines.map((line) => (
            <div
              key={line.vat_rate}
              className="flex justify-between gap-4 font-mono text-[13px] tabular-nums"
              data-testid={`vat-line-${line.vat_rate}`}
            >
              <span>TVA {formatVatRate(line.vat_rate)}</span>
              <span>HT {formatEUR(line.total_ht)}</span>
              <span>TVA {formatEUR(line.vat_amount)}</span>
            </div>
          ))
        )}
        <Separator className="my-1" />
        <div className="flex justify-between gap-4 font-mono text-[13px] font-semibold tabular-nums">
          <span>Total</span>
          <span data-testid="total-ht">HT {formatEUR(breakdown.total_ht)}</span>
          <span data-testid="total-vat">
            TVA {formatEUR(breakdown.total_vat)}
          </span>
          <span data-testid="total-ttc">
            TTC {formatEUR(breakdown.total_ttc)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
