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

export type ClientSeasonalMonth = {
  month: number;
  label: string;
  avg_ca_ht: number;
  total_ca_ht: number;
  years_count: number;
  peak: boolean;
};

export type ClientPersonalSeasonalityDto = {
  months: ClientSeasonalMonth[];
  years_observed: number;
  peak_month: number | null;
  low_month: number | null;
};

export const toClientSeasonalityDto = (
  perMonth: Map<number, { total: number; years: Set<number> }>,
): ClientPersonalSeasonalityDto => {
  const months: ClientSeasonalMonth[] = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const acc = perMonth.get(month);
    const years = acc?.years.size ?? 0;
    const total = acc?.total ?? 0;
    return {
      month,
      label: MONTH_LABELS[i] ?? `M${month}`,
      avg_ca_ht: years > 0 ? round2(total / years) : 0,
      total_ca_ht: round2(total),
      years_count: years,
      peak: false,
    };
  });
  const activeMonths = months.filter((m) => m.avg_ca_ht > 0);
  if (activeMonths.length > 0) {
    const max = Math.max(...activeMonths.map((m) => m.avg_ca_ht));
    const min = Math.min(...activeMonths.map((m) => m.avg_ca_ht));
    months.forEach((m) => {
      if (m.avg_ca_ht === max) m.peak = true;
    });
    const peak = months.find((m) => m.avg_ca_ht === max)?.month ?? null;
    const low =
      activeMonths.length > 1
        ? (months.find((m) => m.avg_ca_ht === min)?.month ?? null)
        : null;
    const yearsObserved = Math.max(...months.map((m) => m.years_count));
    return {
      months,
      years_observed: yearsObserved,
      peak_month: peak,
      low_month: low,
    };
  }
  return { months, years_observed: 0, peak_month: null, low_month: null };
};
