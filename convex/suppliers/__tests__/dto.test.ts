import { describe, expect, test } from "vitest";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { toSupplierSuggestionDto } from "../dto/supplierSuggestion";

describe("toSupplierSuggestionDto", () => {
  test("returns id + code + name only (no email/phone)", () => {
    const doc: Doc<"suppliers"> = {
      _id: "sup_1" as unknown as Id<"suppliers">,
      _creationTime: 1747500000000,
      organization_id: "toscana-beverages-demo",
      code: "FRN-001",
      name: "Toscano Italia Distribuzione",
      email: "commandes@toscano.fr",
      phone: "+33 1 40 00 00 00",
      search_tokens: ["frn-001", "toscano", "france", "distribution"],
    };
    const dto = toSupplierSuggestionDto(doc);
    expect(dto).toEqual({
      id: doc._id,
      code: "FRN-001",
      name: "Toscano Italia Distribuzione",
    });
  });
});
