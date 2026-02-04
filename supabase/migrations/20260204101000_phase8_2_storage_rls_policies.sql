-- Migration: Phase 8.2 — Storage RLS Policies
-- Date: 2026-02-04
--
-- Objectif:
-- Créer policies RLS Supabase Storage pour confidentialité images
--
-- Tables affectées: storage.objects
--
-- Invariants enforced:
-- - personal-images : owner-only (D2 : admin exclu)
-- - bank-images : lecture publique, écriture admin uniquement
-- - UPDATE interdit sur personal-images (immutabilité, cohérent Phase 7.0)
-- - Ownership source-of-truth = path (split_part(name,'/',1) = auth.uid())
--
-- Décisions appliquées:
-- - D2: Admin ne peut JAMAIS accéder fichiers personal (aucune policy admin)
-- - Path scheme: personal-images = /<account_id>/<card_id>.<ext>
-- - Immutabilité: UPDATE interdit (force DELETE+INSERT)
--
-- Note: Utilise is_admin() définie en Phase 7.1 (SECURITY DEFINER minimal)

BEGIN;

-- ============================================================
-- Enable RLS sur storage.objects (si pas déjà actif)
-- ============================================================
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- BUCKET: personal-images (privé owner-only)
-- ============================================================
-- Objectif: Confidentialité absolue images personnelles
-- Règle: path commence par /<account_id>/ où account_id = auth.uid()
-- Admin: AUCUN accès (D2 enforcement au niveau fichier)

-- SELECT: lire ses propres images uniquement
CREATE POLICY personal_images_select_owner
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'personal-images'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- INSERT: créer image dans son propre dossier uniquement
CREATE POLICY personal_images_insert_owner
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'personal-images'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- UPDATE: INTERDIT (aucune policy)
-- Raison: Immutabilité images personal (cohérent Phase 7.0)
-- Remplacement = DELETE + INSERT (contrat TSA "pas de surprise")

-- DELETE: supprimer ses propres images uniquement
CREATE POLICY personal_images_delete_owner
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'personal-images'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- ============================================================
-- BUCKET: bank-images (public lecture, admin écriture)
-- ============================================================
-- Objectif: Images cartes banque accessibles à tous
-- Règle: Lecture publique (anon + authenticated), écriture admin uniquement

-- SELECT: lecture publique (anon + authenticated)
CREATE POLICY bank_images_select_public
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'bank-images'
  );

-- INSERT: admin uniquement (utilise is_admin() Phase 7.1)
CREATE POLICY bank_images_insert_admin
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bank-images'
    AND public.is_admin()
  );

-- UPDATE: admin uniquement (renommage, métadonnées)
CREATE POLICY bank_images_update_admin
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'bank-images'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'bank-images'
    AND public.is_admin()
  );

-- DELETE: admin uniquement (vérif références via trigger Phase 5.8)
CREATE POLICY bank_images_delete_admin
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bank-images'
    AND public.is_admin()
  );

-- ============================================================
-- Commentaires policies
-- ============================================================
COMMENT ON POLICY personal_images_select_owner ON storage.objects IS
  'Owner-only: user can read their own personal images (path ownership, D2 admin excluded)';

COMMENT ON POLICY personal_images_insert_owner ON storage.objects IS
  'Owner-only: user can upload personal image in their own folder (path ownership)';

COMMENT ON POLICY personal_images_delete_owner ON storage.objects IS
  'Owner-only: user can delete their own personal images (path ownership)';

COMMENT ON POLICY bank_images_select_public ON storage.objects IS
  'Public: anon + authenticated can read bank images (public bucket)';

COMMENT ON POLICY bank_images_insert_admin ON storage.objects IS
  'Admin-only: admin can upload bank images (is_admin() Phase 7.1)';

COMMENT ON POLICY bank_images_update_admin ON storage.objects IS
  'Admin-only: admin can update bank images metadata (is_admin())';

COMMENT ON POLICY bank_images_delete_admin ON storage.objects IS
  'Admin-only: admin can delete bank images (is_admin(), trigger checks references)';

-- ============================================================
-- Vérifications post-création
-- ============================================================
-- Les policies doivent exister avec les bons rôles

DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  -- Compter policies personal-images (3 attendues : SELECT, INSERT, DELETE)
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'personal_images_%';

  IF v_policy_count <> 3 THEN
    RAISE EXCEPTION 'FAIL: Expected 3 policies for personal-images, got %', v_policy_count;
  END IF;

  -- Compter policies bank-images (4 attendues : SELECT, INSERT, UPDATE, DELETE)
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'bank_images_%';

  IF v_policy_count <> 4 THEN
    RAISE EXCEPTION 'FAIL: Expected 4 policies for bank-images, got %', v_policy_count;
  END IF;

  -- Vérifier aucune policy UPDATE sur personal-images (immutabilité)
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'personal_images_%'
  AND cmd = 'UPDATE';

  IF v_policy_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: UPDATE policy should NOT exist on personal-images (immutability enforcement)';
  END IF;

  RAISE NOTICE 'PASS: Storage RLS policies created successfully (7 policies: 3 personal + 4 bank, no UPDATE on personal)';
END $$;

COMMIT;
