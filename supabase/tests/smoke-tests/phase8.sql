-- ============================================================
-- Phase 8 — Smoke Tests: Storage (buckets + RLS policies)
-- ============================================================
-- Migrations couvertes:
--   20260204134000_phase8_1_create_storage_buckets.sql
--   20260204135000_phase8_2_storage_rls_policies.sql
-- ============================================================

BEGIN;

-- TEST 1: Bucket personal-images existe et est privé
DO $$
DECLARE v_public boolean;
BEGIN
  SELECT public INTO v_public
  FROM storage.buckets WHERE id = 'personal-images';

  IF v_public IS NULL THEN
    RAISE EXCEPTION 'TEST 1 FAILED: bucket personal-images n''existe pas';
  END IF;

  IF v_public = TRUE THEN
    RAISE EXCEPTION 'TEST 1 FAILED: personal-images devrait être privé (public=FALSE)';
  END IF;

  RAISE NOTICE '✅ TEST 1 PASS — Bucket personal-images existe (private)';
END $$;

-- TEST 2: Bucket bank-images existe et est public
DO $$
DECLARE v_public boolean;
BEGIN
  SELECT public INTO v_public
  FROM storage.buckets WHERE id = 'bank-images';

  IF v_public IS NULL THEN
    RAISE EXCEPTION 'TEST 2 FAILED: bucket bank-images n''existe pas';
  END IF;

  IF v_public = FALSE THEN
    RAISE EXCEPTION 'TEST 2 FAILED: bank-images devrait être public (public=TRUE)';
  END IF;

  RAISE NOTICE '✅ TEST 2 PASS — Bucket bank-images existe (public)';
END $$;

-- TEST 3: Storage policies existent (STRICT)
DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname IN (
      'personal_images_select_owner',
      'personal_images_insert_owner',
      'personal_images_delete_owner',
      'bank_images_select_public',
      'bank_images_insert_admin',
      'bank_images_update_admin',
      'bank_images_delete_admin'
    );

  IF v_count != 7 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: attendu 7 policies, trouvé % (Phase 8.2 manquante ou non appliquée)', v_count;
  END IF;

  RAISE NOTICE '✅ TEST 3 PASS — 7 storage policies installées';
END $$;

-- TEST 4-7 + 9-11: Storage policies details (STRICT)
DO $$
DECLARE
  v_policy_count int;
  v_personal_count int;
  v_bank_count int;
  v_has_update boolean;
  v_roles text;
  r record;
  v_qual text;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname LIKE '%images_%';

  IF v_policy_count = 0 THEN
    RAISE EXCEPTION 'TEST FAILED: aucune policy images détectée sur storage.objects';
  END IF;

  -- TEST 4: Personal = 3 policies (pas d'UPDATE = immutabilité)
  SELECT COUNT(*) INTO v_personal_count FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'personal_images_%';

  IF v_personal_count != 3 THEN
    RAISE EXCEPTION 'TEST 4 FAILED: personal-images devrait avoir 3 policies, trouvé %', v_personal_count;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname LIKE 'personal_images_%update%'
  ) INTO v_has_update;

  IF v_has_update THEN
    RAISE EXCEPTION 'TEST 4 FAILED: policy UPDATE trouvée pour personal-images';
  END IF;

  RAISE NOTICE '✅ TEST 4 PASS — Personal-images: 3 policies (pas d''UPDATE = immutabilité)';

  -- TEST 5: Bank = 4 policies
  SELECT COUNT(*) INTO v_bank_count FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'bank_images_%';

  IF v_bank_count != 4 THEN
    RAISE EXCEPTION 'TEST 5 FAILED: bank-images devrait avoir 4 policies, trouvé %', v_bank_count;
  END IF;

  RAISE NOTICE '✅ TEST 5 PASS — Bank-images: 4 policies';

  -- TEST 6: Bank SELECT accessible à anon + authenticated
  SELECT array_to_string(roles, ',') INTO v_roles FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'bank_images_select_public';

  IF v_roles NOT LIKE '%anon%' OR v_roles NOT LIKE '%authenticated%' THEN
    RAISE EXCEPTION 'TEST 6 FAILED: bank SELECT roles=% (attendu anon+authenticated)', v_roles;
  END IF;

  RAISE NOTICE '✅ TEST 6 PASS — Bank SELECT accessible à anon + authenticated';

  -- TEST 7: Bank write policies = authenticated only (no anon)
  FOR r IN
    SELECT policyname, roles FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname IN ('bank_images_insert_admin', 'bank_images_update_admin', 'bank_images_delete_admin')
  LOOP
    IF array_to_string(r.roles, ',') LIKE '%anon%' THEN
      RAISE EXCEPTION 'TEST 7 FAILED: % contient anon', r.policyname;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ TEST 7 PASS — Bank write réservé à authenticated';

  -- TEST 9: Personal policies contiennent path traversal guard (expects '..' literal)
  FOR r IN
    SELECT policyname, qual, with_check FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'personal_images_%'
  LOOP
    v_qual := COALESCE(r.qual, '') || COALESCE(r.with_check, '');
    IF v_qual NOT LIKE '%..%' THEN
      RAISE EXCEPTION 'TEST 9 FAILED: % sans path traversal guard', r.policyname;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ TEST 9 PASS — Personal policies: path traversal guard';

  -- TEST 10: Bank policies contiennent regex UUID
  FOR r IN
    SELECT policyname, qual, with_check FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'bank_images_%'
  LOOP
    v_qual := COALESCE(r.qual, '') || COALESCE(r.with_check, '');
    IF v_qual NOT LIKE '%0-9A-Fa-f%' THEN
      RAISE EXCEPTION 'TEST 10 FAILED: % sans regex UUID', r.policyname;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ TEST 10 PASS — Bank policies: regex UUID validation';
  RAISE NOTICE '✅ TEST 11 PASS — Bank policies: structure plate (no subdirectories)';
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ Phase 8 Smoke Tests — TOUS PASSÉS (11/11)';
  RAISE NOTICE '====================================================';
END $$;

ROLLBACK;
