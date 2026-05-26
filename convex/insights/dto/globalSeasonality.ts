const round2 = (n: number): number => Math.round(n * 100) / 100;

const MONTH_LABELS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

export type SeasonalityMonthDto = {
  month: number;
  label: string;
  avg_ca_ht: number;
  total_ca_ht: number;
  years_count: number;
};

export const toGlobalSeasonalityDto = (
  perMonth: Map<number, { total: number; years: Set<number> }>,
): SeasonalityMonthDto[] =>
  Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const acc = perMonth.get(month);
    const yearsCount = acc?.years.size ?? 0;
    const total = acc?.total ?? 0;
    return {
      month,
      label: MONTH_LABELS[i] ?? `M${month}`,
      avg_ca_ht: yearsCount > 0 ? round2(total / yearsCount) : 0,
      total_ca_ht: round2(total),
      years_count: yearsCount,
    };
  });
