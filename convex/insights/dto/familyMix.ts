const round2 = (n: number): number => Math.round(n * 100) / 100;

export type FamilyMixEntry = {
  family_code: string;
  family_name: string | null;
  ca_ht: number;
  qty_sold: number;
  share_pct: number;
  product_count: number;
};

export type FamilyMixDto = {
  total_ca_ht: number;
  months_back: number;
  entries: FamilyMixEntry[];
};

export const toFamilyMixDto = ({
  perFamily,
  familyNames,
  monthsBack,
}: {
  perFamily: Map<
    string,
    { ca_ht: number; qty_sold: number; product_ids: Set<string> }
  >;
  familyNames: ReadonlyMap<string, string>;
  monthsBack: number;
}): FamilyMixDto => {
  let total = 0;
  for (const acc of perFamily.values()) total += acc.ca_ht;
  const entries: FamilyMixEntry[] = [...perFamily.entries()]
    .map(([family_code, acc]) => ({
      family_code,
      family_name: familyNames.get(family_code) ?? null,
      ca_ht: round2(acc.ca_ht),
      qty_sold: round2(acc.qty_sold),
      share_pct: total > 0 ? round2((acc.ca_ht / total) * 100) : 0,
      product_count: acc.product_ids.size,
    }))
    .sort((a, b) => b.ca_ht - a.ca_ht);
  return {
    total_ca_ht: round2(total),
    months_back: monthsBack,
    entries,
  };
};
