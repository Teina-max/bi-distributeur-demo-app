const TIMEZONE = "Europe/Paris";

const parisParts = (ms: number): Record<string, string> => {
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date(ms));
  const result: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") result[part.type] = part.value;
  }
  return result;
};

export const formatDateFR = (ms: number): string => {
  const parts = parisParts(ms);
  return `${parts.day}/${parts.month}/${parts.year}`;
};

export const yearTwoDigits = (ms: number): string =>
  parisParts(ms).year.slice(-2);

export const addDays = (ms: number, days: number): number =>
  ms + days * 86_400_000;

export const todayParisTimestamp = (): number => Date.now();
