import { describe, expect, test } from "vitest";
import { parseHorizonDate } from "../parseHorizonDate";

describe("parseHorizonDate", () => {
  test("parses DD/MM/YYYY anchored at UTC noon", () => {
    expect(parseHorizonDate("03/01/2011")).toBe(
      Date.UTC(2011, 0, 3, 12, 0, 0, 0),
    );
  });

  test("trims surrounding whitespace from Heritage-padded fields", () => {
    expect(parseHorizonDate("  29/10/2012 ")).toBe(
      Date.UTC(2012, 9, 29, 12, 0, 0, 0),
    );
  });

  test("rejects impossible months and days", () => {
    expect(parseHorizonDate("32/13/2011")).toBeNull();
    expect(parseHorizonDate("31/02/2011")).toBeNull();
    expect(parseHorizonDate("00/01/2011")).toBeNull();
  });

  test("rejects empty / nullish / malformed", () => {
    expect(parseHorizonDate("")).toBeNull();
    expect(parseHorizonDate(null)).toBeNull();
    expect(parseHorizonDate(undefined)).toBeNull();
    expect(parseHorizonDate("2011-01-03")).toBeNull();
    expect(parseHorizonDate("3/1/2011")).toBeNull();
  });
});
