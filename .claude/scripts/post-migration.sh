#!/bin/bash
# Script post-migration Supabase pour Appli-Picto
# Régénère automatiquement schema.sql + types TypeScript après migration

set -e

echo "🔄 Post-migration Supabase : régénération schema + types..."

# Vérifier si supabase CLI est disponible
if ! command -v supabase &> /dev/null; then
  echo "⚠️ ATTENTION: supabase CLI non trouvé"
  echo "   → Installation: brew install supabase/tap/supabase"
  exit 1
fi

# Vérifier si Supabase local tourne
if ! supabase status &> /dev/null; then
  echo "⚠️ ATTENTION: Supabase local ne tourne pas"
  echo "   → Démarrer avec: pnpm supabase:start"
  exit 1
fi

echo "📦 Dump du schéma PostgreSQL..."
pnpm db:dump || {
  echo "❌ ERREUR: Échec dump schéma"
  exit 1
}

echo "✅ Schéma dumpé dans supabase/schema.sql"

echo "🔧 Génération types TypeScript..."
pnpm db:types || {
  echo "❌ ERREUR: Échec génération types"
  exit 1
}

echo "✅ Types générés dans src/types/supabase.ts"

echo ""
echo "✅ Post-migration terminée avec succès !"
echo "   - supabase/schema.sql mis à jour"
echo "   - src/types/supabase.ts régénéré"
echo ""
echo "💡 Ces fichiers sont prêts pour commit"

exit 0
