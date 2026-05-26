import { describe, expect, test } from "vitest";
import { COMMANDS, filterCommands } from "@/features/search/commands";

describe("COMMANDS catalogue", () => {
  test("contains the 13 expected commands", () => {
    expect(COMMANDS).toHaveLength(13);
    const ids = COMMANDS.map((c) => c.id);
    expect(ids).toEqual([
      "new-quotation",
      "list-quotations",
      "list-delivery-forms",
      "new-delivery-form-direct",
      "list-invoices",
      "new-invoice-aggregate",
      "list-purchase-orders",
      "list-products",
      "list-clients",
      "insights-bi",
      "list-tickets",
      "new-ticket",
      "sign-out",
    ]);
  });

  test("new-delivery-form-direct has F2 hint and route /app/delivery-forms/new", () => {
    const cmd = COMMANDS.find((c) => c.id === "new-delivery-form-direct");
    expect(cmd?.label).toBe("Nouveau BL direct");
    expect(cmd?.hint).toBe("F2");
    expect(cmd?.to).toBe("/app/delivery-forms/new");
  });

  test("new-invoice-aggregate routes to /app/invoices/new without F2 hint", () => {
    const cmd = COMMANDS.find((c) => c.id === "new-invoice-aggregate");
    expect(cmd?.to).toBe("/app/invoices/new");
    expect(cmd?.hint).toBeUndefined();
  });

  test("new-quotation has route /app/quotations/new without F2 hint", () => {
    const cmd = COMMANDS.find((c) => c.id === "new-quotation");
    expect(cmd?.to).toBe("/app/quotations/new");
    expect(cmd?.hint).toBeUndefined();
  });

  test("sign-out has action and no route", () => {
    const cmd = COMMANDS.find((c) => c.id === "sign-out");
    expect(cmd?.action).toBe("sign-out");
    expect(cmd?.to).toBeUndefined();
  });

  test("list-clients routes to /app/clients", () => {
    const cmd = COMMANDS.find((c) => c.id === "list-clients");
    expect(cmd?.label).toBe("Clients");
    expect(cmd?.to).toBe("/app/clients");
  });

  test("list-tickets routes to /app/tickets", () => {
    const cmd = COMMANDS.find((c) => c.id === "list-tickets");
    expect(cmd?.label).toBe("Tickets SAV");
    expect(cmd?.to).toBe("/app/tickets");
  });

  test("new-ticket routes to /app/tickets/new", () => {
    const cmd = COMMANDS.find((c) => c.id === "new-ticket");
    expect(cmd?.label).toBe("Nouveau ticket SAV");
    expect(cmd?.to).toBe("/app/tickets/new");
  });
});

describe("filterCommands", () => {
  test("empty query returns all commands", () => {
    expect(filterCommands(COMMANDS, "")).toHaveLength(COMMANDS.length);
  });

  test("dev matches Nouveau devis and Liste devis", () => {
    const r = filterCommands(COMMANDS, "dev");
    const ids = r.map((c) => c.id);
    expect(ids).toContain("new-quotation");
    expect(ids).toContain("list-quotations");
    expect(ids).not.toContain("list-invoices");
  });

  test("bc matches Liste BC fournisseurs", () => {
    const r = filterCommands(COMMANDS, "bc");
    expect(r.map((c) => c.id)).toContain("list-purchase-orders");
  });

  test("zzz returns empty", () => {
    expect(filterCommands(COMMANDS, "zzz")).toEqual([]);
  });

  test("is accent-insensitive", () => {
    const r = filterCommands(COMMANDS, "déc");
    expect(r.map((c) => c.id)).toContain("sign-out");
  });
});
