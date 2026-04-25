#!/bin/bash
# Script de vérification avant commit pour Appli-Picto
# Vérifie lint, format, types, tests, SCSS hardcodés, touch targets, mobile-first, et architecture hooks

set -e

echo ""
echo "🔍 =========================================="
echo "🔍 Vérifications avant commit (Appli-Picto)"
echo "🔍 =========================================="
echo ""

# Compteur d'erreurs total
total_errors=0

# 1. Vérifier lint + format
echo "📝 [1/7] Vérification lint + format..."
if pnpm check; then
  echo "✅ Lint + format : OK"
else
  echo "❌ ERREUR: pnpm check a échoué"
  echo "   → Exécuter: pnpm check"
  total_errors=$((total_errors + 1))
fi
echo ""

# 2. Vérifier types TypeScript
echo "🔷 [2/7] Vérification types TypeScript..."
if pnpm type-check; then
  echo "✅ Types TypeScript : OK"
else
  echo "❌ ERREUR: pnpm type-check a échoué"
  echo "   → Exécuter: pnpm type-check"
  total_errors=$((total_errors + 1))
fi
echo ""

# 3. Vérifier tests
echo "🧪 [3/7] Vérification tests unitaires..."
if pnpm vitest run; then
  echo "✅ Tests unitaires : OK"
else
  echo "❌ ERREUR: pnpm test a échoué"
  echo "   → Corriger les tests avant commit"
  total_errors=$((total_errors + 1))
fi
echo ""

# 4. Vérifier valeurs hardcodées SCSS
echo "🎨 [4/7] Vérification valeurs hardcodées SCSS..."
if pnpm lint:hardcoded 2>/dev/null; then
  echo "✅ Valeurs hardcodées : OK"
else
  echo "❌ ERREUR: Valeurs hardcodées SCSS détectées"
  echo "   → Utiliser les fonctions du design system : color(), spacing(), radius()..."
  total_errors=$((total_errors + 1))
fi
echo ""

# 5. Vérifier touch targets (WARNING uniquement)
echo "👆 [5/7] Vérification touch targets WCAG AA..."
if pnpm validate:touch-targets 2>/dev/null; then
  echo "✅ Touch targets : OK"
else
  echo "⚠️  WARNING: Problèmes touch targets détectés"
  echo "   → Utiliser @include touch-target('min') pour WCAG AA (44px)"
  echo "   → Commit autorisé (warning, pas bloquant)"
fi
echo ""

# 6. Vérifier Mobile-First
echo "📱 [6/7] Vérification Mobile-First..."
if .claude/scripts/check-mobile-first.sh; then
  echo "✅ Mobile-First : OK"
else
  echo "❌ ERREUR: Code desktop-first détecté"
  total_errors=$((total_errors + 1))
fi
echo ""

# 7. Vérifier architecture hooks Supabase
echo "🗄️ [7/7] Vérification architecture hooks Supabase..."
if .claude/scripts/check-supabase-hooks.sh; then
  echo "✅ Architecture hooks : OK"
else
  echo "❌ ERREUR: Queries Supabase directes détectées"
  total_errors=$((total_errors + 1))
fi
echo ""

# Résumé final
echo "=========================================="
if [ $total_errors -eq 0 ]; then
  echo "✅ SUCCÈS : Toutes les vérifications passées !"
  echo "=========================================="
  echo ""
  echo "✓ Code prêt pour commit"
  echo ""
  exit 0
else
  echo "❌ ÉCHEC : $total_errors vérification(s) échouée(s)"
  echo "=========================================="
  echo ""
  echo "⚠️ Corriger les erreurs avant de commit"
  echo ""
  exit 1
fi
