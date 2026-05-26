import { describe, expect, test } from "vitest";
import { detectCreditNote } from "../detectCreditNote";

describe("detectCreditNote", () => {
  test("flags negative total_ht as credit note", () => {
    expect(detectCreditNote({ total_ht: -120, total_ttc: 0 })).toBe(true);
  });

  test("flags negative total_ttc as credit note", () => {
    expect(detectCreditNote({ total_ht: 0, total_ttc: -144 })).toBe(true);
  });

  test("flags labels starting with ANNULATION (case-insensitive)", () => {
    expect(
      detectCreditNote({
        total_ht: 100,
        total_ttc: 120,
        labels: ["annulation FACT.20110291 DU 09/02"],
      }),
    ).toBe(true);
  });

  test("flags labels starting with RETOUR (accent-insensitive)", () => {
    expect(
      detectCreditNote({
        total_ht: 100,
        total_ttc: 120,
        labels: ["Retour marchandise"],
      }),
    ).toBe(true);
  });

  test("ignores labels containing ANNULATION but not at start", () => {
    expect(
      detectCreditNote({
        total_ht: 100,
        total_ttc: 120,
        labels: ["fact x post-ANNULATION 2024"],
      }),
    ).toBe(false);
  });

  test("returns false for normal positive invoice", () => {
    expect(
      detectCreditNote({
        total_ht: 250,
        total_ttc: 300,
        labels: ["Exécutant: MARIE THE", "Carton de 20"],
      }),
    ).toBe(false);
  });

  test("returns false when labels undefined and totals positive/zero", () => {
    expect(detectCreditNote({ total_ht: 0, total_ttc: 0 })).toBe(false);
  });

  test("ignores null/undefined entries in labels array", () => {
    expect(
      detectCreditNote({
        total_ht: 10,
        total_ttc: 12,
        labels: [null, undefined, ""],
      }),
    ).toBe(false);
  });
});
