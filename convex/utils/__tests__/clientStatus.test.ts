import { describe, expect, test } from "vitest";
import { computeClientStatus } from "../clientStatus";

const NOW = Date.UTC(2026, 4, 22, 12, 0, 0);
const days = (n: number): number => NOW - n * 24 * 60 * 60 * 1000;

describe("computeClientStatus", () => {
  test("returns 'new' when total_invoices is 0", () => {
    expect(
      computeClientStatus({
        last_invoice_at: null,
        ca_12m_ht: 0,
        total_invoices: 0,
        now: NOW,
      }),
    ).toBe("new");
  });

  test("returns 'top' when ca_12m_ht >= 5000 and recent", () => {
    expect(
      computeClientStatus({
        last_invoice_at: days(30),
        ca_12m_ht: 12000,
        total_invoices: 50,
        now: NOW,
      }),
    ).toBe("top");
  });

  test("returns 'regular' when last buy <= 90 days", () => {
    expect(
      computeClientStatus({
        last_invoice_at: days(45),
        ca_12m_ht: 1500,
        total_invoices: 12,
        now: NOW,
      }),
    ).toBe("regular");
  });

  test("returns 'occasional' when 90 < days <= 180", () => {
    expect(
      computeClientStatus({
        last_invoice_at: days(150),
        ca_12m_ht: 800,
        total_invoices: 5,
        now: NOW,
      }),
    ).toBe("occasional");
  });

  test("returns 'dormant' when 180 < days <= 540", () => {
    expect(
      computeClientStatus({
        last_invoice_at: days(400),
        ca_12m_ht: 0,
        total_invoices: 8,
        now: NOW,
      }),
    ).toBe("dormant");
  });

  test("returns 'lost' when days > 540", () => {
    expect(
      computeClientStatus({
        last_invoice_at: days(800),
        ca_12m_ht: 0,
        total_invoices: 30,
        now: NOW,
      }),
    ).toBe("lost");
  });
});
