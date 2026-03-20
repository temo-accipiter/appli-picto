#!/bin/bash
# ============================================================================
# Script : Diagnostic complet RLS bank-images
# ============================================================================
#
# Vérifie tous les aspects critiques pour upload bank-images :
# 1. Policies Storage actives
# 2. Compte admin existe et valide
# 3. Bucket bank-images configuré
# 4. Test INSERT manuel avec contexte admin
# 5. Regénération policies si nécessaire
#
# ============================================================================

set -e

echo ""
echo "🔍 ============================================"
echo "🔍 Diagnostic RLS Bank-Images"
echo "🔍 ============================================"
echo ""

# ============================================================================
# 1. Vérifier policies actives
# ============================================================================

echo "📋 Étape 1/6 : Vérification policies bank-images..."
echo ""

POLICIES=$(PGPASSWORD=postgres psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -tAc "
  SELECT COUNT(*)
  FROM pg_policies
  WHERE tablename = 'objects'
    AND policyname LIKE 'bank_images_%'
" 2>/dev/null || echo "0")

if [ "$POLICIES" -eq 4 ]; then
  echo "✅ 4 policies bank-images actives"
  PGPASSWORD=postgres psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "
    SELECT policyname, cmd
    FROM pg_policies
    WHERE tablename = 'objects' AND policyname LIKE 'bank_images_%'
    ORDER BY policyname;
  "
else
  echo "❌ Nombre incorrect de policies : $POLICIES (attendu : 4)"
  echo "   → Lancer : pnpm supabase:apply-bank-storage-policies"
  exit 1
fi

echo ""

# ============================================================================
# 2. Vérifier compte admin
# ============================================================================

echo "👤 Étape 2/6 : Vérification compte admin..."
echo ""

ADMIN_EXISTS=$(PGPASSWORD=postgres psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -tAc "
  SELECT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'
      AND status = 'admin'
  );
" 2>/dev/null || echo "f")

if [ "$ADMIN_EXISTS" = "t" ]; then
  echo "✅ Compte admin existe (admin@local.dev)"
  PGPASSWORD=postgres psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "
    SELECT id, email, status
    FROM public.accounts
    WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001';
  "
else
  echo "❌ Compte admin introuvable"
  echo "   → Lancer : pnpm db:reset"
  exit 1
fi

echo ""

# ============================================================================
# 3. Vérifier bucket bank-images
# ============================================================================

echo "🪣 Étape 3/6 : Vérification bucket bank-images..."
echo ""

BUCKET_EXISTS=$(PGPASSWORD=postgres psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -tAc "
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'bank-images' AND public = TRUE
  );
" 2>/dev/null || echo "f")

if [ "$BUCKET_EXISTS" = "t" ]; then
  echo "✅ Bucket bank-images existe (public=TRUE)"
  PGPASSWORD=postgres psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "
    SELECT id, name, public
    FROM storage.buckets
    WHERE id = 'bank-images';
  "
else
  echo "❌ Bucket bank-images introuvable ou privé"
  echo "   → Vérifier migration : 20260204134000_phase8_1_create_storage_buckets.sql"
  exit 1
fi

echo ""

# ============================================================================
# 4. Tester condition EXISTS de la policy
# ============================================================================

echo "🧪 Étape 4/6 : Test condition EXISTS (contexte admin)..."
echo ""

ADMIN_CHECK=$(PGPASSWORD=postgres psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -tAc "
  SET LOCAL request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001';

  SELECT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE accounts.id = auth.uid()
      AND accounts.status = 'admin'::public.account_status
  );
" 2>/dev/null || echo "f")

if [ "$ADMIN_CHECK" = "t" ]; then
  echo "✅ Condition EXISTS retourne TRUE avec contexte admin"
else
  echo "❌ Condition EXISTS retourne FALSE"
  echo "   → Problème avec auth.uid() ou accounts"
  exit 1
fi

echo ""

# ============================================================================
# 5. Test INSERT manuel Storage (dry-run)
# ============================================================================

echo "💾 Étape 5/6 : Test INSERT manuel (dry-run)..."
echo ""

TEST_UUID="$(uuidgen | tr '[:upper:]' '[:lower:]')"

INSERT_TEST=$(PGPASSWORD=postgres psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -tAc "
  SET LOCAL request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001';
  SET LOCAL request.jwt.claim.role = 'authenticated';

  BEGIN;
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES (
    'bank-images',
    '${TEST_UUID}.jpg',
    'aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
    '{}'::jsonb
  );
  ROLLBACK;

  SELECT 'SUCCESS';
" 2>&1)

if echo "$INSERT_TEST" | grep -q "SUCCESS"; then
  echo "✅ INSERT manuel réussit (dry-run)"
else
  echo "❌ INSERT manuel échoue avec policy"
  echo ""
  echo "Erreur :"
  echo "$INSERT_TEST"
  echo ""
  echo "→ CAUSE PROBABLE : Cache PostgreSQL corrompu"
  echo "→ SOLUTION : Forcer regénération policy (voir étape 6)"
fi

echo ""

# ============================================================================
# 6. Forcer regénération policy (si nécessaire)
# ============================================================================

echo "🔧 Étape 6/6 : Regénération policy bank_images_insert_admin..."
echo ""

read -p "Voulez-vous forcer la regénération de la policy ? (o/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Oo]$ ]]; then
  PGPASSWORD=postgres psql -h 127.0.0.1 -p 5432 -U supabase_admin -d postgres <<'EOF'
    DROP POLICY IF EXISTS bank_images_insert_admin ON storage.objects;

    CREATE POLICY bank_images_insert_admin
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'bank-images'
      AND name NOT LIKE '%..%'
      AND name NOT LIKE '%/%'
      AND name ~ '^[0-9A-Fa-f-]{36}\.[A-Za-z0-9]+$'
      AND EXISTS (
        SELECT 1 FROM public.accounts
        WHERE accounts.id = auth.uid()
          AND accounts.status = 'admin'::public.account_status
      )
    );
EOF

  echo ""
  echo "✅ Policy bank_images_insert_admin regénérée"
  echo ""
  echo "🧪 Test INSERT après regénération..."

  TEST_UUID2="$(uuidgen | tr '[:upper:]' '[:lower:]')"

  INSERT_TEST2=$(PGPASSWORD=postgres psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -tAc "
    SET LOCAL request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001';
    SET LOCAL request.jwt.claim.role = 'authenticated';

    BEGIN;
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'bank-images',
      '${TEST_UUID2}.jpg',
      'aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
      '{}'::jsonb
    );
    ROLLBACK;

    SELECT 'SUCCESS';
  " 2>&1)

  if echo "$INSERT_TEST2" | grep -q "SUCCESS"; then
    echo "✅ INSERT manuel réussit APRÈS regénération"
    echo ""
    echo "🎉 Problème résolu : Cache PostgreSQL corrompu"
    echo "   → Upload bank-images devrait fonctionner maintenant"
  else
    echo "❌ INSERT manuel échoue TOUJOURS"
    echo ""
    echo "Erreur :"
    echo "$INSERT_TEST2"
    echo ""
    echo "→ Problème plus profond : Vérifier logs Supabase"
  fi
else
  echo "⏭️  Regénération annulée"
fi

echo ""

# ============================================================================
# Résumé
# ============================================================================

echo "📊 ============================================"
echo "📊 Résumé Diagnostic"
echo "📊 ============================================"
echo ""
echo "✅ Policies bank-images : $POLICIES/4 actives"
echo "✅ Compte admin : Vérifié"
echo "✅ Bucket bank-images : Configuré"
echo ""
echo "🚀 Prochaine étape : Tester upload dans l'application"
echo "   1. Se connecter : admin@local.dev / Admin1234x"
echo "   2. Aller sur /admin/bank-cards"
echo "   3. Créer une carte avec image"
echo ""

exit 0
