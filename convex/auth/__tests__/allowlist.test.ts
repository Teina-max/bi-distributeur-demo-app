import { describe, expect, test } from "vitest";
import { isAllowedEmail, POC_ALLOWLIST } from "@convex/auth/allowlist";

describe("isAllowedEmail", () => {
  test("returns true for exact-match allowlisted email", () => {
    expect(isAllowedEmail("marco@ladinguerie.fr")).toBe(true);
    expect(isAllowedEmail("teinateinauri@gmail.com")).toBe(true);
    expect(isAllowedEmail("operator@toscana.local")).toBe(true);
  });

  test("is case-insensitive", () => {
    expect(isAllowedEmail("MARCO@LADINGUERIE.FR")).toBe(true);
    expect(isAllowedEmail("Luca@LaDinguerie.Fr")).toBe(true);
    expect(isAllowedEmail("Maetiaore@Gmail.com")).toBe(true);
  });

  test("trims surrounding whitespace before lookup", () => {
    expect(isAllowedEmail("  marco@ladinguerie.fr  ")).toBe(true);
    expect(isAllowedEmail("\tteinateinauri@gmail.com\n")).toBe(true);
  });

  test("returns false for unknown email", () => {
    expect(isAllowedEmail("attacker@evil.com")).toBe(false);
    expect(isAllowedEmail("marco@example.com")).toBe(false);
  });

  test("returns false for null, undefined, or empty string", () => {
    expect(isAllowedEmail(null)).toBe(false);
    expect(isAllowedEmail(undefined)).toBe(false);
    expect(isAllowedEmail("")).toBe(false);
  });

  test("returns false for whitespace-only input", () => {
    expect(isAllowedEmail("   ")).toBe(false);
    expect(isAllowedEmail("\t\n")).toBe(false);
  });

  test("POC_ALLOWLIST contains the documented 8 entries", () => {
    expect(POC_ALLOWLIST.size).toBe(8);
  });
});
