import { describe, expect, test } from "vitest";
import { toClientDetailDto } from "@convex/clients/dto/clientDetail";
import type { Doc, Id } from "@convex/_generated/dataModel";

const fakeId = (s: string) => s as unknown as Id<"clients">;

const baseDoc: Doc<"clients"> = {
  _id: fakeId("cli-1"),
  _creationTime: 1_700_000_000_000,
  organization_id: "org-1",
  code: "C001",
  name: "Hôtel Beau Rivage",
  type: "horeca",
  email: "contact@beau-rivage.fr",
  phone: "+3393000000",
  address: {
    street: "1 rue X",
    postal_code: "06000",
    city: "Nice",
    country: "FR",
  },
  payment_terms_days: 30,
  payment_terms_label: "30j fin de mois",
  search_tokens: ["beau", "rivage"],
  correspondent: "Mme Rossi",
  vendor: "Marco",
  sector: "Nice-Sud",
  depot_cafe: "Nice",
  accounting_code: "411HBR",
  credit_limit: 5000,
  outstanding_amount: 1200,
  global_discount_pct: 5,
  tariff_level: 2,
  vat_intra: "FR12345678901",
  is_visible: true,
  notes: "Client VIP",
  legacy_imported_at: 1_690_000_000_000,
};

describe("toClientDetailDto", () => {
  test("expose intermédiaires + champs Heritage", () => {
    const dto = toClientDetailDto(baseDoc);
    expect(dto.correspondent).toBe("Mme Rossi");
    expect(dto.vendor).toBe("Marco");
    expect(dto.sector).toBe("Nice-Sud");
    expect(dto.depotCafe).toBe("Nice");
    expect(dto.accountingCode).toBe("411HBR");
    expect(dto.creditLimit).toBe(5000);
    expect(dto.globalDiscountPct).toBe(5);
    expect(dto.tariffLevel).toBe(2);
    expect(dto.vatIntra).toBe("FR12345678901");
    expect(dto.isVisible).toBe(true);
    expect(dto.notes).toBe("Client VIP");
  });

  test("normalise undefined Heritage en null", () => {
    const stripped = { ...baseDoc };
    delete (stripped as Record<string, unknown>).correspondent;
    delete (stripped as Record<string, unknown>).credit_limit;
    delete (stripped as Record<string, unknown>).is_visible;
    const dto = toClientDetailDto(stripped as Doc<"clients">);
    expect(dto.correspondent).toBeNull();
    expect(dto.creditLimit).toBeNull();
    expect(dto.isVisible).toBe(true); // defaut visible si absent
  });
});
