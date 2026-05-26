import { describe, expect, test } from "vitest";
import { formatDocumentNumber } from "../numbering";

describe("formatDocumentNumber", () => {
  test("formats a quotation number with D prefix and 4-digit pad", () => {
    expect(formatDocumentNumber("quotation", "26", 1)).toBe("D26-0001");
    expect(formatDocumentNumber("quotation", "26", 142)).toBe("D26-0142");
  });

  test("formats a delivery_form number with B prefix", () => {
    expect(formatDocumentNumber("delivery_form", "26", 89)).toBe("B26-0089");
  });

  test("formats an invoice number with F prefix", () => {
    expect(formatDocumentNumber("invoice", "26", 67)).toBe("F26-0067");
  });

  test("formats a purchase_order number with BC prefix", () => {
    expect(formatDocumentNumber("purchase_order", "26", 12)).toBe("BC26-0012");
  });

  test("pads to 4 digits", () => {
    expect(formatDocumentNumber("quotation", "26", 9999)).toBe("D26-9999");
    expect(formatDocumentNumber("quotation", "27", 0)).toBe("D27-0000");
  });

  test("works with arbitrary year_prefix", () => {
    expect(formatDocumentNumber("invoice", "30", 5)).toBe("F30-0005");
  });
});
