import { describe, expect, test } from "vitest";
import {
  formatDateFR,
  todayParisTimestamp,
  addDays,
  yearTwoDigits,
} from "../dateFns";

describe("formatDateFR", () => {
  test("formats UTC ms to DD/MM/YYYY", () => {
    const utc = Date.UTC(2026, 4, 17, 22, 0, 0); // 17 mai 2026 22h UTC = 18 mai 00h Paris
    expect(formatDateFR(utc)).toBe("18/05/2026");
  });
});

describe("addDays", () => {
  test("adds days preserving wall time", () => {
    const start = Date.UTC(2026, 4, 17, 12, 0, 0);
    expect(addDays(start, 30)).toBe(Date.UTC(2026, 5, 16, 12, 0, 0));
  });
});

describe("yearTwoDigits", () => {
  test("returns last 2 digits of year", () => {
    expect(yearTwoDigits(Date.UTC(2026, 0, 1, 12, 0, 0))).toBe("26");
    expect(yearTwoDigits(Date.UTC(2099, 0, 1, 12, 0, 0))).toBe("99");
  });
});

describe("todayParisTimestamp", () => {
  test("returns a positive ms timestamp", () => {
    const value = todayParisTimestamp();
    expect(typeof value).toBe("number");
    expect(value).toBeGreaterThan(0);
  });
});
