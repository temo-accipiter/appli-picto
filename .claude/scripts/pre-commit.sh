#!/bin/bash
# Script de vérification avant commit pour Appli-Picto
# Vérifie lint, format, tests, mobile-first, et architecture hooks

set -e

echo ""
echo "🔍 =========================================="
echo "🔍 Vérifications avant commit (Appli-Picto)"
echo "🔍 =========================================="
echo ""

# Compteur d'erreurs total
total_errors=0

# 1. Vérifier lint + format
echo "📝 [1/4] Vérification lint + format..."
if pnpm check; then
  echo "✅ Lint + format : OK"
else
  echo "❌ ERREUR: pnpm check a échoué"
  echo "   → Exécuter: pnpm check"
  total_errors=$((total_errors + 1))
fi
echo ""

# 2. Vérifier tests
echo "🧪 [2/4] Vérification tests unitaires..."
if pnpm test run --passWithNoTests 2>/dev/null; then
  echo "✅ Tests unitaires : OK"
else
  echo "❌ ERREUR: pnpm test a échoué"
  echo "   → Corriger les tests avant commit"
  total_errors=$((total_errors + 1))
fi
echo ""

# 3. Vérifier Mobile-First
echo "📱 [3/4] Vérification Mobile-First..."
if .claude/scripts/check-mobile-first.sh; then
  echo "✅ Mobile-First : OK"
else
  echo "❌ ERREUR: Code desktop-first détecté"
  total_errors=$((total_errors + 1))
fi
echo ""

# 4. Vérifier architecture hooks Supabase
echo "🗄️ [4/4] Vérification architecture hooks Supabase..."
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
