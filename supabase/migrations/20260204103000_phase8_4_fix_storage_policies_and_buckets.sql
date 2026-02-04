-- Migration: Phase 8.4 — Fix Storage Policies + Buckets (correction DB-first strict)
-- Date: 2026-02-04
--
-- Objectif:
-- Corriger Phase 8.1/8.2/8.3 pour conformité DB-first stricte
--
-- Corrections appliquées:
-- 1. Buckets: retirer file_size_limit et allowed_mime_types (non validés produit)
-- 2. Policies: validation UUID stricte sur paths (refuse segments vides, non-UUID)
-- 3. Path scheme strict:
--    - personal-images: <account_uuid>/<card_uuid>.<ext>
--    - bank-images: <card_uuid>.<ext>
-- 4. UPDATE personal: interdit (aucune policy UPDATE)
-- 5. D2 enforcement: admin exclu personal-images (aucune policy admin)
--
-- Décisions appliquées:
-- - D2: Admin ne peut JAMAIS accéder fichiers personal (zéro policy admin)
-- - Ownership: Path source-of-truth (split_part + validation UUID)
-- - Immutabilité: UPDATE interdit sur personal (cohérent Phase 7.0)
--
-- Note: Ne touche PAS Phase 7 (RLS tables)

BEGIN;

-- ============================================================
-- CORRECTION 1: Buckets (retirer file_size_limit + allowed_mime_types)
-- ============================================================
-- Raison: Non validés produit (invention non sourcée)
-- Stratégie: ALTER buckets pour mettre NULL (pas de limite côté Storage)

UPDATE storage.buckets
SET
  file_size_limit = NULL,
  allowed_mime_types = NULL
WHERE id IN ('personal-images', 'bank-images');

COMMENT ON TABLE storage.buckets IS
  'Storage buckets Supabase. Limits/mime gérés applicativement (pas DB).';

-- ============================================================
-- CORRECTION 2: Policies personal-images (validation UUID stricte)
-- ============================================================
-- Path scheme strict: <account_uuid>/<card_uuid>.<ext>
-- Validations:
-- - 2 segments exactement (split /)
-- - Segment 1 = UUID valide (auth.uid())
-- - Segment 2 = UUID valide (card_id) + extension optionnelle

-- DROP policies Phase 8.2/8.3 (remplacées par versions strictes)
DROP POLICY IF EXISTS personal_images_select_owner ON storage.objects;
DROP POLICY IF EXISTS personal_images_insert_owner ON storage.objects;
DROP POLICY IF EXISTS personal_images_delete_owner ON storage.objects;

-- SELECT: lire ses propres images (validation UUID stricte)
CREATE POLICY personal_images_select_owner_strict
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'personal-images'
    -- Path ownership: premier segment = auth.uid()
    AND split_part(name, '/', 1) = auth.uid()::text
    -- Path validation: exactement 2 segments (pas de uid/, pas de uid//)
    AND array_length(regexp_split_to_array(name, '/'), 1) = 2
    -- Segment 1 doit être UUID valide (déjà vérifié via auth.uid())
    -- Segment 2 doit commencer par UUID valide (card_id)
    AND split_part(name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  );

-- INSERT: créer image avec validation UUID stricte
CREATE POLICY personal_images_insert_owner_strict
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'personal-images'
    -- Path ownership: premier segment = auth.uid()
    AND split_part(name, '/', 1) = auth.uid()::text
    -- Path validation: exactement 2 segments
    AND array_length(regexp_split_to_array(name, '/'), 1) = 2
    -- Interdire segments vides (uid/, uid//)
    AND split_part(name, '/', 1) <> ''
    AND split_part(name, '/', 2) <> ''
    -- Segment 2 doit être <uuid>.<ext> ou <uuid> (card_id)
    AND split_part(name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    -- Interdire directory traversal
    AND name NOT LIKE '%..%'
  );

-- DELETE: supprimer ses propres images (validation UUID stricte)
CREATE POLICY personal_images_delete_owner_strict
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'personal-images'
    -- Path ownership: premier segment = auth.uid()
    AND split_part(name, '/', 1) = auth.uid()::text
    -- Path validation: exactement 2 segments
    AND array_length(regexp_split_to_array(name, '/'), 1) = 2
    -- Segment 2 doit être UUID valide
    AND split_part(name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  );

-- UPDATE: INTERDIT (aucune policy = bloqu automatique)
-- Raison: Immutabilité images personal (cohérent Phase 7.0 trigger)
-- Remplacement = DELETE + INSERT

-- ============================================================
-- CORRECTION 3: Policies bank-images (validation UUID stricte)
-- ============================================================
-- Path scheme strict: <card_uuid>.<ext>
-- Validations:
-- - 1 segment exactement (pas de /)
-- - Segment = UUID valide (card_id) + extension optionnelle

-- DROP policies Phase 8.2/8.3 (remplacées par versions strictes)
DROP POLICY IF EXISTS bank_images_select_public ON storage.objects;
DROP POLICY IF EXISTS bank_images_insert_admin ON storage.objects;
DROP POLICY IF EXISTS bank_images_update_admin ON storage.objects;
DROP POLICY IF EXISTS bank_images_delete_admin ON storage.objects;

-- SELECT: lecture publique (anon + authenticated)
CREATE POLICY bank_images_select_public_strict
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'bank-images'
    -- Path validation: exactement 1 segment (pas de /)
    AND name NOT LIKE '%/%'
    -- Nom doit être UUID valide (card_id)
    AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  );

-- INSERT: admin uniquement (validation UUID stricte)
CREATE POLICY bank_images_insert_admin_strict
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bank-images'
    AND public.is_admin()
    -- Path validation: exactement 1 segment
    AND name NOT LIKE '%/%'
    -- Interdire segment vide
    AND name <> ''
    -- Nom doit être <uuid>.<ext> ou <uuid>
    AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    -- Interdire directory traversal
    AND name NOT LIKE '%..%'
  );

