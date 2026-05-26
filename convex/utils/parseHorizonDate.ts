// Parse a Heritage-formatted date string ("DD/MM/YYYY", optionally space-padded)
// into a UTC epoch in milliseconds. Returns null on any malformed input.
// Anchored at 12:00 UTC to avoid local-timezone date drift in the UI.
export const parseHorizonDate = (
  raw: string | null | undefined,
): number | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const ts = Date.UTC(year, month - 1, day, 12, 0, 0, 0);
  const check = new Date(ts);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return ts;
};
