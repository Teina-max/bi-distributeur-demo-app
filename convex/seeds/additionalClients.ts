/**
 * Genere ~150 clients fictifs additionnels en plus des 60 manuels dans data/clients.ts.
 * Datasets statiques + PRNG deterministe (seed fixe) → re-runs reproductibles.
 *
 * Volume : ~210 clients au total (60 + 150) repartis sur 6 types et 14 villes.
 *
 * NOT protected by auth — POC seed only.
 */

/* eslint-disable no-await-in-loop, @typescript-eslint/no-non-null-assertion -- sequential inserts + small array index access */
import { mutation } from "../_generated/server";
import { TOSCANA_ORG_ID } from "./users";
import { buildSearchTokens } from "../utils/searchTokens";

type ClientType =
  | "Particulier"
  | "Pro-CHR"
  | "Pro-Entreprise"
  | "Pro-Collectivité"
  | "Revendeur"
  | "Divers";

const TYPES: readonly {
  type: ClientType;
  weight: number;
  prefixes: readonly string[];
}[] = [
  {
    type: "Pro-CHR",
    weight: 50,
    prefixes: [
      "RESTAURANT",
      "BRASSERIE",
      "BISTROT",
      "CAFE",
      "PIZZERIA",
      "BAR",
      "TAVERNE",
      "SNACK",
      "BAR TABAC",
      "AUBERGE",
      "CREPERIE",
      "GRILL",
    ],
  },
  {
    type: "Pro-Entreprise",
    weight: 25,
    prefixes: [
      "BUREAU",
      "ENTREPRISE",
      "STUDIO",
      "AGENCE",
      "CABINET",
      "ATELIER",
      "GARAGE AUTO",
      "PHARMACIE",
      "BANQUE",
      "ASSURANCE",
      "CONSULTING",
      "IMMOBILIER",
    ],
  },
  {
    type: "Pro-Collectivité",
    weight: 10,
    prefixes: [
      "MAIRIE",
      "ECOLE",
      "COLLEGE",
      "LYCEE",
      "CRECHE",
      "HOPITAL",
      "CLINIQUE",
      "EHPAD",
      "MJC",
      "BIBLIOTHEQUE",
    ],
  },
  {
    type: "Revendeur",
    weight: 8,
    prefixes: [
      "EPICERIE",
      "CAVE A VINS",
      "TRAITEUR",
      "BOULANGERIE",
      "MARCHE COUVERT",
      "DISTRIB AUTO",
    ],
  },
  { type: "Particulier", weight: 5, prefixes: ["M.", "Mme", "Famille"] },
  {
    type: "Divers",
    weight: 2,
    prefixes: ["ASSOCIATION", "COMITE", "CLUB SPORTIF", "COPROPRIETE"],
  },
];

const SECOND_WORDS = [
  "DU PORT",
  "DU MARCHE",
  "DU CENTRE",
  "DE LA PLAGE",
  "DE LA TERRASSE",
  "DE LA PLACE",
  "DU VIEUX MOULIN",
  "DU CIGALON",
  "DES OLIVIERS",
  "DES MIMOSAS",
  "DE LA FONTAINE",
  "BELLA VISTA",
  "MEDITERRANEE",
  "PROVENCALE",
  "DU SUD",
  "MARITIME",
  "DE L'OURS",
  "DU SOLEIL",
  "DES ARTISTES",
  "DU LAVANDIN",
  "PALMIER",
  "DES PINS",
  "DE L'OLIVIER",
  "DU CYPRES",
  "DES FLAMANTS",
  "DE L'AZUR",
];

const FAMILY_NAMES = [
  "MARTIN",
  "BERNARD",
  "ROUSSEAU",
  "MOREAU",
  "LAURENT",
  "GIRARD",
  "ROUX",
  "BONNET",
  "GARCIA",
  "LOPEZ",
  "DELORME",
  "CHEVALIER",
  "FRANCOIS",
  "FAURE",
  "FONTAINE",
  "MERCIER",
  "GUILLAUME",
  "VERDIER",
  "TURGEON",
  "BERTOLINI",
];

const FIRST_NAMES = [
  "Marc",
  "Sophie",
  "Jean",
  "Catherine",
  "Laurent",
  "Isabelle",
  "Stéphane",
  "Nathalie",
  "Eric",
  "Sandrine",
  "Frédéric",
  "Christine",
  "Olivier",
  "Patricia",
  "Philippe",
  "Anne",
  "Daniel",
  "Sylvie",
  "Bruno",
  "Caroline",
];

const CITIES: readonly { name: string; cp: string; weight: number }[] = [
  { name: "Nice", cp: "06000", weight: 22 },
  { name: "Toulon", cp: "83000", weight: 16 },
  { name: "Cannes", cp: "06400", weight: 12 },
  { name: "Antibes", cp: "06600", weight: 10 },
  { name: "Hyères", cp: "83400", weight: 7 },
  { name: "Menton", cp: "06500", weight: 6 },
  { name: "Sanary", cp: "83110", weight: 5 },
  { name: "Grasse", cp: "06130", weight: 5 },
  { name: "Bandol", cp: "83150", weight: 4 },
  { name: "Cassis", cp: "13260", weight: 4 },
  { name: "Carry", cp: "13620", weight: 3 },
  { name: "Cavalaire", cp: "83240", weight: 3 },
  { name: "Lavandou", cp: "83980", weight: 3 },
];

