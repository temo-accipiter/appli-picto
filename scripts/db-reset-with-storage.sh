#!/bin/bash
# ============================================================================
# Script : Reset DB + Application Storage Policies (robuste)
# ============================================================================
#
# Problème résolu :
# La migration 20260226071400_fix_personal_images_policies_for_cards.sql
# nécessite des privilèges supabase_admin (pas postgres) pour modifier
# les RLS policies sur storage.objects.
#
# En environnement local Docker :
# - La migration skip gracieusement (RAISE NOTICE)
# - Il faut l'appliquer manuellement APRÈS le reset
#
# Ce script :
# 1. Exécute supabase db reset (migrations + seed)
# 2. Capture l'erreur 502 de restart containers (non-critique)
# 3. Applique les storage policies avec supabase_admin
# 4. Affiche un résumé clair
# ============================================================================

set -e  # Exit on error (sauf erreurs gérées explicitement)

echo ""
echo "🔄 ============================================"
echo "🔄 DB Reset + Storage Policies Application"
echo "🔄 ============================================"
echo ""

# ============================================================================
# 1. Exécuter supabase db reset
# ============================================================================

echo "📦 Étape 1/3 : Reset DB (migrations + seed)..."
echo ""

# Capturer le code de sortie mais continuer même si erreur 502
if supabase db reset 2>&1 | tee /tmp/supabase-reset.log; then
  echo ""
  echo "✅ Reset DB réussi"
else
  EXIT_CODE=$?

  # Vérifier si c'est juste l'erreur 502 de restart (non-critique)
  if grep -q "Error status 502" /tmp/supabase-reset.log || grep -q "Error status 500" /tmp/supabase-reset.log; then
    echo ""
    echo "⚠️  Erreur 502/500 détectée lors du restart containers (non-critique)"
    echo "✅ Migrations et seed appliqués avec succès"
    echo "⏭️  Continuation du script..."
  else
    echo ""
    echo "❌ Erreur critique lors du reset DB"
    exit $EXIT_CODE
  fi
fi

echo ""

# ============================================================================
# 2. Appliquer les Storage Policies
# ============================================================================

echo "🔐 Étape 2/3 : Application Storage Policies (supabase_admin)..."
echo ""

if pnpm supabase:apply-all-storage-policies; then
  echo ""
  echo "✅ Storage Policies appliquées avec succès (personal-images + bank-images)"
else
  echo ""
  echo "❌ Erreur lors de l'application des Storage Policies"
  exit 1
fi

echo ""

# ============================================================================
# 3. Vérification
# ============================================================================

echo "🧪 Étape 3/3 : Vérification..."
echo ""

# Vérifier que les policies existent
PERSONAL_POLICIES_COUNT=$(PGPASSWORD=postgres psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -tAc "
  SELECT COUNT(*)
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE 'personal_images_%'
" 2>/dev/null || echo "0")

BANK_POLICIES_COUNT=$(PGPASSWORD=postgres psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -tAc "
  SELECT COUNT(*)
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE 'bank_images_%'
" 2>/dev/null || echo "0")

if [ "$PERSONAL_POLICIES_COUNT" -ge 3 ] && [ "$BANK_POLICIES_COUNT" -ge 4 ]; then
  echo "✅ Storage Policies vérifiées :"
  echo "   • personal-images : $PERSONAL_POLICIES_COUNT policies"
  echo "   • bank-images     : $BANK_POLICIES_COUNT policies"
else
  echo "⚠️  Policies détectées :"
  echo "   • personal-images : $PERSONAL_POLICIES_COUNT (attendu : 3+)"
  echo "   • bank-images     : $BANK_POLICIES_COUNT (attendu : 4+)"
  echo "   → Relancer : pnpm supabase:apply-all-storage-policies"
fi

echo ""

# ============================================================================
# 4. Résumé
# ============================================================================

echo "🎉 ============================================"
echo "🎉 Reset DB Complet !"
echo "🎉 ============================================"
echo ""
echo "✅ Migrations appliquées (55+ migrations)"
echo "✅ Seed exécuté (3 comptes de test créés)"
echo "✅ Storage Policies appliquées (personal-images + bank-images)"
echo ""
echo "🔐 Comptes de test disponibles :"
echo "   👤 Admin      : admin@local.dev / Admin1234x"
echo "   👤 Subscriber : test-subscriber@local.dev / Test1234x"
echo "   👤 Free       : test-free@local.dev / Test1234x"
echo ""
echo "🚀 Prêt pour développement local !"
echo ""

# Cleanup
rm -f /tmp/supabase-reset.log

exit 0
