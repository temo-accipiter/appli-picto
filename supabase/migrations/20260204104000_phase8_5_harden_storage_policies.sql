-- Migration: Phase 8.5 — Harden Storage Policies (UUID strict + hardening complet)
-- Date: 2026-02-04
--
-- Objectif:
-- Corriger Phase 8.4 avec regex UUID stricte (case-insensitive, ancrée) + hardening complet
--
-- Corrections appliquées:
-- 1. Regex UUID case-insensitive [0-9a-fA-F] (accepte majuscules/minuscules)
-- 2. Ancrage regex début/fin (^ et $) pour refuser "<uuid>garbage"
-- 3. Extension optionnelle stricte: (\.[A-Za-z0-9]{1,10})?
-- 4. Hardening complet sur TOUTES policies:
--    - Segments non vides (split_part <> '')
--    - Directory traversal (NOT LIKE '%..%')
--    - Validations cohérentes SELECT/INSERT/DELETE/UPDATE
-- 5. personal: 2 segments, owner-only, UPDATE interdit
-- 6. bank: 1 segment (NOT LIKE '%/%'), admin INSERT/UPDATE/DELETE
--
-- Décisions appliquées:
-- - D2: Admin exclu personal-images (zéro policy admin)
-- - Ownership: Path source-of-truth strict
-- - Immutabilité: UPDATE personal interdit (aucune policy)
-- - Prévisibilité TSA: Paths stricts (refuse chemins ambigus/invalides)
--
-- Note: DROP/RECREATE policies Phase 8.4 (idempotent si 8.4 non appliqué)

BEGIN;

-- ============================================================
-- DROP policies Phase 8.4 (idempotent)
-- ============================================================
DROP POLICY IF EXISTS personal_images_select_owner_strict ON storage.objects;
DROP POLICY IF EXISTS personal_images_insert_owner_strict ON storage.objects;
DROP POLICY IF EXISTS personal_images_delete_owner_strict ON storage.objects;
DROP POLICY IF EXISTS bank_images_select_public_strict ON storage.objects;
DROP POLICY IF EXISTS bank_images_insert_admin_strict ON storage.objects;
DROP POLICY IF EXISTS bank_images_update_admin_strict ON storage.objects;
DROP POLICY IF EXISTS bank_images_delete_admin_strict ON storage.objects;

-- ============================================================
-- PERSONAL-IMAGES: SELECT owner-only (UUID strict + hardening)
-- ============================================================
-- Path: <account_uuid>/<card_uuid>(.<ext>)
-- Validations:
-- - Ownership: split_part(name,'/',1) = auth.uid()
-- - 2 segments exactement
-- - Segments non vides
-- - UUID strict case-insensitive ancrée
-- - Extension optionnelle
-- - Pas de directory traversal

CREATE POLICY personal_images_select_owner_v2
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'personal-images'
    -- Ownership: premier segment = auth.uid()
    AND split_part(name, '/', 1) = auth.uid()::text
    -- 2 segments exactement (pas 1, pas 3+)
    AND array_length(regexp_split_to_array(name, '/'), 1) = 2
    -- Segments non vides (refuse uid/, uid//)
    AND split_part(name, '/', 1) <> ''
    AND split_part(name, '/', 2) <> ''
    -- Segment 2: UUID strict (case-insensitive, ancrée) + extension optionnelle
    AND split_part(name, '/', 2) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(\.[A-Za-z0-9]{1,10})?$'
    -- Directory traversal interdit
    AND name NOT LIKE '%..%'
  );

-- ============================================================
-- PERSONAL-IMAGES: INSERT owner-only (UUID strict + hardening)
-- ============================================================
CREATE POLICY personal_images_insert_owner_v2
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'personal-images'
    -- Ownership: premier segment = auth.uid()
    AND split_part(name, '/', 1) = auth.uid()::text
    -- 2 segments exactement
    AND array_length(regexp_split_to_array(name, '/'), 1) = 2
    -- Segments non vides
    AND split_part(name, '/', 1) <> ''
    AND split_part(name, '/', 2) <> ''
    -- Segment 2: UUID strict + extension optionnelle
    AND split_part(name, '/', 2) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(\.[A-Za-z0-9]{1,10})?$'
    -- Directory traversal interdit
    AND name NOT LIKE '%..%'
  );

-- ============================================================
-- PERSONAL-IMAGES: DELETE owner-only (UUID strict + hardening)
-- ============================================================
CREATE POLICY personal_images_delete_owner_v2
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'personal-images'
    -- Ownership: premier segment = auth.uid()
    AND split_part(name, '/', 1) = auth.uid()::text
    -- 2 segments exactement
    AND array_length(regexp_split_to_array(name, '/'), 1) = 2
    -- Segments non vides
    AND split_part(name, '/', 1) <> ''
    AND split_part(name, '/', 2) <> ''
    -- Segment 2: UUID strict + extension optionnelle
    AND split_part(name, '/', 2) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(\.[A-Za-z0-9]{1,10})?$'
    -- Directory traversal interdit
    AND name NOT LIKE '%..%'
  );

-- ============================================================
-- PERSONAL-IMAGES: UPDATE INTERDIT (immutabilité)
-- ============================================================
-- Aucune policy UPDATE = blocage automatique
-- Raison: Immutabilité images personal (cohérent Phase 7.0 trigger)
-- Remplacement = DELETE + INSERT

-- ============================================================
-- BANK-IMAGES: SELECT public (UUID strict + hardening)
-- ============================================================
-- Path: <card_uuid>(.<ext>)
-- Validations:
-- - 1 segment (pas de /)
-- - Nom non vide
-- - UUID strict case-insensitive ancrée
-- - Extension optionnelle
-- - Pas de directory traversal

