import { describe, expect, test } from "vitest";
import { matchesTokens } from "@/features/search/match-tokens";

describe("matchesTokens (client)", () => {
  test("returns true when every query token is a prefix of any doc token", () => {
    expect(matchesTokens(["bar du port", "C001234"], "bar du po")).toBe(true);
  });

  test("returns false when one query token has no prefix match", () => {
    expect(matchesTokens(["café toscano"], "the")).toBe(false);
  });

  test("is case and accent insensitive on query side", () => {
    expect(matchesTokens(["bar du port"], "BÀR")).toBe(true);
  });

  test("empty query returns false (no implicit match)", () => {
    expect(matchesTokens(["anything"], "")).toBe(false);
  });

  test("doc tokens can come from concatenated label", () => {
    expect(matchesTokens(["Nouveau devis"], "dev")).toBe(true);
    expect(matchesTokens(["Liste BL"], "bl")).toBe(true);
  });
});
