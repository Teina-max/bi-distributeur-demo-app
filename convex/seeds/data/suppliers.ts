export type SeedSupplier = {
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export const SUPPLIERS: readonly SeedSupplier[] = [
  {
    code: "FRN-001",
    name: "Toscano Italia Distribuzione",
    email: "commandes@toscano.fr",
    phone: "+33 1 40 00 00 00",
  },
  {
    code: "FRN-002",
    name: "Café du Sud Importateur",
    email: null,
    phone: "+33 4 93 00 00 01",
  },
  { code: "FRN-003", name: "Accessoiriste Pro CHR", email: null, phone: null },
  {
    code: "FRN-004",
    name: "Filtres et Consommables SARL",
    email: null,
    phone: null,
  },
  { code: "FRN-005", name: "Lavazza France", email: null, phone: null },
  { code: "FRN-006", name: "Maison du Sucre", email: null, phone: null },
  {
    code: "FRN-007",
    name: "Distrib Snacks Méditerranée",
    email: null,
    phone: null,
  },
  { code: "FRN-008", name: "Plomberie Café Pro", email: null, phone: null },
  { code: "FRN-009", name: "Tabletterie Méditerranée", email: null, phone: null },
  {
    code: "FRN-010",
    name: "Élec Maintenance Méditerranéen",
    email: null,
    phone: null,
  },
];
