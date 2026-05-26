import type { ClientStatus } from "@convex/utils/clientStatus";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export type ClientSegmentDto = {
  status: ClientStatus;
  count: number;
  ca_12m_ht: number;
  ca_total_ht: number;
  sample_names: string[];
};

type SegmentAcc = {
  count: number;
  ca_12m_ht: number;
  ca_total_ht: number;
  names: string[];
};

const STATUSES: readonly ClientStatus[] = [
  "top",
  "regular",
  "occasional",
  "dormant",
  "lost",
  "new",
] as const;

export const toClientSegmentsDto = (
  perStatus: Map<ClientStatus, SegmentAcc>,
): ClientSegmentDto[] =>
  STATUSES.map<ClientSegmentDto>((status) => {
    const acc = perStatus.get(status);
    if (!acc) {
      return {
        status,
        count: 0,
        ca_12m_ht: 0,
        ca_total_ht: 0,
        sample_names: [],
      };
    }
    return {
      status,
      count: acc.count,
      ca_12m_ht: round2(acc.ca_12m_ht),
      ca_total_ht: round2(acc.ca_total_ht),
      sample_names: acc.names.slice(0, 3),
    };
  });
