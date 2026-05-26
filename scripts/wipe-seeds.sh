#!/bin/bash
# wipe-seeds.sh — purge toutes les données métier (catalog + documents + tickets)
# de l'org Toscana Beverages SARL sur le déploiement Convex courant.
#
# Usage :
#   ./scripts/wipe-seeds.sh              # wipe DEV (default)
#   ./scripts/wipe-seeds.sh --prod       # wipe PROD (avec confirmation)
#
# Ne touche pas :
#   - users (gérés par Better Auth, recréés sur next sign-in)
#   - user_preferences (rebuildées sur next session)
#   - organisation (mono-org POC, slug hardcodé)
#
# SAFE TO REMOVE post-V1 (mutation wipePocAllPublic est aussi à retirer).

set -euo pipefail

TARGET="dev"
CONVEX_FLAG=""

if [[ "${1:-}" == "--prod" ]]; then
  TARGET="prod"
  CONVEX_FLAG="--prod"
fi

echo ""
echo "⚠️  Tu vas WIPE toutes les données métier Toscana Beverages SARL sur le déploiement Convex $TARGET."
echo ""
echo "Tables effacées : support_tickets, ticket_messages, stock_movements, invoices,"
echo "delivery_forms, purchase_orders, quotations, document_counters, clients, products, suppliers."
echo ""
echo "Tables conservées : users (Better Auth), user_preferences, organisation."
echo ""

if [[ "$TARGET" == "prod" ]]; then
  read -r -p "Confirme en tapant 'WIPE PROD' : " confirmation
  if [[ "$confirmation" != "WIPE PROD" ]]; then
    echo "Annulé."
    exit 1
  fi
else
  read -r -p "Confirme [y/N] : " confirmation
  if [[ "$confirmation" != "y" && "$confirmation" != "Y" ]]; then
    echo "Annulé."
    exit 1
  fi
fi

echo ""
echo "→ Wipe en cours sur $TARGET..."
pnpm exec convex run seeds/wipe:wipePocAllPublic '{}' $CONVEX_FLAG

echo ""
echo "✓ Wipe terminé."
echo ""
echo "Pour reseed :"
echo "  pnpm exec convex run seeds/catalog:seedCatalogPublic '{}' $CONVEX_FLAG"
echo "  pnpm exec convex run seeds/documents:seedTodayDocumentsPublic '{}' $CONVEX_FLAG"
echo "  pnpm exec convex run seeds/users:ensureUsersPublic '{}' $CONVEX_FLAG"
