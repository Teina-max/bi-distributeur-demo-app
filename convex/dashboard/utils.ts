/**
 * Returns the UTC timestamp (ms) corresponding to 00:00 Europe/Paris of the
 * day containing `now`.
 *
 * POC approximation: assumes summer time (UTC+2). Acceptable for the May 2026
 * pilot. V1 should switch to a proper TZ library (date-fns-tz or Temporal).
 */
export const startOfDayParis = (now: number): number => {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now));
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  // Paris summer = UTC+2 → 00:00 Paris = 22:00 UTC the day before.
  return Date.UTC(year, month - 1, day, 0, 0, 0) - 2 * 3600 * 1000;
};
