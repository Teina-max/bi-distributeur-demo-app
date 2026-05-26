const round2 = (n: number): number => Math.round(n * 100) / 100;

export type RevenueTimelineMonth = {
  year: number;
  month: number;
  ca_ht: number;
  invoice_count: number;
  active_clients: number;
};

export type RevenueTimelineArchiveYear = {
  year: number;
  ca_ht: number;
  invoice_count: number;
};

export type RevenueTimelineDto = {
  monthly: RevenueTimelineMonth[];
  archive: RevenueTimelineArchiveYear[];
};

export const toRevenueTimelineDto = ({
  monthly,
  archive,
}: {
  monthly: Map<
    string,
    {
      year: number;
      month: number;
      ca_ht: number;
      invoice_count: number;
      client_ids: Set<string>;
    }
  >;
  archive: Map<number, { ca_ht: number; invoice_count: number }>;
}): RevenueTimelineDto => ({
  monthly: [...monthly.values()]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map<RevenueTimelineMonth>((entry) => ({
      year: entry.year,
      month: entry.month,
      ca_ht: round2(entry.ca_ht),
      invoice_count: entry.invoice_count,
      active_clients: entry.client_ids.size,
    })),
  archive: [...archive.entries()]
    .sort((a, b) => a[0] - b[0])
    .map<RevenueTimelineArchiveYear>(([year, acc]) => ({
      year,
      ca_ht: round2(acc.ca_ht),
      invoice_count: acc.invoice_count,
    })),
});
