// Client name normalization helpers shared by the import scripts and
// any Convex-side matching logic that needs to resolve a Heritage raw
// client name to a canonical key.
//
// Mirrors the heuristics used by
// `scripts/import-heritage/enrich-with-client-code.ts` so that we don't
// drift between the ETL pass and the legacy archive aggregation pass.
//
// Pure: no Convex context, no I/O.

const DIACRITICS = /[̀-ͯ]/g;
const LEGAL_SUFFIX =
  /\b(SAS|SARL|EURL|SA|EI|SCI|SASU|SCP|SCM|SNC|GIE|GFA|S\.A\.|S\.A\.R\.L\.)\b/g;
const PUNCT = /[.,'"()\-_/]/g;
const WHITESPACE = /\s+/g;

// Loose normalization: NFKD, strip diacritics, collapse whitespace, uppercase.
// Used for exact-name matches.
export const normalizeClientName = (raw: string): string =>
  raw
    .normalize("NFKD")
    .replace(DIACRITICS, "")
    .replace(WHITESPACE, " ")
    .trim()
    .toUpperCase();

// Strict key: strip legal suffixes ("SAS", "SARL", "EURL"...) + punctuation,
// then sort tokens alphabetically. Helps fold "BISTRO BAY SARL" /
// "SARL BISTRO BAY" / "Bistro-Bay (SARL)" onto the same bucket.
export const strictKeyClientName = (raw: string): string => {
  const base = normalizeClientName(raw)
    .replace(LEGAL_SUFFIX, " ")
    .replace(PUNCT, " ")
    .replace(WHITESPACE, " ")
    .trim();
  if (!base) return "";
  return base.split(" ").filter(Boolean).sort().join(" ");
};

export type ClientNameIndex = {
  byName: Map<string, string>;
  byStrict: Map<string, string>;
};

// Build a name index over a list of {code, name} entries. Useful when the
// caller has loaded the full clients catalog once and wants to resolve
// many raw Heritage names against it.
export const buildClientNameIndex = (
  rows: readonly { code: string; name: string }[],
): ClientNameIndex => {
  const byName = new Map<string, string>();
  const byStrict = new Map<string, string>();
  for (const row of rows) {
    if (!row.code || !row.name) continue;
    const k = normalizeClientName(row.name);
    if (k && !byName.has(k)) byName.set(k, row.code);
    const s = strictKeyClientName(row.name);
    if (s && !byStrict.has(s)) byStrict.set(s, row.code);
  }
  return { byName, byStrict };
};

// Try exact then strict. Returns null when neither matches.
export const resolveClientCodeByName = (
  idx: ClientNameIndex,
  rawName: string,
): string | null => {
  const k = normalizeClientName(rawName);
  if (k && idx.byName.has(k)) return idx.byName.get(k) ?? null;
  const s = strictKeyClientName(rawName);
  if (s && idx.byStrict.has(s)) return idx.byStrict.get(s) ?? null;
  return null;
};
