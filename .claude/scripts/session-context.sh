#!/bin/bash
# Script de contexte session pour Appli-Picto
# Affiche informations utiles au démarrage de session Claude Code

set -e

echo ""
echo "📊 =========================================="
echo "📊 Contexte Appli-Picto"
echo "📊 =========================================="
echo ""

# Branch Git actuelle
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "N/A")
echo "🌿 Branch actuelle : $CURRENT_BRANCH"
echo ""

# Derniers commits
echo "📝 Derniers commits :"
git log -3 --oneline 2>/dev/null || echo "   Aucun commit"
echo ""

# Statut Supabase local
echo "🗄️ Supabase local :"
if supabase status &>/dev/null; then
  echo "   ✅ Running"
  # Afficher URL API si disponible
  API_URL=$(supabase status 2>/dev/null | grep "API URL" | awk '{print $3}' || echo "")
  if [ -n "$API_URL" ]; then
    echo "   → API: $API_URL"
  fi
else
  echo "   ⚠️  Stopped"
  echo "   → Démarrer avec: pnpm supabase:start"
fi
echo ""

# Dev server Next.js
echo "🚀 Dev server Next.js :"
if lsof -ti:3000 &>/dev/null; then
  echo "   ✅ Running sur port 3000"
  echo "   → http://localhost:3000"
else
  echo "   ⚠️  Stopped"
  echo "   → Démarrer avec: pnpm dev"
fi
echo ""

# Fichiers modifiés non commités
UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | xargs)
if [ "$UNCOMMITTED" -gt 0 ]; then
  echo "⚠️  $UNCOMMITTED fichier(s) modifié(s) non commité(s)"
  echo "   → Voir: git status"
  echo ""
fi

echo "=========================================="
echo ""

exit 0
