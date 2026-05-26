// Detect "avoir" (credit note) candidates from legacy Heritage invoices.
// An invoice line/header counts as a credit note when at least one of the
// monetary totals is negative OR when the free-form label starts with
// "ANNULATION" or "RETOUR" (case-insensitive, accent-insensitive).
//
// Pure: no Convex context, no I/O — safe to call from both the import
// script and Convex mutations.

const CREDIT_NOTE_LABEL_PATTERN = /^(ANNULATION|RETOUR)\b/;

const normalizeLabel = (raw: string | null | undefined): string =>
  (raw ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

export type DetectCreditNoteInput = {
  total_ht: number;
  total_ttc: number;
  // Any free-form label that can carry "ANNULATION"/"RETOUR" markers — the
  // header comment, a product line description, etc. Caller can pass several.
  labels?: readonly (string | null | undefined)[];
};

export const detectCreditNote = ({
  total_ht,
  total_ttc,
  labels,
}: DetectCreditNoteInput): boolean => {
  if (total_ht < 0 || total_ttc < 0) return true;
  if (labels) {
    for (const raw of labels) {
      const norm = normalizeLabel(raw);
      if (norm && CREDIT_NOTE_LABEL_PATTERN.test(norm)) return true;
    }
  }
  return false;
};
