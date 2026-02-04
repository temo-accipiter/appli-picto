BEGIN;

-- ============================================================================
-- Phase 8.2 — Storage RLS policies (privileged migration)
-- ============================================================================
-- CONTEXT: This migration must be run as supabase_admin (superuser) because:
--   1. The standard migration runner (postgres) cannot modify storage.objects
--   2. supabase_storage_admin cannot access auth.uid() (no permission on auth schema)
--   3. supabase_admin (superuser) can do both
-- 
-- EXECUTION: Via scripts/db-reset.sh using psql with supabase_admin credentials.
-- DO NOT use SET ROLE supabase_storage_admin (breaks auth.uid() access).
-- ============================================================================

-- ✅ CANARY: Verify we're running as superuser
DO $$
DECLARE
  v_is_superuser boolean;
BEGIN
  SELECT rolsuper INTO v_is_superuser
  FROM pg_roles
  WHERE rolname = current_user;

  IF v_is_superuser IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL: Must run as superuser (supabase_admin). Current user: %', current_user;
  END IF;

  RAISE NOTICE 'PASS: Running as superuser (%)', current_user;
END $$;

-- Step 1: Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_rls boolean;
BEGIN
  SELECT c.relrowsecurity INTO v_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'storage' AND c.relname = 'objects';

  IF v_rls IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'FAIL: storage.objects RLS not enabled';
  END IF;

  RAISE NOTICE 'PASS: storage.objects RLS enabled';
END $$;

-- Step 2: Verify buckets exist (created by Phase 8.1)
DO $$
DECLARE
  v_cnt int;
BEGIN
  SELECT count(*) INTO v_cnt
  FROM storage.buckets
  WHERE id IN ('personal-images', 'bank-images');

  IF v_cnt <> 2 THEN
    RAISE EXCEPTION 'FAIL: Expected 2 storage buckets, found %. Run Phase 8.1 first.', v_cnt;
  END IF;

  RAISE NOTICE 'PASS: Both storage buckets exist';
END $$;

-- Step 3: Drop existing policies (idempotent)
DROP POLICY IF EXISTS personal_images_select_owner ON storage.objects;
DROP POLICY IF EXISTS personal_images_insert_owner ON storage.objects;
DROP POLICY IF EXISTS personal_images_delete_owner ON storage.objects;

DROP POLICY IF EXISTS bank_images_select_public ON storage.objects;
DROP POLICY IF EXISTS bank_images_insert_admin ON storage.objects;
DROP POLICY IF EXISTS bank_images_update_admin ON storage.objects;
DROP POLICY IF EXISTS bank_images_delete_admin ON storage.objects;

-- ============================================================================
-- PERSONAL-IMAGES BUCKET POLICIES
-- Pattern: {account_id}/{uuid}.{ext}
-- Only owner can SELECT/INSERT/DELETE. No UPDATE (immutability).
-- ============================================================================

CREATE POLICY personal_images_select_owner
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'personal-images'
  AND auth.uid() IS NOT NULL
  AND name NOT LIKE '%..%'
  AND array_length(regexp_split_to_array(name, '/'), 1) = 2
  AND split_part(name, '/', 1) = auth.uid()::text
  AND split_part(name, '/', 2) <> ''
  AND split_part(name, '/', 2) ~ '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}(\.[A-Za-z0-9]{1,10})?$'
);

CREATE POLICY personal_images_insert_owner
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'personal-images'
  AND auth.uid() IS NOT NULL
  AND name NOT LIKE '%..%'
  AND array_length(regexp_split_to_array(name, '/'), 1) = 2
  AND split_part(name, '/', 1) = auth.uid()::text
  AND split_part(name, '/', 2) <> ''
  AND split_part(name, '/', 2) ~ '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}(\.[A-Za-z0-9]{1,10})?$'
);

CREATE POLICY personal_images_delete_owner
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'personal-images'
  AND auth.uid() IS NOT NULL
  AND name NOT LIKE '%..%'
  AND array_length(regexp_split_to_array(name, '/'), 1) = 2
  AND split_part(name, '/', 1) = auth.uid()::text
  AND split_part(name, '/', 2) <> ''
  AND split_part(name, '/', 2) ~ '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}(\.[A-Za-z0-9]{1,10})?$'
);

-- No UPDATE policy for personal-images (immutability by design)

-- ============================================================================
-- BANK-IMAGES BUCKET POLICIES
-- Pattern: {uuid}.{ext} (flat structure, no subdirectories)
-- Public SELECT. Admin-only INSERT/UPDATE/DELETE.
-- ============================================================================

CREATE POLICY bank_images_select_public
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'bank-images'
  AND name <> ''
  AND name NOT LIKE '%..%'
  AND name NOT LIKE '%/%'
  AND name ~ '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}(\.[A-Za-z0-9]{1,10})?$'
);

CREATE POLICY bank_images_insert_admin
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bank-images'
  AND public.is_admin()
  AND name <> ''
  AND name NOT LIKE '%..%'
  AND name NOT LIKE '%/%'
  AND name ~ '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}(\.[A-Za-z0-9]{1,10})?$'
);

CREATE POLICY bank_images_update_admin
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'bank-images'
  AND public.is_admin()
  AND name <> ''
  AND name NOT LIKE '%..%'
  AND name NOT LIKE '%/%'
  AND name ~ '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}(\.[A-Za-z0-9]{1,10})?$'
)
WITH CHECK (
  bucket_id = 'bank-images'
  AND public.is_admin()
  AND name <> ''
  AND name NOT LIKE '%..%'
  AND name NOT LIKE '%/%'
  AND name ~ '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}(\.[A-Za-z0-9]{1,10})?$'
);

CREATE POLICY bank_images_delete_admin
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'bank-images'
  AND public.is_admin()
  AND name <> ''
  AND name NOT LIKE '%..%'
  AND name NOT LIKE '%/%'
  AND name ~ '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}(\.[A-Za-z0-9]{1,10})?$'
);

-- ============================================================================
-- FINAL VALIDATION
-- ============================================================================

DO $$
DECLARE
  v_cnt int;
BEGIN
  SELECT count(*) INTO v_cnt
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

  IF v_cnt <> 7 THEN
    RAISE EXCEPTION 'FAIL: Expected 7 storage.objects policies, found %', v_cnt;
  END IF;

  RAISE NOTICE 'PASS: Phase 8.2 complete — 7 storage policies installed';
END $$;

COMMIT;