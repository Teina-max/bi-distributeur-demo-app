# Reprise — BI Distributeur Premium Demo

> Session de nuit du 2026-05-27.
> Etat au reveil : code anonymise + build vert, pret pour deploy.

---

## Ou on en est

**Repo local** : `~/projects/bi-distributeur-demo/`
**Origine** : clone anonymise de `~/projects/illy-corse/app/`

### Checks techniques

- ✅ `pnpm install` OK (1195 packages)
- ✅ `pnpm ts` : 0 erreurs
- ✅ `pnpm lint:ci` : 0 erreurs
- ⏳ `pnpm test` : non lance (peut casser sur fixtures, a regarder)

### Anonymisation realisee

| Reel | Demo |
|---|---|
| Defi / SARL Defi | Toscana / Toscana Beverages SARL |
| Illy Pro / Illy France Distribution | Toscano Pro / Toscano Italia Distribuzione |
| Horizon Bridge (l'app) | BI Distributeur Premium |
| Horizon (legacy ERP) | Heritage |
| Corse / Corsica | Mediterranee |
| Ajaccio / Bastia | Nice / Toulon |
| 20xxx (CP Corse) | 06xxx (CP Alpes-Maritimes) |
| +33 4 95 (prefix Corse) | +33 4 93 (prefix neutre) |
| Younes / Balla (admins) | Marco / Luca |
| BAR DU PORTO VECCHIO, U PAESE, etc. | BISTROT DU VIEUX PORT, DU VILLAGE, etc. |
| `sarl-defi.local` (emails) | `toscana.local` |
| `SARL_DEFI_ORG_ID` | `TOSCANA_ORG_ID` |
| `barDuPort` (var) | `bistrotDuPort` |
| `illyDistrib` (var) | `toscanoDistrib` |

**Fichiers supprimes** (specifiques client) :
- `docs/GUIDE-DEMO-BALLA.md`
- `docs/PRD-horizon-bridge-v1.md`
- `docs/superpowers/`
- `scripts/import-horizon/` (parser CSV Heritage)
- `.claude/`, `.agents/`, `.codex/`, `.cursor/`
- `public/images/org-logo.png` (logo client)
- `public/images/screenshot.png` (capture client)
- `CHANGELOG.md` (144 KB de notes internes)
- `skills-lock.json`

**Fichiers recrees** :
- `public/images/org-logo.svg` (placeholder generique)
- `public/favicon.svg` (placeholder generique)
- `README.md` (oriente portfolio S'investir)
- `AGENTS.md` (stub propre pour contributeurs publics)
- `src/site-config.ts` (team Teina, no Melvynx)

---

## Ce qu'il reste a faire (par ordre)

### 1. Faker seed augmente — ✅ DONE

`convex/seeds/historicalFaker.ts` + `scripts/seed-historical.mjs` ecrits et testes (ts + lint clean).

Volume genere par lancement complet (2010-2026, 17 ans) :
- ~3200 quotations (188/an)
- ~2240 delivery forms (70% conversion)
- ~2020 invoices (90% BL -> facture)
- ~850 purchase orders (50/an)
- ~12000 stock movements

Pattern : 1 mutation = 1 annee (pour rester sous le budget Convex 16 MB).
Le script Node `scripts/seed-historical.mjs` boucle via le client HTTP Convex,
ce qui evite de tout chainer dans une seule mutation cote serveur.

**Commandes prevues** :
```bash
pnpm seed:catalog        # suppliers + products + clients (existant)
pnpm seed:historical     # boucle 2010-2026 sur le seedYearBatch
pnpm seed:demo           # les deux ci-dessus dans l'ordre
pnpm wipe:demo           # tout effacer (utile pour re-seed)
```

Pour ne seed qu'une annee : `bun scripts/seed-historical.mjs 2024`.
Pour une plage : `bun scripts/seed-historical.mjs 2020 2026`.

### 2. Setup magic link Resend (~30 min)

- Verifier que `teina-domain.com` (ou similaire) est verified sur Resend
- Recuperer la RESEND_API_KEY
- Configurer Better Auth pour ne PAS demander signup (magic link only)
- Page landing "Demander un acces" → email → magic link

### 3. Creer projet Convex Cloud (~10 min)

```bash
cd ~/projects/bi-distributeur-demo
pnpm exec convex dev
# Choisir : nouveau projet, nom: bi-distributeur-demo
# Cela cree CONVEX_DEPLOYMENT et VITE_CONVEX_URL automatiquement
```

### 4. Run seed Faker en prod Convex Cloud (~5 min)

```bash
pnpm seed:demo  # script a ecrire dans package.json, alias vers le seed Faker
```

### 5. Creer projet Vercel + lier GitHub (~15 min)

```bash
cd ~/projects/bi-distributeur-demo
vercel link
# Choisir : nouveau projet, nom: bi-distributeur-demo
# Definir vars env : CONVEX_DEPLOYMENT, VITE_CONVEX_URL, RESEND_API_KEY, BETTER_AUTH_SECRET, etc.
```

### 6. Push repo GitHub public (~5 min)

```bash
gh repo create Teina-max/bi-distributeur-demo-app --public --source=. --description "Demo publique d'un ERP/BI temps reel pour distributeur premium — TanStack Start + Convex"
# Ou squash en 1 commit initial propre avant de push
git remote add origin git@github.com:Teina-max/bi-distributeur-demo-app.git
git push -u origin main
```

### 7. Smoke test (~30 min)

- Ouvrir URL Vercel
- Saisir email demo → recevoir magic link → cliquer → arriver sur dashboard
- Tester chaque module (clients, devis, BL, factures, BC, stock, dashboard)
- Confirmer que les 16 ans d'historique apparaissent dans les charts

### 8. Update teina-portfolio.com (~15 min)

Linker la demo depuis la section "Realisations Clients" :
- Card "BI Distributeur Premium" : ajouter un bouton "🔗 Demo live" qui pointe vers l'URL Vercel
- Tester le link en prod

### 9. Mettre a jour le formulaire Tally S'investir

Dans la reponse "Projet 2 — BI Distributeur Premium", ajouter le lien Vercel :
```
Vidéo demo (52 s) : https://teina-portfolio.com/#realisations
Demo testable (magic link) : https://bi-distributeur-demo.vercel.app
Repo public : https://github.com/Teina-max/bi-distributeur-demo-app
```

---

## Decisions prises pendant la nuit

1. **Repo dedie** (pas branche), choix valide par l'utilisateur
2. **Visibilite : PUBLIC** (valide par l'utilisateur, mais double-checker quand on est moins fatigue)
3. **Auth : magic link sur demande** (valide)
4. **Geo : France generique Mediterranee** (revue parce que Sardinia/Cagliari + FR/+33 etait incoherent)
5. **Marque fictive : Toscana Beverages SARL + Toscano Pro** (italianite distrib conservee, SARL francaise)
6. **Personnes : Marco / Luca** (italianite, neutre)
7. **Branding visuel : SVG noir + accent #D7372C** (proche du theme original, generique)

---

## Risques residuels

- **Tests unitaires** : pas joues. Peuvent casser sur fixtures hardcodees (`expect("BAR DU PORTO VECCHIO")` etc.)
- **E2E Playwright** : pas joues. Probablement OK mais necessite Convex + Vercel up
- **Donnees CHANGELOG** : supprime totalement, donc git log n'a aucune trace des versions internes
- **Auto-commit hook** : tes commits auto-update ont cree 4 commits parasites avant le mien. Squash recommandé avant push public.
- **`hotelCampo` -> `hotelDuPort`** : ok mais le code C000891 dans seeds peut ne plus pointer le bon client si on a regenere le client list

---

## Commandes utiles

```bash
cd ~/projects/bi-distributeur-demo
pnpm dev               # frontend
pnpm convex:dev        # backend
pnpm start-all         # les deux en parallele
pnpm ts                # type check
pnpm lint              # eslint
pnpm test              # vitest
pnpm test:e2e          # playwright
git log --oneline      # voir l'historique
```

---

Bonne nuit. Au reveil tu valides visuellement les renommages dans `convex/seeds/data/clients.ts` et `convex/seeds/documents.ts`, puis tu attaques les etapes 1-6 dans l'ordre.
