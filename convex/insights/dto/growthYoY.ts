import type { Id } from "@convex/_generated/dataModel";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export type GrowthRow = {
  client_id: Id<"clients">;
  code: string;
  name: string;
  ca_current: number;
  ca_prev: number;
  growth_abs: number;
  growth_pct: number | null;
};

export type GrowthYoYDto = {
  year: number;
  prev_year: number;
  top_growers: GrowthRow[];
  top_decliners: GrowthRow[];
};

export type GrowthSourceRow = {
  client_id: Id<"clients">;
  code: string;
  name: string;
  ca_current: number;
  ca_prev: number;
};

const computeGrowth = (row: GrowthSourceRow): GrowthRow => {
  const abs = row.ca_current - row.ca_prev;
  const pct = row.ca_prev > 0 ? round2((abs / row.ca_prev) * 100) : null;
  return {
    client_id: row.client_id,
    code: row.code,
    name: row.name,
    ca_current: round2(row.ca_current),
    ca_prev: round2(row.ca_prev),
    growth_abs: round2(abs),
    growth_pct: pct,
  };
};

export const toGrowthYoYDto = ({
  year,
  prevYear,
  rows,
  limit = 10,
}: {
  year: number;
  prevYear: number;
  rows: GrowthSourceRow[];
  limit?: number;
}): GrowthYoYDto => {
  const enriched = rows.map(computeGrowth);
  const meaningful = enriched.filter((r) => r.ca_current > 0 || r.ca_prev > 0);
  const sortedByAbs = [...meaningful].sort(
    (a, b) => b.growth_abs - a.growth_abs,
  );
  return {
    year,
    prev_year: prevYear,
    top_growers: sortedByAbs.slice(0, limit),
    top_decliners: [...sortedByAbs].reverse().slice(0, limit),
  };
};
