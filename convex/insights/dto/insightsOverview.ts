const round2 = (n: number): number => Math.round(n * 100) / 100;

export type InsightsOverviewDto = {
  total_clients: number;
  active_clients_12m: number;
  ca_12m_ht: number;
  ca_prev_12m_ht: number;
  growth_pct: number | null;
  avg_basket_ht: number | null;
  total_invoices_12m: number;
  oldest_data_year: number | null;
};

export const toInsightsOverviewDto = (input: {
  total_clients: number;
  active_client_ids_12m: ReadonlySet<string>;
  ca_12m_ht: number;
  ca_prev_12m_ht: number;
  total_invoices_12m: number;
  oldest_data_year: number | null;
}): InsightsOverviewDto => {
  const growthPct =
    input.ca_prev_12m_ht > 0
      ? round2(
          ((input.ca_12m_ht - input.ca_prev_12m_ht) / input.ca_prev_12m_ht) *
            100,
        )
      : null;
  const avgBasket =
    input.total_invoices_12m > 0
      ? round2(input.ca_12m_ht / input.total_invoices_12m)
      : null;
  return {
    total_clients: input.total_clients,
    active_clients_12m: input.active_client_ids_12m.size,
    ca_12m_ht: round2(input.ca_12m_ht),
    ca_prev_12m_ht: round2(input.ca_prev_12m_ht),
    growth_pct: growthPct,
    avg_basket_ht: avgBasket,
    total_invoices_12m: input.total_invoices_12m,
    oldest_data_year: input.oldest_data_year,
  };
};
