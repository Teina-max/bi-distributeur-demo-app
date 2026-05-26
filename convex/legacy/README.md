# `convex/legacy/` — Historique Heritage importé

Module dédié à l'historique exporté depuis Heritage Micropoint (avant le pivot 2026-05-18).
Lecture seule en runtime ; alimenté en one-shot par un pipeline ETL.

## Tables (déclarées dans `convex/schema.ts`)

| Table                      | Rôle                                                                  |
| -------------------------- | --------------------------------------------------------------------- |
| `legacy_documents`         | Entêtes des pièces 2011-2026 (factures, devis, BL)                    |
| `legacy_document_lines`    | Lignes article de ces pièces                                          |
| `legacy_archive_summary`   | Agrégat annuel pré-2011 (1 ligne par client/an, sans détail)          |
| `legacy_unknown_aliases`   | Noms libres non rattachés à un `client` — à résoudre manuellement     |
| `client_monthly_stats`     | CA mensuel par client (alimente la fiche 360°)                        |
| `product_monthly_stats`    | Ventes mensuelles par article (alimente la fiche produit)             |

## Pipeline d'import (hors Convex, dans `scripts/import-heritage/`)

1. `enrich-with-client-code.ts` — passe exact + strict + tag `_HISTORIQUE` pour 2000-2010
2. `suggest-fuzzy.ts` — passe trigram/Jaccard, seuil auto 0.65
3. `apply-fuzzy-mapping.ts` — réinjecte `mapping_auto.csv` + `mapping_manuel.csv`

Sortie : `*.final.csv` UTF-8 avec colonnes `[code_client, match_method, ...36 cols Heritage]`.

## Stratégie de matching client

- `match_method = exact` — match strict normalisé (upper + collapse spaces)
- `match_method = strict` — après retrait suffixes juridiques (SAS/SARL/EURL) + tri tokens
- `match_method = fuzzy` — trigram Jaccard >= 0.65 (auto) ou >= 0.5 après validation manuelle
- `match_method = empty` — col 9 vide
- `match_method = unknown` — fallback : `client_id = null`, nom préservé dans `client_legacy_name`

Les lignes `_HISTORIQUE` (2000-2010) ne vont pas dans `legacy_documents` : elles sont agrégées
en bloc dans `legacy_archive_summary` (1 row par client/an).

## DTOs

À créer dans `convex/legacy/dto/` :

- `legacyInvoiceListItem.ts` — pour la timeline factures de la fiche client
- `clientMonthlyChart.ts` — agrégat 12 mois glissants pour graphe
- `productMonthlyChart.ts` — idem côté produit

## Pourquoi des tables séparées

`legacy_documents` n'est PAS fusionné avec `invoices` parce que :

1. Numérotation différente : Heritage = `20110001`, ERP V1 = `F26-NNNN`
2. Pas de lien `delivery_form_id` reconstructible (les BL Heritage sont incomplets)
3. Lecture seule : aucune mutation V1 ne doit toucher les pièces historiques
4. Isolation des indexes existants (perf des queries actives non dégradée)

## Volumétrie attendue

| Table                   | Documents estimés     |
| ----------------------- | --------------------- |
| `legacy_documents`      | ~62 000 (2011-2026)   |
| `legacy_document_lines` | ~230 000              |
| `legacy_archive_summary`| ~700 × 11 ans ≈ 7 700 |
| `legacy_unknown_aliases`| ~4 000                |
| `client_monthly_stats`  | ~700 × 192 mois ≈ 130 000 (sparse, en pratique ~30 000) |
| `product_monthly_stats` | ~1 230 × 192 mois (sparse, ~50 000) |

Convex free tier limite à 100k docs / 10 GiB — on reste largement dessous, mais l'import
doit être batché (1 000 docs par mutation, scheduler `runAfter` pour chaîner).
