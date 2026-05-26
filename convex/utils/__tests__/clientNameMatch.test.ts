import { describe, expect, test } from "vitest";
import {
  normalizeClientName,
  strictKeyClientName,
  buildClientNameIndex,
  resolveClientCodeByName,
} from "../clientNameMatch";

describe("normalizeClientName", () => {
  test("strips diacritics and uppercases", () => {
    expect(normalizeClientName("Café Bélaïca")).toBe("CAFE BELAICA");
  });

  test("collapses runs of whitespace", () => {
    expect(normalizeClientName("  Bistro   Bay  ")).toBe("BISTRO BAY");
  });
});

describe("strictKeyClientName", () => {
  test("removes legal suffixes and sorts tokens", () => {
    expect(strictKeyClientName("BISTRO BAY SARL")).toBe("BAY BISTRO");
    expect(strictKeyClientName("SARL BISTRO BAY")).toBe("BAY BISTRO");
  });

  test("normalizes punctuation variants to the same key", () => {
    expect(strictKeyClientName("Bistro-Bay (SARL)")).toBe(
      strictKeyClientName("BISTRO BAY SARL"),
    );
  });

  test("returns empty string when nothing remains", () => {
    expect(strictKeyClientName("   ")).toBe("");
  });
});

describe("buildClientNameIndex + resolveClientCodeByName", () => {
  const idx = buildClientNameIndex([
    { code: "C001", name: "Bistro Bay SARL" },
    { code: "C002", name: "Café de la Plage" },
    { code: "C003", name: "HOTEL DES PINS" },
  ]);

  test("resolves via exact normalized name", () => {
    expect(resolveClientCodeByName(idx, "Cafe De La Plage")).toBe("C002");
  });

  test("resolves via strict key when exact misses", () => {
    expect(resolveClientCodeByName(idx, "SARL Bistro Bay")).toBe("C001");
  });

  test("returns null when no candidate matches", () => {
    expect(resolveClientCodeByName(idx, "Restaurant Inconnu")).toBeNull();
  });

  test("ignores empty rows when building the index", () => {
    const empty = buildClientNameIndex([
      { code: "", name: "Skip" },
      { code: "C9", name: "" },
    ]);
    expect(resolveClientCodeByName(empty, "Skip")).toBeNull();
  });
});