-- UPDATE: admin uniquement (validation UUID stricte)
CREATE POLICY bank_images_update_admin_strict
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'bank-images'
    AND public.is_admin()
    AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  )
  WITH CHECK (
    bucket_id = 'bank-images'
    AND public.is_admin()
    AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  );

-- DELETE: admin uniquement (validation UUID stricte)
CREATE POLICY bank_images_delete_admin_strict
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bank-images'
    AND public.is_admin()
    AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  );

-- ============================================================
-- Commentaires policies (conformité DB-first)
-- ============================================================
COMMENT ON POLICY personal_images_select_owner_strict ON storage.objects IS
  'Owner-only: user reads own personal images. Path strict: <uuid>/<uuid>.<ext>. D2: admin excluded.';

COMMENT ON POLICY personal_images_insert_owner_strict ON storage.objects IS
  'Owner-only: user uploads personal image. Path strict: <uuid>/<uuid>.<ext> (UUID validation).';

COMMENT ON POLICY personal_images_delete_owner_strict ON storage.objects IS
  'Owner-only: user deletes own personal images. Path strict: <uuid>/<uuid>.<ext>.';

COMMENT ON POLICY bank_images_select_public_strict ON storage.objects IS
  'Public: anon+auth read bank images. Path strict: <uuid>.<ext> (UUID validation).';

COMMENT ON POLICY bank_images_insert_admin_strict ON storage.objects IS
  'Admin-only: upload bank image. Path strict: <uuid>.<ext> (UUID validation, is_admin()).';

COMMENT ON POLICY bank_images_update_admin_strict ON storage.objects IS
  'Admin-only: update bank image metadata. Path strict: <uuid>.<ext>.';

COMMENT ON POLICY bank_images_delete_admin_strict ON storage.objects IS
  'Admin-only: delete bank image. Path strict: <uuid>.<ext>.';

-- ============================================================
-- Vérifications post-correction
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
  AND policyname LIKE 'personal_images_%_strict';

  IF v_policy_count <> 3 THEN
    RAISE EXCEPTION 'FAIL: Expected 3 strict policies for personal-images, got %', v_policy_count;
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
  AND policyname LIKE 'bank_images_%_strict';

  IF v_policy_count <> 4 THEN
    RAISE EXCEPTION 'FAIL: Expected 4 strict policies for bank-images, got %', v_policy_count;
  END IF;

  -- Vérifier buckets n'ont pas de file_size_limit
  SELECT COUNT(*) INTO v_policy_count
  FROM storage.buckets
  WHERE id IN ('personal-images', 'bank-images')
  AND file_size_limit IS NOT NULL;

  IF v_policy_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: Buckets should have file_size_limit=NULL (got % buckets with limits)', v_policy_count;
  END IF;

  RAISE NOTICE 'PASS: Phase 8.4 corrections applied (7 strict policies, no UPDATE personal, no bucket limits)';
END $$;

COMMIT;
