import { describe, expect, test } from "vitest";
import {
  assertConvertibleQuotationStatus,
  assertInvoiceableDeliveryFormStatus,
  assertSufficientStock,
  computeDueDateMs,
  currentYearPrefix,
} from "../conversionHelpers";

describe("assertConvertibleQuotationStatus", () => {
  test("accepts draft, sent, accepted", () => {
    expect(() => assertConvertibleQuotationStatus("draft")).not.toThrow();
    expect(() => assertConvertibleQuotationStatus("sent")).not.toThrow();
    expect(() => assertConvertibleQuotationStatus("accepted")).not.toThrow();
  });

  test("throws exactly 'Devis déjà converti' when already converted", () => {
    expect(() =>
      assertConvertibleQuotationStatus("converted_to_delivery"),
    ).toThrow("Devis déjà converti");
  });

  test("throws on cancelled", () => {
    expect(() => assertConvertibleQuotationStatus("cancelled")).toThrow(
      /Statut devis incompatible/,
    );
  });
});

describe("assertInvoiceableDeliveryFormStatus", () => {
  test("accepts delivered", () => {
    expect(() =>
      assertInvoiceableDeliveryFormStatus("delivered"),
    ).not.toThrow();
  });

  test("throws 'BL déjà facturé' when invoiced", () => {
    expect(() => assertInvoiceableDeliveryFormStatus("invoiced")).toThrow(
      "BL déjà facturé",
    );
  });

  test("throws on in_preparation", () => {
    expect(() => assertInvoiceableDeliveryFormStatus("in_preparation")).toThrow(
      /Statut BL incompatible/,
    );
  });

  test("throws on ready_to_ship", () => {
    expect(() => assertInvoiceableDeliveryFormStatus("ready_to_ship")).toThrow(
      /Statut BL incompatible/,
    );
  });

  test("throws on shipped (must reach delivered first)", () => {
    expect(() => assertInvoiceableDeliveryFormStatus("shipped")).toThrow(
      /Statut BL incompatible/,
    );
  });

  test("throws on cancelled", () => {
    expect(() => assertInvoiceableDeliveryFormStatus("cancelled")).toThrow(
      /Statut BL incompatible/,
    );
  });
});

describe("assertSufficientStock", () => {
  test("ok when every line has enough stock", () => {
    expect(() =>
      assertSufficientStock([
        { product_code: "A", quantity: 5, current_stock: 100 },
        { product_code: "B", quantity: 2, current_stock: 2 },
      ]),
    ).not.toThrow();
  });

  test("throws with exact code+dispo+demande on first insufficient line", () => {
    expect(() =>
      assertSufficientStock([
        { product_code: "CAF-001", quantity: 5, current_stock: 100 },
        { product_code: "CAF-002", quantity: 10, current_stock: 1 },
        { product_code: "ACC-003", quantity: 3, current_stock: 0 },
      ]),
    ).toThrow("Stock insuffisant: CAF-002 (dispo: 1, demandé: 10)");
  });

  test("throws on first line if insufficient", () => {
    expect(() =>
      assertSufficientStock([
        { product_code: "X", quantity: 9999, current_stock: 5 },
      ]),
    ).toThrow("Stock insuffisant: X (dispo: 5, demandé: 9999)");
  });
});

describe("computeDueDateMs", () => {
  test("adds payment_terms_days * 86_400_000", () => {
    const creation = 1_700_000_000_000;
    expect(computeDueDateMs(creation, 30)).toBe(creation + 30 * 86_400_000);
    expect(computeDueDateMs(creation, 0)).toBe(creation);
  });
});

describe("currentYearPrefix", () => {
  test("2-digit Paris year", () => {
    const jan1_2026 = Date.UTC(2026, 0, 1);
    expect(currentYearPrefix(jan1_2026)).toBe("26");
    const jan1_2030 = Date.UTC(2030, 0, 1);
    expect(currentYearPrefix(jan1_2030)).toBe("30");
    const jan1_2099 = Date.UTC(2099, 0, 1);
    expect(currentYearPrefix(jan1_2099)).toBe("99");
  });

  test("uses Europe/Paris timezone at year boundary", () => {
    // 2026-12-31 23:30 UTC = 2027-01-01 00:30 Paris → year is 27
    const newYearParis = Date.UTC(2026, 11, 31, 23, 30);
    expect(currentYearPrefix(newYearParis)).toBe("27");
    // 2026-12-31 22:30 UTC = 2026-12-31 23:30 Paris → year is still 26
    const lastHour2026 = Date.UTC(2026, 11, 31, 22, 30);
    expect(currentYearPrefix(lastHour2026)).toBe("26");
  });
});
