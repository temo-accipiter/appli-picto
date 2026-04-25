#!/bin/bash
# ⚠️ DEPRECATED depuis 2026-04-25 — fonctionnalités migrées dans pre-commit.sh
# Ne pas appeler. Sera supprimé en Phase 0 Étape 6.

# 🎨 Hook Pre-Commit CSS - Validation Design System Appli-Picto
# Bloque les commits avec valeurs hardcodées ou erreurs compilation SCSS

set -e  # Arrêter si erreur

echo ""
echo "🎨 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   VALIDATION CSS AVANT COMMIT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Compteur erreurs
ERRORS=0

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1️⃣ VÉRIFIER VALEURS HARDCODÉES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "🔍 Vérification valeurs hardcodées..."

if pnpm lint:hardcoded 2>/dev/null; then
  echo "✅ Aucune valeur hardcodée détectée"
  echo ""
else
  echo ""
  echo "❌ ERREUR : Valeurs hardcodées détectées"
  echo ""
  echo "💡 Utilisez les fonctions du design system :"
  echo "   • Couleurs    : color(), surface(), text(), semantic()"
  echo "   • Spacing     : spacing() (margin/padding/gap uniquement)"
  echo "   • Typographie : font-size(), font-weight(), line-height()"
  echo "   • Transitions : timing(), easing(), @include safe-transition()"
  echo "   • Radius      : radius()"
  echo ""
  echo "📖 Documentation : /mnt/project/refactor-philosophy.md"
  echo ""
  ERRORS=$((ERRORS + 1))
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2️⃣ VÉRIFIER TOUCH TARGETS (WARNING uniquement)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "👆 Vérification touch targets (WCAG AA)..."

if pnpm validate:touch-targets 2>/dev/null; then
  echo "✅ Touch targets validés (≥ 44px)"
  echo ""
else
  echo ""
  echo "⚠️  WARNING : Problèmes touch targets détectés"
  echo ""
  echo "💡 Utilisez @include touch-target('min') pour WCAG AA (44px)"
  echo "   ou @include touch-target('preferred') pour TSA (56px)"
  echo ""
  echo "⚠️  Ce n'est qu'un avertissement - commit autorisé"
  echo ""
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3️⃣ COMPILATION SCSS (Next.js native)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "🔨 Vérification SCSS..."
echo "ℹ️  Next.js compile automatiquement .scss → .css (pas de build:css manuel)"
echo "✅ SCSS sera validé au prochain démarrage Next.js"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# RÉSULTAT FINAL
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ]; then
  echo "✅ VALIDATION RÉUSSIE - Commit autorisé"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  exit 0
else
  echo "❌ VALIDATION ÉCHOUÉE - Commit bloqué"
  echo ""
  echo "   Erreurs détectées : $ERRORS"
  echo ""
  echo "🔧 Corrigez les erreurs ci-dessus et recommitez"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "💡 Pour bypasser (NON RECOMMANDÉ) :"
  echo "   git commit --no-verify"
  echo ""
  exit 1
fi