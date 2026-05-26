# Contributing — BI Distributeur Premium Demo

Ce repo est la version anonymisee d'une mission freelance. Toutes les donnees sont des fixtures Faker.js. Aucune information client reelle.

## Stack

- **Frontend** : TanStack Start (React 19) + Vite + TailwindCSS v4
- **Backend** : Convex (queries / mutations / scheduler reactif)
- **Auth** : Better Auth (magic link via Resend)
- **UI** : shadcn + base-ui
- **Tests** : Vitest + Playwright

## Commandes

| Commande | Effet |
|---|---|
| `pnpm install` | install deps |
| `pnpm dev` | dev server TanStack Start (port 3000) |
| `pnpm convex:dev` | dev backend Convex |
| `pnpm start-all` | les deux ci-dessus en parallele |
| `pnpm seed:demo` | seed Faker.js initial (clients, produits, 16 ans d'historique) |
| `pnpm test` | unit + integration |
| `pnpm test:e2e` | Playwright (HEADLESS=0) |
| `pnpm ts` | type check |
| `pnpm lint` | eslint --fix |
| `pnpm clean` | type check + prettier write |

## Conventions

- **Convex source of truth** : pas d'integration ERP tiers sur le chemin critique. Tout passe par Convex (clients, produits, devis, BL, factures, BC, stock).
- **Mutations atomiques** : devis -> BL et BL -> facture sont des transactions Convex avec decrement / increment de stock dans le meme run.
- **Keyboard-first** : F8 = devis vers BL, F9 = BL vers facture, Ctrl+K = palette, F3 = overlay recherche.
- **Numbering** : `D26-NNNN` (devis), `B26-NNNN` (BL), `F26-NNNN` (facture), `BC26-NNNN` (bon de commande fournisseur).
- **Multi-tenant** : `organization_id` carry sur toutes les tables business. Better Auth gere les sessions, Convex applique l'isolement.

## Variables d'environnement

Voir `.env-template`. Pour faire tourner en local il faut au minimum :
- `CONVEX_DEPLOYMENT` / `CONVEX_DEPLOY_KEY` (Convex Cloud)
- `BETTER_AUTH_SECRET` (32+ chars aleatoires)
- `RESEND_API_KEY` (pour magic link)
- `VITE_CONVEX_URL` (frontend)

## Tester l'app en demo

L'app est deployee sur Vercel + Convex Cloud. Pour acceder a la demo en lecture :
1. Aller sur l'URL deploiement
2. Cliquer "Demander un acces"
3. Entrer un email
4. Cliquer le magic link recu (valide 24h, droits read-only sur le tenant `toscana-beverages-demo`)

## License

MIT. Voir [LICENSE.TXT](LICENSE.TXT).
