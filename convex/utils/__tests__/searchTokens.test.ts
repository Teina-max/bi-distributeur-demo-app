import { describe, expect, test } from "vitest";
import { buildSearchTokens, matchesTokens } from "../searchTokens";

describe("buildSearchTokens", () => {
  test("normalize accents and casing", () => {
    expect(buildSearchTokens("Café Toscano Classico")).toEqual([
      "cafe",
      "toscano",
      "classico",
    ]);
  });

  test("includes product code as-is lowercased", () => {
    expect(buildSearchTokens("CAF-001-1KG")).toContain("caf-001-1kg");
  });

  test("dedupes tokens", () => {
    expect(buildSearchTokens("café CAFÉ")).toEqual(["cafe"]);
  });

  test("returns empty array for empty input", () => {
    expect(buildSearchTokens("")).toEqual([]);
  });
});

describe("matchesTokens", () => {
  test("returns true when every query token is a prefix of any doc token", () => {
    expect(matchesTokens(["bar du port", "C001234"], "bar du po")).toBe(true);
  });

  test("returns false when one query token has no prefix match", () => {
    expect(matchesTokens(["café toscano"], "thé")).toBe(false);
  });

  test("is case and accent insensitive on query side", () => {
    expect(matchesTokens(["bar du port"], "BÀR")).toBe(true);
  });
});
