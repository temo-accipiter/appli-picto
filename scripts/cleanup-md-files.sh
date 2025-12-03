#!/bin/bash

# Script de nettoyage des fichiers Markdown obsolètes
# Projet: Appli-Picto
# Date: 2025-12-01

set -e

echo "🧹 Nettoyage des fichiers Markdown obsolètes..."
echo ""

# Compteur
DELETED=0

# Fonction pour supprimer un fichier
delete_file() {
  if [ -f "$1" ]; then
    rm "$1"
    echo "✅ Supprimé: $1"
    ((DELETED++))
  else
    echo "⚠️  Fichier introuvable (déjà supprimé?): $1"
  fi
}

echo "📂 Suppression des fichiers PHASE_* (racine du projet)..."
delete_file "PHASE_1_EXECUTIVE_SUMMARY.md"
delete_file "PHASE_1_INDEX.md"
delete_file "PHASE_1_MODALS_REFACTORING.md"
delete_file "PHASE_1_QUICK_START.md"
delete_file "PHASE_1_README.md"
delete_file "PHASE_1_START_HERE.md"
delete_file "PHASE_1_TL_DR.md"
delete_file "PHASE_1_VISUAL_GUIDE.md"
delete_file "PHASE_1_DEPENDENCIES.md"
delete_file "PHASE_2_EXPLORATION_INDEX.md"
delete_file "PHASE_2_MODAL_IMPLEMENTATION.md"
delete_file "PHASE_2_QUICK_START.md"
delete_file "PHASE_2_RESPONSIVE_MODAL_EXPLORATION.md"
delete_file "PHASE_3_IMPLEMENTATION_COMPLETE.md"
delete_file "PHASE_3_INDEX.md"
delete_file "PHASE_3_QUICK_REFERENCE.md"
delete_file "PHASE_3_TESTING_GUIDE.md"

echo ""
echo "📂 Suppression des analyses d'architecture..."
delete_file "ARCHITECTURE_ANALYSIS.md"
delete_file "CODEBASE_EXPLORATION_SUMMARY.md"
delete_file "CODEBASE_INDEX.md"
delete_file "ACTION_ITEMS.md"
delete_file "README_ANALYSIS.md"

echo ""
echo "📂 Suppression des rapports de sprint..."
delete_file "SPRINT-1-FINAL-CHANGES.md"
delete_file "SPRINT-1-SUMMARY.md"
delete_file "SPRINT-1-USERMENU-ENHANCEMENTS.md"

echo ""
echo "📂 Suppression des analyses ponctuelles..."
delete_file "ACCESSIBILITY_AUDIT_REPORT.md"
delete_file "ACCESSIBILITY_PATTERNS.md"
delete_file "MODAL_REFACTORING_COMPLETE.md"
delete_file "RESPONSIVE_MODAL_ANALYSIS.md"
delete_file "RESPONSIVE_PATTERNS_REFERENCE.md"
delete_file "TESTS-DND-REPORT.md"

echo ""
echo "📂 Suppression des fichiers MCP non utilisés..."
delete_file ".claude/MCP_CONFIGURATION.md"
delete_file ".claude/MODEL_IDS.md"
delete_file ".claude/VERIFICATION_MODELES.md"

echo ""
echo "📂 Suppression des docs en doublon/obsolètes..."
delete_file "docs/NEXT_PERFORMANCE.md"
delete_file "docs/MONITORING_SYSTEM.md"
delete_file "docs/SUPABASE_HEALTH_CHECK.md"
delete_file "docs/SELECT_WITH_IMAGE_EXAMPLE.md"
delete_file "docs/CHECKLIST_TESTS_QUOTAS.md"
delete_file "docs/TESTS_MANUELS_QUOTAS.md"

echo ""
echo "📂 Suppression du dossier .archive complet..."
if [ -d "docs/.archive" ]; then
  rm -rf "docs/.archive"
  echo "✅ Supprimé: docs/.archive/ (4 fichiers)"
  ((DELETED+=4))
else
  echo "⚠️  Dossier introuvable: docs/.archive/"
fi

echo ""
echo "📂 Suppression des rapports Playwright temporaires..."
if [ -d "playwright-report/data" ]; then
  PLAYWRIGHT_COUNT=$(find playwright-report/data -name "*.md" | wc -l | xargs)
  rm -rf playwright-report/data/*.md 2>/dev/null || true
  echo "✅ Supprimé: playwright-report/data/*.md ($PLAYWRIGHT_COUNT fichiers)"
  ((DELETED+=PLAYWRIGHT_COUNT))
else
  echo "⚠️  Dossier introuvable: playwright-report/data/"
fi

echo ""
echo "📂 Suppression des rapports de tests (test-results/)..."
if [ -d "test-results" ]; then
  TEST_RESULTS_COUNT=$(find test-results -name "*.md" | wc -l | xargs)
  rm -rf test-results
  echo "✅ Supprimé: test-results/ ($TEST_RESULTS_COUNT fichiers)"
  ((DELETED+=TEST_RESULTS_COUNT))
else
  echo "⚠️  Dossier introuvable: test-results/"
fi

echo ""
echo "🎉 Nettoyage terminé !"
echo "📊 Total de fichiers/dossiers supprimés: $DELETED"
echo ""
echo "✅ Fichiers conservés (essentiels):"
echo "   - README.md, CHANGELOG.md, CLAUDE.md"
echo "   - src/assets/legal/*.md (documents légaux)"
echo "   - docs/testing/, docs/RBAC-Quotas/, docs/I18N/"
echo "   - .claude/commands/, .claude/agents/"
echo ""
echo "⚠️  FICHIERS À ÉVALUER MANUELLEMENT (non supprimés):"
echo "   - docs/ci-cd-setup.md"
echo "   - docs/supabase-local-setup.md"
echo "   - docs/stripe-testing.md"
echo "   - docs/phase4-fondations.md"
echo "   - docs/phase5-tests-critiques.md"
echo "   - docs/phase6-accessibilite-et-p1.md"
echo "   - docs/testing/TESTS-REPARTITION.md"
echo ""
echo "💡 Pour supprimer aussi ces fichiers, utilise:"
echo "   rm docs/ci-cd-setup.md docs/supabase-local-setup.md ..."
