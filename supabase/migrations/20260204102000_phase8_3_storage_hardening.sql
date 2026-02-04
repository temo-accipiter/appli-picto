-- Migration: Phase 8.3 — Storage Hardening (optionnel)
-- Date: 2026-02-04
--
-- Objectif:
-- Durcir sécurité Storage avec vérifications supplémentaires
--
-- Hardenings appliqués:
-- - Vérifier format path strict (2 segments pour personal, 1 pour bank)
-- - Empêcher paths "malformés" (bypass attempts)
-- - Canary test: vérifier qu'UPDATE personal-images est bien bloqué
--
-- Note: Cette migration est OPTIONNELLE mais RECOMMANDÉE pour environnement production
--
-- Décisions appliquées:
-- - Defense-in-depth: policies + path validation
-- - TSA critical: pas de surprise (chemins prévisibles uniquement)

BEGIN;

-- ============================================================
-- Hardening: Path validation strict (personal-images)
-- ============================================================
-- Objectif: Empêcher upload paths malformés (ex: /../../bypass)
-- Règle: path doit avoir EXACTEMENT 2 segments (/<account_id>/<card_id>.<ext>)

-- Remplacer policy INSERT pour ajouter validation path
DROP POLICY IF EXISTS personal_images_insert_owner ON storage.objects;

CREATE POLICY personal_images_insert_owner
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'personal-images'
    -- Ownership via path (premier segment = auth.uid())
    AND split_part(name, '/', 1) = auth.uid()::text
    -- Path validation: doit avoir exactement 2 segments (/<account_id>/<filename>)
    AND array_length(string_to_array(name, '/'), 1) = 2
    -- Interdire paths avec '..' (directory traversal)
    AND name NOT LIKE '%..%'
    -- Interdire paths commençant par '/' (absolus)
    AND name NOT LIKE '/%/%'
  );

COMMENT ON POLICY personal_images_insert_owner ON storage.objects IS
  'Owner-only: user can upload personal image with strict path validation (2 segments, no traversal)';

-- ============================================================
-- Hardening: Path validation strict (bank-images)
-- ============================================================
-- Objectif: Empêcher upload paths malformés admin
-- Règle: path doit avoir EXACTEMENT 1 segment (/<card_id>.<ext>)

-- Remplacer policy INSERT pour ajouter validation path
DROP POLICY IF EXISTS bank_images_insert_admin ON storage.objects;

CREATE POLICY bank_images_insert_admin
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bank-images'
    AND public.is_admin()
    -- Path validation: doit avoir exactement 1 segment (/<filename>)
    AND array_length(string_to_array(name, '/'), 1) = 1
    -- Interdire paths avec '..'
    AND name NOT LIKE '%..%'
  );

COMMENT ON POLICY bank_images_insert_admin ON storage.objects IS
  'Admin-only: admin can upload bank image with strict path validation (1 segment, no traversal)';

-- ============================================================
-- Canary test: Vérifier UPDATE personal-images est bloqué
-- ============================================================
-- Objectif: Prouver qu'aucune policy UPDATE existe sur personal-images
-- Test: compter policies UPDATE (doit être 0)

DO $$
DECLARE
  v_update_policy_count INTEGER;
BEGIN
  -- Compter policies UPDATE sur personal-images (doit être 0)
  SELECT COUNT(*) INTO v_update_policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'personal_images_%'
  AND cmd = 'UPDATE';

  IF v_update_policy_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: UPDATE policy exists on personal-images (immutability violation)';
  END IF;

  RAISE NOTICE 'PASS: UPDATE correctly blocked on personal-images (canary test)';
END $$;

-- ============================================================
-- Vérifications post-hardening
-- ============================================================
-- Les policies doivent avoir validation path stricte

DO $$
DECLARE
  v_policy_def TEXT;
BEGIN
  -- Vérifier policy personal-images contient validation path
  SELECT pg_get_policydef(oid) INTO v_policy_def
  FROM pg_policy
  WHERE polname = 'personal_images_insert_owner';

  IF v_policy_def IS NULL THEN
    RAISE EXCEPTION 'FAIL: Policy personal_images_insert_owner not found after hardening';
  END IF;

  IF v_policy_def NOT LIKE '%array_length%' THEN
    RAISE EXCEPTION 'FAIL: Policy personal_images_insert_owner missing path validation (array_length)';
  END IF;

  -- Vérifier policy bank-images contient validation path
  SELECT pg_get_policydef(oid) INTO v_policy_def
  FROM pg_policy
  WHERE polname = 'bank_images_insert_admin';

  IF v_policy_def IS NULL THEN
    RAISE EXCEPTION 'FAIL: Policy bank_images_insert_admin not found after hardening';
  END IF;

  IF v_policy_def NOT LIKE '%array_length%' THEN
    RAISE EXCEPTION 'FAIL: Policy bank_images_insert_admin missing path validation (array_length)';
  END IF;

  RAISE NOTICE 'PASS: Storage hardening applied successfully (path validation strict)';
END $$;

COMMIT;
