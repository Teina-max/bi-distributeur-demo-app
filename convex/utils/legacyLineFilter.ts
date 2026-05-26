// Defensive filter for legacy_document_lines bulk insert.
// Heritage exports interleave article rows with comment / annotation rows
// that share the same CSV structure but carry an empty article code.
// Examples: "Exécutant: MARIE THE", "EXPEDIE PAR SATELITE", "BON N°...",
// "ANNULATION FACT.20110291", "RETOUR MARCHANDISE", "Carton de 20".
//
// The orchestrator already skips them at parse time, but we keep a
// belt-and-suspenders filter at the Convex boundary so that any future
// caller (re-import script, manual mutation, internal tooling) cannot
// accidentally pollute the table with rows that have no business value.

export type LegacyLineSignal = {
  product_legacy_code: string;
  quantity: number;
  unit_price_ttc: number;
  unit_cost_pmp: number;
  line_total_ht: number;
};

// A row is "comment-like" iff every signal is empty/zero. We are intentionally
// strict: as long as a non-coded row carries any monetary value or quantity,
// we keep it (could still be a manual adjustment worth tracking).
export const isCommentLikeLine = (row: LegacyLineSignal): boolean =>
  row.product_legacy_code.trim() === "" &&
  row.quantity === 0 &&
  row.unit_price_ttc === 0 &&
  row.unit_cost_pmp === 0 &&
  row.line_total_ht === 0;
