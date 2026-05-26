import { describe, expect, test } from "vitest";
import {
  formatEUR,
  formatQuantity,
  formatVatRate,
} from "@/features/quotations/format-amount";

// Replace NBSP (U+00A0) and NARROW NBSP (U+202F) with regular space for
// readable assertions across Node 18/20+ Intl outputs.
const NBSP = " ";
const NNBSP = " ";
const STRIP_NBSP = (s: string): string =>
  s.split(NBSP).join(" ").split(NNBSP).join(" ");

describe("formatEUR", () => {
  test("formats a number with 2 decimals + euro sign + FR separator", () => {
    expect(STRIP_NBSP(formatEUR(1234.5))).toBe("1 234,50 €");
    expect(STRIP_NBSP(formatEUR(0))).toBe("0,00 €");
    expect(STRIP_NBSP(formatEUR(99.99))).toBe("99,99 €");
  });
});

describe("formatQuantity", () => {
  test("renders integer quantity without trailing zeros", () => {
    expect(formatQuantity(5)).toBe("5");
    expect(STRIP_NBSP(formatQuantity(1500))).toBe("1 500");
  });
});

describe("formatVatRate", () => {
  test("renders vat rate FR-locale with percent sign", () => {
    expect(STRIP_NBSP(formatVatRate(20))).toBe("20,0 %");
    expect(STRIP_NBSP(formatVatRate(5.5))).toBe("5,5 %");
  });
});
