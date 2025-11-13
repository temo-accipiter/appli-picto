#!/bin/bash
# Script pour créer les issues GitHub après le merge

echo "📝 Création des issues GitHub pour le suivi des erreurs TypeScript"
echo ""

# Vérifier que gh CLI est installé
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) n'est pas installé."
    echo ""
    echo "Installation:"
    echo "  macOS: brew install gh"
    echo "  Linux: voir https://github.com/cli/cli#installation"
    echo ""
    echo "Après installation, authentifiez-vous avec: gh auth login"
    exit 1
fi

# Issue 1: Admin Types
echo "1️⃣ Création de l'issue: [TS] Erreurs TypeScript - Composants Admin"
gh issue create \
  --title "[TS] Corriger les erreurs TypeScript dans les composants Admin" \
  --label "typescript,tech-debt,admin,good-first-issue" \
  --body-file .github/issues/ts-admin-types.md

echo ""

# Issue 2: Shared Types
echo "2️⃣ Création de l'issue: [TS] Erreurs TypeScript - Composants Shared"
gh issue create \
  --title "[TS] Corriger les erreurs TypeScript dans les composants Shared" \
  --label "typescript,tech-debt,ui,shared" \
  --body-file .github/issues/ts-shared-types.md

echo ""

# Issue 3: i18n Types
echo "3️⃣ Création de l'issue: [TS] Erreurs TypeScript - i18n (TFunction)"
gh issue create \
  --title "[TS] Corriger les erreurs TypeScript liées à i18n (TFunction)" \
  --label "typescript,i18n,tech-debt,good-first-issue" \
  --body-file .github/issues/ts-i18n-types.md

echo ""
echo "✅ Toutes les issues ont été créées avec succès !"
echo ""
echo "Voir les issues sur: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/issues"
