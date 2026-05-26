import { describe, expect, test } from "vitest";
import { startOfDayParis } from "../utils";

describe("startOfDayParis", () => {
  test("returns 00:00 Paris (UTC+2) for a mid-afternoon timestamp", () => {
    // 2026-05-18 14:30:00 Paris = 12:30:00 UTC
    const now = Date.UTC(2026, 4, 18, 12, 30, 0);
    const result = startOfDayParis(now);
    // 2026-05-18 00:00 Paris = 2026-05-17 22:00 UTC
    expect(result).toBe(Date.UTC(2026, 4, 17, 22, 0, 0));
  });

  test("returns the same start for two timestamps in the same Paris day", () => {
    const morning = Date.UTC(2026, 4, 18, 6, 0, 0); // 08:00 Paris
    const evening = Date.UTC(2026, 4, 18, 20, 0, 0); // 22:00 Paris
    expect(startOfDayParis(morning)).toBe(startOfDayParis(evening));
  });

  test("returns different starts for consecutive Paris days", () => {
    const day1 = Date.UTC(2026, 4, 18, 12, 0, 0);
    const day2 = Date.UTC(2026, 4, 19, 12, 0, 0);
    const diff = startOfDayParis(day2) - startOfDayParis(day1);
    expect(diff).toBe(24 * 3600 * 1000);
  });

  test("a timestamp at 23:00 UTC = 01:00 next Paris day, rolls to that day", () => {
    // 2026-05-18 23:00 UTC = 2026-05-19 01:00 Paris (summer +2)
    const ts = Date.UTC(2026, 4, 18, 23, 0, 0);
    expect(startOfDayParis(ts)).toBe(Date.UTC(2026, 4, 18, 22, 0, 0));
  });
});