const STREETS = [
  "Rue de la République",
  "Avenue des Mimosas",
  "Boulevard du Littoral",
  "Place Garibaldi",
  "Rue Saint-François-de-Paule",
  "Avenue Jean Médecin",
  "Promenade des Anglais",
  "Quai Lunel",
  "Rue Masséna",
  "Cours Saleya",
  "Avenue Albert 1er",
  "Rue Hôtel des Postes",
  "Rue de France",
  "Avenue de Verdun",
  "Place Massena",
  "Rue Pastorelli",
  "Avenue Borriglione",
  "Boulevard Carnot",
  "Rue Cassini",
  "Avenue Cyrille Besset",
];

const seededRandom = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

const randInt = (rng: () => number, min: number, max: number) =>
  Math.floor(rng() * (max - min + 1)) + min;

const randWeighted = <T extends { weight: number }>(
  rng: () => number,
  items: readonly T[],
): T => {
  const total = items.reduce((a, b) => a + b.weight, 0);
  let r = rng() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1]!;
};

const randChoice = <T>(rng: () => number, arr: readonly T[]): T =>
  arr[Math.floor(rng() * arr.length)]!;

const buildEmail = (name: string, rng: () => number): string | null => {
  if (rng() < 0.3) return null;
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
  const tlds = [
    "fr",
    "com",
    "fr",
    "fr",
    "wanadoo.fr",
    "orange.fr",
    "free.fr",
    "gmail.com",
  ];
  const tld = randChoice(rng, tlds);
  if (tld.includes("@")) return `${slug}@${tld}`;
  const handles = [
    "contact",
    "info",
    slug.split("-")[0]!,
    "accueil",
    "direction",
  ];
  return `${randChoice(rng, handles)}@${slug}.${tld.includes(".") ? tld : tld}`;
};

const PAYMENT_TERMS: readonly {
  days: number;
  label: string;
  weight: number;
}[] = [
  { days: 0, label: "Comptant", weight: 25 },
  { days: 15, label: "15j net", weight: 20 },
  { days: 30, label: "30j net", weight: 35 },
  { days: 45, label: "45j net", weight: 15 },
  { days: 60, label: "60j net", weight: 5 },
];

const HOW_MANY = 150;

export const seedAdditionalDemoClientsPublic = mutation({
  args: {},
  handler: async (ctx): Promise<{ added: number; skipped: number }> => {
    const rng = seededRandom(42);

    let added = 0;
    let skipped = 0;

    for (let i = 0; i < HOW_MANY; i++) {
      const typeEntry = randWeighted(rng, TYPES);
      const prefix = randChoice(rng, typeEntry.prefixes);

      let name: string;
      if (typeEntry.type === "Particulier") {
        const fname = randChoice(rng, FIRST_NAMES);
        const lname = randChoice(rng, FAMILY_NAMES);
        name = `${prefix} ${fname} ${lname}`;
      } else {
        const second = randChoice(rng, SECOND_WORDS);
        name = `${prefix} ${second}`;
      }

      const city = randWeighted(rng, CITIES);
      const code = `C${String(100000 + i + 1)}`;

      // Avoid colliding with the static catalog 60-client codes (C001234, C002145, ...)
      const existing = await ctx.db
        .query("clients")
        .withIndex("by_organization_and_code", (q) =>
          q.eq("organization_id", TOSCANA_ORG_ID).eq("code", code),
        )
        .unique();
      if (existing !== null) {
        skipped += 1;
        continue;
      }

      const paymentTerms = randWeighted(rng, PAYMENT_TERMS);
      const phoneAB = String(randInt(rng, 10, 99));
      const phoneCD = String(randInt(rng, 10, 99));
      const phoneEF = String(randInt(rng, 10, 99));
      const phoneGH = String(randInt(rng, 10, 99));

      await ctx.db.insert("clients", {
        organization_id: TOSCANA_ORG_ID,
        code,
        name,
        type: typeEntry.type,
        email: buildEmail(name, rng),
        phone: `+33 4 93 ${phoneAB} ${phoneCD} ${phoneEF} ${phoneGH}`,
        address: {
          street: `${randInt(rng, 1, 250)} ${randChoice(rng, STREETS)}`,
          postal_code: city.cp,
          city: city.name,
          country: "FR",
        },
        payment_terms_days: paymentTerms.days,
        payment_terms_label: paymentTerms.label,
        search_tokens: buildSearchTokens(code, name, city.name, typeEntry.type),
      });
      added += 1;
    }

    return { added, skipped };
  },
});
