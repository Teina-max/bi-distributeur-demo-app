import type { Doc, Id } from "@convex/_generated/dataModel";

export type ClientProductMixTopItem = {
  product_id: Id<"products"> | null;
  code: string;
  name: string;
  family_code: string | null;
  total_qty: number;
  total_ht: number;
  avg_unit_price_ttc: number;
  last_purchase_at: number;
  purchase_count: number;
};

export type ClientProductMixFamily = {
  family_code: string;
  ca_ht: number;
  share_pct: number;
};

export type ClientProductMixDto = {
  top_products: ClientProductMixTopItem[];
  family_breakdown: ClientProductMixFamily[];
  total_ca_ht: number;
  months_back: number;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

type ProductAcc = {
  product_id: Id<"products"> | null;
  code: string;
  name: string;
  total_qty: number;
  total_ht: number;
  weighted_unit_ttc: number;
  total_qty_for_avg: number;
  last_purchase_at: number;
  purchase_count: number;
};

export const toClientProductMixDto = ({
  lines,
  productsById,
  monthsBack,
}: {
  lines: readonly Doc<"legacy_document_lines">[];
  productsById: ReadonlyMap<string, Doc<"products">>;
  monthsBack: number;
}): ClientProductMixDto => {
  const productAcc = new Map<string, ProductAcc>();
  const familyAcc = new Map<string, number>();
  let totalCaHt = 0;

  for (const line of lines) {
    if (line.document_kind !== "invoice") continue;
    if (!line.product_legacy_code) continue;
    const key = line.product_id ?? `code:${line.product_legacy_code}`;
    let entry = productAcc.get(key);
    if (!entry) {
      entry = {
        product_id: line.product_id,
        code: line.product_legacy_code,
        name: line.product_legacy_name,
        total_qty: 0,
        total_ht: 0,
        weighted_unit_ttc: 0,
        total_qty_for_avg: 0,
        last_purchase_at: 0,
        purchase_count: 0,
      };
      productAcc.set(key, entry);
    }
    entry.total_qty += line.quantity;
    entry.total_ht += line.line_total_ht;
    if (line.quantity > 0) {
      entry.weighted_unit_ttc += line.unit_price_ttc * line.quantity;
      entry.total_qty_for_avg += line.quantity;
    }
    if (line.document_date > entry.last_purchase_at) {
      entry.last_purchase_at = line.document_date;
    }
    entry.purchase_count++;
    totalCaHt += line.line_total_ht;

    const product = line.product_id
      ? productsById.get(line.product_id)
      : undefined;
    const familyCode = product?.family_code ?? "_INCONNU";
    familyAcc.set(
      familyCode,
      (familyAcc.get(familyCode) ?? 0) + line.line_total_ht,
    );
  }

  const topProducts: ClientProductMixTopItem[] = [...productAcc.values()]
    .sort((a, b) => b.total_ht - a.total_ht)
    .slice(0, 10)
    .map((acc) => {
      const product = acc.product_id
        ? productsById.get(acc.product_id)
        : undefined;
      return {
        product_id: acc.product_id,
        code: acc.code,
        name: acc.name,
        family_code: product?.family_code ?? null,
        total_qty: round2(acc.total_qty),
        total_ht: round2(acc.total_ht),
        avg_unit_price_ttc:
          acc.total_qty_for_avg > 0
            ? round2(acc.weighted_unit_ttc / acc.total_qty_for_avg)
            : 0,
        last_purchase_at: acc.last_purchase_at,
        purchase_count: acc.purchase_count,
      };
    });

  const familyBreakdown: ClientProductMixFamily[] = [...familyAcc.entries()]
    .map(([family_code, ca_ht]) => ({
      family_code,
      ca_ht: round2(ca_ht),
      share_pct: totalCaHt > 0 ? round2((ca_ht / totalCaHt) * 100) : 0,
    }))
    .sort((a, b) => b.ca_ht - a.ca_ht);

  return {
    top_products: topProducts,
    family_breakdown: familyBreakdown,
    total_ca_ht: round2(totalCaHt),
    months_back: monthsBack,
  };
};
