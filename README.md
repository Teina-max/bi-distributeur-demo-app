# BI Distributeur Premium — Demo

> **Demo publique** d'une plateforme ERP/BI temps reel pour distributeur premium, basee sur une mission freelance reelle.
> Tous les noms, donnees, codes et adresses ont ete remplaces par des fixtures Faker.js. Aucune information client reelle dans ce repo.

[![Stack](https://img.shields.io/badge/Stack-TanStack%20Start%20%2B%20Convex%20%2B%20Better%20Auth-3ecf8e)](https://tanstack.com/start)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE.TXT)

---

## Pourquoi cette demo

Cette application est l'**anonymisation publique d'une mission freelance** : un ERP/BI standalone construit pour un distributeur premium en region mediterraneenne.

**Le besoin client** : remplacer un ERP legacy 16 ans d'historique par une experience clavier-first ou l'operatrice de saisie peut :
- creer un devis 3 lignes en moins de 60 secondes au clavier
- convertir en BL avec `F8`, en facture avec `F9`
- visualiser en temps reel le pipeline commercial et le stock

**Le resultat** : une stack 100 % code-controlled (Convex source of truth, zero dependance ERP tiers sur le chemin critique d'entree), 16 ans d'historique migres, dashboard direction live.

---

## Stack technique

| Couche | Techno |
|---|---|
| Frontend | TanStack Start (React 19) + Vite |
| Backend | Convex (reactif, schema + queries + mutations + scheduler) |
| Auth | Better Auth (magic link via Resend) |
| UI | shadcn + base-ui + TailwindCSS v4 |
| Tables | TanStack Table v8 |
| Charts | Recharts |
| Tests | Vitest + Playwright E2E |
| Hosting | Vercel (front) + Convex Cloud (backend) |

---

## Acces a la demo

Demo live : URL Vercel a confirmer post-deploy.

L'acces se fait par **magic link sur demande** :
1. Ouvrir l'URL ci-dessus
2. Saisir votre email
3. Recevoir un lien d'acces 24 h (read-only sur le tenant demo)

Tenant `toscana-beverages-demo` :
- ~50 clients fictifs (CHR, entreprises, particuliers, revendeurs)
- ~200 references produits (cafe, accessoires, consommables)
- ~16 ans d'historique : devis, BL, factures, mouvements de stock

---

## Tour de la demo en 5 minutes

Une fois loggue, vous arrivez sur le **dashboard**. Voici ce qui vaut le coup de tester pour juger la qualite technique :

### 1. Dashboard (1 min)
- KPIs temps reel (CA mois courant, en-cours clients, alertes stock)
- Top 10 clients par CA, par taux de transformation
- Tout est query Convex reactive : si vous ouvrez un 2e onglet et creez un devis, le dashboard se rafraichit instantanement sans reload

### 2. Saisie d'un devis clavier-first (1 min)
- Cliquer "Nouveau devis" ou `Ctrl+N`
- Taper 3 lettres dans le champ client → autocomplete dans une overlay style Heritage Micropoint, flecher + Entree pour selectionner
- Ajouter une ligne : taper le code produit (ex `CAF-001`) ou 3 lettres du nom (ex `cla` pour CLASSICO) → autocomplete
- Saisir quantites, les totaux HT/VAT/TTC se recalculent live
- Sauvegarder avec `Ctrl+S` ou bouton

### 3. Conversion devis -> BL -> facture (1 min)
- Sur un devis en statut `draft` ou `sent`, appuyer `F8` → ouvre l'overlay de conversion en bon de livraison
- Confirmer → le BL est cree, le stock decremente, un mouvement de stock audit est enregistre, tout dans la meme mutation atomique Convex
- Sur le BL, appuyer `F9` → conversion en facture avec echeance auto-calculee selon les conditions de paiement du client

### 4. Recherche cross-modules (30 s)
- `Ctrl+K` → palette de commandes (navigation rapide)
- `F3` → overlay de recherche full-text : devis, BL, factures, clients, produits, BC, tickets — tous taggables, navigables au clavier
- Tape un numero (ex `D26-0042`) ou un nom client, les resultats sont groupes par type

### 5. Fiche client 360 (1 min)
- Aller dans `Clients` → cliquer n'importe quel client
- Onglets : Coordonnees / Devis (statuts + drill-down) / BL / Factures (statuts paiement) / Commandes en cours / Historique stock par produit / Tickets SAV
- KPIs : CA total, en-cours impaye, panier moyen, derniere commande, frequence

### 6. Stock + cycle achat (30 s)
- Aller dans `Commandes fournisseurs`
- Creer un BC, marquer une reception partielle (ex : commande 50 unites, recoit 30) → le stock s'incremente de 30, le BC reste en `partially_received`
- L'audit log dans `Stock movements` montre tous les flux (entree, sortie, ajustement)

### Ce qui n'est pas montre dans la demo
- Le module emails (sequence relance impayes) — necessite domaine verifie Resend
- L'import legacy 16 ans (parser CSV custom) — code present dans `convex/utils/` mais pas branchable sans donnees brutes
- L'export PDF facture (templates `@react-pdf/renderer`) — actif mais necessite que le compte ait des privileges en `write`

### Points d'attention "code review"
Si vous voulez juger le code :
- `convex/quotations/createQuotation.ts` — saisie + validation + numerotation atomique
- `convex/conversions/convertQuotationToDelivery.ts` — transaction Convex : insert BL + decrement stock + audit log dans la meme mutation
- `src/components/heritage/autocomplete-overlay.tsx` — composant clavier-first cross-module
- `convex/dashboard/todayDigest.ts` — agregation reactive pour le dashboard temps reel
- `convex/auth/orgAccess.ts` — isolement multi-tenant (chaque ligne porte `organization_id`)

---

## Demarrer en local

```bash
pnpm install
pnpm convex:dev      # terminal 1 — backend Convex
pnpm dev             # terminal 2 — TanStack Start
pnpm seed:demo       # une seule fois, pour peupler la base
```

Variables d'environnement : copier `.env-template` en `.env.local` et remplir.

---

## Architecture

```
                  +------------------------------------------+
                  |       TanStack Start (React 19)          |
                  |  Login (magic link) - Dashboard - ERP    |
                  |  Routing fichier - SSR selectif          |
                  +--------------+---------------------------+
                                 |  Convex client (ws + http)
                                 v
                  +------------------------------------------+
                  |            Convex Cloud                  |
                  |  queries (reactif) | mutations (atomic)  |
                  |  scheduler         | indexes (perf)      |
                  |  + Better Auth + Resend (magic link)     |
                  +------------------------------------------+
```

---

## Modules implementes

- **Clients** : annuaire avec recherche typo-tolerante, fiche 360 (CA, en-cours, dernieres interventions)
- **Catalogue produits** : 200 refs avec stock temps reel
- **Devis** : saisie clavier-first, autocomplete code/ref/nom, totaux HT/VAT/TTC multi-taux
- **BL** : conversion devis -> BL avec decrement stock atomique
- **Factures** : conversion BL -> facture, agregation multi-BL par client, echeances
- **Commandes fournisseurs** : cycle achat complet avec reception partielle + increment stock atomique
- **Stock movements** : audit log de toutes les variations (entree, sortie, ajustement)
- **Support tickets** : panne machine / defaut produit / facturation
- **Dashboard** : KPIs temps reel, alertes stock, CA mois en cours, top clients
- **Search** : palette Ctrl+K + F3 overlay cross-modules

---

## Tests

```bash
pnpm test       # Vitest unit + integration
pnpm test:e2e   # Playwright E2E
pnpm ts         # type check
pnpm lint       # eslint
```

---

## License

MIT — voir [LICENSE.TXT](LICENSE.TXT).

Demo construite par [Teina](https://github.com/Teina-max) (Freelance full-stack — automation & IA pour PME).

teinateinauri@gmail.com - [LinkedIn](https://www.linkedin.com/in/teina-automatise) - [Portfolio](https://teina-portfolio.com)