CREATE POLICY bank_images_select_public_v2
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'bank-images'
    -- 1 segment (pas de slash)
    AND name NOT LIKE '%/%'
    -- Nom non vide
    AND name <> ''
    -- UUID strict + extension optionnelle (ancrée)
    AND name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(\.[A-Za-z0-9]{1,10})?$'
    -- Directory traversal interdit
    AND name NOT LIKE '%..%'
  );

-- ============================================================
-- BANK-IMAGES: INSERT admin (UUID strict + hardening)
-- ============================================================
CREATE POLICY bank_images_insert_admin_v2
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bank-images'
    AND public.is_admin()
    -- 1 segment (pas de slash)
    AND name NOT LIKE '%/%'
    -- Nom non vide
    AND name <> ''
    -- UUID strict + extension optionnelle (ancrée)
    AND name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(\.[A-Za-z0-9]{1,10})?$'
    -- Directory traversal interdit
    AND name NOT LIKE '%..%'
  );

-- ============================================================
-- BANK-IMAGES: UPDATE admin (UUID strict + hardening)
-- ============================================================
CREATE POLICY bank_images_update_admin_v2
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'bank-images'
    AND public.is_admin()
    -- 1 segment (pas de slash)
    AND name NOT LIKE '%/%'
    -- Nom non vide
    AND name <> ''
    -- UUID strict + extension optionnelle (ancrée)
    AND name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(\.[A-Za-z0-9]{1,10})?$'
    -- Directory traversal interdit
    AND name NOT LIKE '%..%'
  )
  WITH CHECK (
    bucket_id = 'bank-images'
    AND public.is_admin()
    AND name NOT LIKE '%/%'
    AND name <> ''
    AND name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(\.[A-Za-z0-9]{1,10})?$'
    AND name NOT LIKE '%..%'
  );

-- ============================================================
-- BANK-IMAGES: DELETE admin (UUID strict + hardening)
-- ============================================================
CREATE POLICY bank_images_delete_admin_v2
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bank-images'
    AND public.is_admin()
    -- 1 segment (pas de slash)
    AND name NOT LIKE '%/%'
    -- Nom non vide
    AND name <> ''
    -- UUID strict + extension optionnelle (ancrée)
    AND name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(\.[A-Za-z0-9]{1,10})?$'
    -- Directory traversal interdit
    AND name NOT LIKE '%..%'
  );

-- ============================================================
-- Commentaires policies (conformité DB-first)
-- ============================================================
COMMENT ON POLICY personal_images_select_owner_v2 ON storage.objects IS
  'Owner-only SELECT: <uuid>/<uuid>(.<ext>). UUID case-insensitive strict. D2: admin excluded.';

COMMENT ON POLICY personal_images_insert_owner_v2 ON storage.objects IS
  'Owner-only INSERT: <uuid>/<uuid>(.<ext>). UUID strict ancrée, extension optionnelle, no traversal.';

COMMENT ON POLICY personal_images_delete_owner_v2 ON storage.objects IS
  'Owner-only DELETE: <uuid>/<uuid>(.<ext>). UUID strict, 2 segments, no traversal.';

COMMENT ON POLICY bank_images_select_public_v2 ON storage.objects IS
  'Public SELECT: <uuid>(.<ext>). UUID strict ancrée, 1 segment, no traversal.';

COMMENT ON POLICY bank_images_insert_admin_v2 ON storage.objects IS
  'Admin INSERT: <uuid>(.<ext>). UUID strict, no slash, is_admin() enforced.';

COMMENT ON POLICY bank_images_update_admin_v2 ON storage.objects IS
  'Admin UPDATE: <uuid>(.<ext>). UUID strict, hardening complet.';

COMMENT ON POLICY bank_images_delete_admin_v2 ON storage.objects IS
  'Admin DELETE: <uuid>(.<ext>). UUID strict, hardening complet.';

-- ============================================================
-- Vérifications post-hardening
-- ============================================================
DO $$
DECLARE
  v_policy_count INTEGER;
  v_personal_update_count INTEGER;
BEGIN
  -- Vérifier 3 policies personal-images (SELECT, INSERT, DELETE)
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'personal_images_%_v2';

  IF v_policy_count <> 3 THEN
    RAISE EXCEPTION 'FAIL: Expected 3 v2 policies for personal-images, got %', v_policy_count;
  END IF;

  -- Vérifier aucune policy UPDATE sur personal-images
  SELECT COUNT(*) INTO v_personal_update_count
  FROM pg_policies
  WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'personal_images_%'
  AND cmd = 'UPDATE';

  IF v_personal_update_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: UPDATE policy should NOT exist on personal-images (got %)', v_personal_update_count;
  END IF;

  -- Vérifier 4 policies bank-images (SELECT, INSERT, UPDATE, DELETE)
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'bank_images_%_v2';

  IF v_policy_count <> 4 THEN
    RAISE EXCEPTION 'FAIL: Expected 4 v2 policies for bank-images, got %', v_policy_count;
  END IF;

  -- Vérifier aucune ancienne policy Phase 8.4 (cleanup)
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%_strict';

  IF v_policy_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: Old _strict policies should be dropped (got %)', v_policy_count;
  END IF;

  RAISE NOTICE 'PASS: Phase 8.5 hardening applied (7 v2 policies, UUID strict case-insensitive, no UPDATE personal, old policies cleaned)';
END $$;

COMMIT;
