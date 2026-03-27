#!/bin/bash
# Script de vérification valeurs hardcodées SCSS pour Appli-Picto
# Bloque édition si valeurs hardcodées détectées (px, rem, #hex, rgb, etc.)

set -e

echo "🎨 Vérification valeurs hardcodées SCSS..."

# Exécuter lint:hardcoded sur tout le projet
# (plus efficace que de vérifier fichier par fichier)
if pnpm lint:hardcoded 2>&1 | grep -q "Hardcoded values found"; then
  echo ""
  echo "❌ ERREUR: Valeurs hardcodées SCSS détectées"
  echo ""
  echo "→ Les fichiers SCSS doivent utiliser UNIQUEMENT les tokens du design system"
  echo "→ Utiliser /refactor-scss pour migrer vers tokens"
  echo ""
  echo "Patterns interdits:"
  echo "  ❌ px, rem, em (spacing/sizing)"
  echo "  ❌ #hex, rgb(), hsl() (couleurs)"
  echo "  ❌ Nombres bruts (border-radius, z-index, etc.)"
  echo ""
  echo "→ Voir skill 'sass-tokens-discipline' pour règles complètes"
  echo ""
  exit 1
fi

echo "✅ Aucune valeur hardcodée détectée"
exit 0
