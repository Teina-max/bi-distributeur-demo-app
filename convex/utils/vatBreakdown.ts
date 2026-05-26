type Line = {
  quantity: number;
  unit_price_ht: number;
  vat_rate: number;
};

type VatLine = {
  vat_rate: number;
  total_ht: number;
  vat_amount: number;
};

type VatBreakdown = {
  lines: VatLine[];
  total_ht: number;
  total_vat: number;
  total_ttc: number;
};

const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const computeVatBreakdown = (lines: readonly Line[]): VatBreakdown => {
  const byRate = new Map<number, number>();
  for (const line of lines) {
    const current = byRate.get(line.vat_rate) ?? 0;
    byRate.set(line.vat_rate, current + line.quantity * line.unit_price_ht);
  }
  const groupedLines = Array.from(byRate.entries())
    .sort(([a], [b]) => a - b)
    .map<VatLine>(([vat_rate, total_ht]) => ({
      vat_rate,
      total_ht: round2(total_ht),
      vat_amount: round2(total_ht * (vat_rate / 100)),
    }));
  const total_ht = round2(
    groupedLines.reduce((acc, line) => acc + line.total_ht, 0),
  );
  const total_vat = round2(
    groupedLines.reduce((acc, line) => acc + line.vat_amount, 0),
  );
  return {
    lines: groupedLines,
    total_ht,
    total_vat,
    total_ttc: round2(total_ht + total_vat),
  };
};
