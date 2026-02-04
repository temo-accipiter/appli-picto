BEGIN;

-- ============================================================
-- Phase 8 Storage — Smoke Tests Comprehensive
-- ============================================================
-- Date: 2026-02-04
--
-- Usage:
--   psql "postgresql://postgres:postgres@localhost:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/phase8_smoke_tests.sql
--
-- Prerequisites:
--   - Migrations Phase 0-8 applied
--   - Supabase local running (pnpm supabase start)
--
-- Test structure:
--   1. Setup: create test users (A, B, admin)
--   2. Test Storage RLS policies (buckets personal-images, bank-images)
--   3. Test path ownership enforcement
--   4. Test immutabilité (UPDATE blocked)
--   5. Test D2 (admin exclusion from personal-images)
--   6. Cleanup: ROLLBACK (idempotent)
--
-- Result format:
--   - PASS: RAISE NOTICE 'PASS: <test description>'
--   - FAIL: RAISE EXCEPTION 'FAIL: <test description>'
--
-- ============================================================

\set ON_ERROR_STOP on
\timing on

-- ============================================================
-- FORCE RLS for tests (apply RLS even to superusers in tests)
-- ============================================================
ALTER TABLE storage.objects FORCE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets FORCE ROW LEVEL SECURITY;

-- ============================================================
-- SETUP: Create test users + fake storage objects
-- ============================================================
DO $$
DECLARE
  v_user_a_id UUID;
  v_user_b_id UUID;
  v_admin_id UUID;
  v_email_a TEXT;
  v_email_b TEXT;
  v_email_admin TEXT;
BEGIN
  RAISE NOTICE '=== SETUP: Creating test users ===';

  -- Use unique emails per run
  v_email_a := 'test_storage_a_' || replace(gen_random_uuid()::text, '-', '') || '@example.com';
  v_email_b := 'test_storage_b_' || replace(gen_random_uuid()::text, '-', '') || '@example.com';
  v_email_admin := 'test_storage_admin_' || replace(gen_random_uuid()::text, '-', '') || '@example.com';

  -- User A (subscriber)
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
  VALUES (
    gen_random_uuid(),
    v_email_a,
    crypt('password', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated'
  )
  RETURNING id INTO v_user_a_id;

  INSERT INTO public.accounts (id, status, timezone)
  VALUES (v_user_a_id, 'subscriber', 'Europe/Paris');

  RAISE NOTICE 'User A created: % (email=%)', v_user_a_id, v_email_a;

  -- User B (subscriber)
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
  VALUES (
    gen_random_uuid(),
    v_email_b,
    crypt('password', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated'
  )
  RETURNING id INTO v_user_b_id;

  INSERT INTO public.accounts (id, status, timezone)
  VALUES (v_user_b_id, 'subscriber', 'Europe/Paris');

  RAISE NOTICE 'User B created: % (email=%)', v_user_b_id, v_email_b;

  -- Admin user
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
  VALUES (
    gen_random_uuid(),
    v_email_admin,
    crypt('password', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated'
  )
  RETURNING id INTO v_admin_id;

  INSERT INTO public.accounts (id, status, timezone)
  VALUES (v_admin_id, 'admin', 'Europe/Paris');

  RAISE NOTICE 'Admin created: % (email=%)', v_admin_id, v_email_admin;

  -- Store test user IDs in temp table for later tests
  CREATE TEMP TABLE test_storage_users (
    user_id UUID,
    label TEXT
  );

  INSERT INTO test_storage_users VALUES
    (v_user_a_id, 'user_a'),
    (v_user_b_id, 'user_b'),
    (v_admin_id, 'admin');

  GRANT SELECT ON TABLE test_storage_users TO authenticated;
  GRANT SELECT ON TABLE test_storage_users TO anon;

  -- Bypass RLS to insert fake storage.objects for tests
  SET LOCAL row_security = off;

  -- Insert fake personal image for User A (path: /<account_id>/<card_id>.webp)
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES (
    'personal-images',
    v_user_a_id::text || '/card-a-123.webp',
    v_user_a_id,
    '{"size": 50000, "mimetype": "image/webp"}'::jsonb
  );

  -- Insert fake personal image for User B (path: /<account_id>/<card_id>.webp)
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES (
    'personal-images',
    v_user_b_id::text || '/card-b-456.webp',
    v_user_b_id,
    '{"size": 60000, "mimetype": "image/webp"}'::jsonb
  );

  -- Insert fake bank image (public, path: /<card_id>.webp)
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES (
    'bank-images',
    'bank-card-789.webp',
    v_admin_id,
    '{"size": 100000, "mimetype": "image/webp"}'::jsonb
  );

  SET LOCAL row_security = on;

  RAISE NOTICE 'PASS: Test users + fake storage objects created successfully';
END $$;

-- ============================================================
-- TEST Phase 8.1: Buckets created with correct settings
-- ============================================================
DO $$
DECLARE
  v_personal_public BOOLEAN;
  v_bank_public BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST Phase 8.1: Buckets created ===';

  -- Verify personal-images is private
  SELECT public INTO v_personal_public
  FROM storage.buckets
  WHERE id = 'personal-images';

  IF v_personal_public IS NULL THEN
    RAISE EXCEPTION 'FAIL: Bucket personal-images not found';
  END IF;

  IF v_personal_public = TRUE THEN
    RAISE EXCEPTION 'FAIL: Bucket personal-images should be private (public=FALSE)';
  END IF;

  RAISE NOTICE 'PASS: Bucket personal-images is private (public=FALSE)';

  -- Verify bank-images is public
  SELECT public INTO v_bank_public
  FROM storage.buckets
  WHERE id = 'bank-images';

  IF v_bank_public IS NULL THEN
    RAISE EXCEPTION 'FAIL: Bucket bank-images not found';
  END IF;

  IF v_bank_public = FALSE THEN
    RAISE EXCEPTION 'FAIL: Bucket bank-images should be public (public=TRUE)';
  END IF;

  RAISE NOTICE 'PASS: Bucket bank-images is public (public=TRUE)';
END $$;

-- ============================================================
-- TEST Phase 8.2: anon can read bank-images, not personal-images
-- ============================================================
DO $$
DECLARE
  v_test_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST Phase 8.2: anon RLS policies ===';

  -- Enable RLS and switch to anon role
  SET LOCAL row_security = on;
  SET LOCAL ROLE anon;

  -- Set context as anon
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.role', 'anon', true);

  -- Anon should see bank-images
  SELECT COUNT(*) INTO v_test_count
  FROM storage.objects
  WHERE bucket_id = 'bank-images';

  IF v_test_count >= 1 THEN
    RAISE NOTICE 'PASS: anon can read bank-images (% objects)', v_test_count;
  ELSE
    RAISE EXCEPTION 'FAIL: anon should read at least 1 bank-images object';
  END IF;

  -- Anon should NOT see personal-images
  SELECT COUNT(*) INTO v_test_count
  FROM storage.objects
  WHERE bucket_id = 'personal-images';

  IF v_test_count = 0 THEN
    RAISE NOTICE 'PASS: anon cannot read personal-images';
  ELSE
    RAISE EXCEPTION 'FAIL: anon should NOT read personal-images (got %)', v_test_count;
  END IF;

  -- Reset role
  RESET ROLE;
END $$;

-- ============================================================
-- TEST Phase 8.3: User A can read own personal-images, not User B
-- ============================================================
DO $$
DECLARE
  v_user_a_id UUID;
  v_user_b_id UUID;
  v_test_count INTEGER;
  v_user_a_path TEXT;
  v_user_b_path TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST Phase 8.3: authenticated owner-only personal-images ===';

  SELECT user_id INTO v_user_a_id FROM test_storage_users WHERE label = 'user_a';
  SELECT user_id INTO v_user_b_id FROM test_storage_users WHERE label = 'user_b';

  v_user_a_path := v_user_a_id::text || '/card-a-123.webp';
  v_user_b_path := v_user_b_id::text || '/card-b-456.webp';

  -- Enable RLS and switch to authenticated role
  SET LOCAL row_security = on;
  SET LOCAL ROLE authenticated;

  -- Set context as User A
  PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- User A should see their own personal-images
  SELECT COUNT(*) INTO v_test_count
  FROM storage.objects
  WHERE bucket_id = 'personal-images'
  AND name = v_user_a_path;

  IF v_test_count = 1 THEN
    RAISE NOTICE 'PASS: User A can read own personal-images';
  ELSE
    RAISE EXCEPTION 'FAIL: User A should read own personal-images';
  END IF;

  -- User A should NOT see User B personal-images
  SELECT COUNT(*) INTO v_test_count
  FROM storage.objects
  WHERE bucket_id = 'personal-images'
  AND name = v_user_b_path;

  IF v_test_count = 0 THEN
    RAISE NOTICE 'PASS: User A cannot read User B personal-images (RLS isolation)';
  ELSE
    RAISE EXCEPTION 'FAIL: User A should NOT read User B personal-images';
  END IF;

  -- Reset role
  RESET ROLE;
END $$;

-- ============================================================
-- TEST Phase 8.4: D2 - Admin CANNOT read personal-images
-- ============================================================
DO $$
DECLARE
  v_admin_id UUID;
  v_test_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST Phase 8.4: D2 - Admin excluded from personal-images ===';

  SELECT user_id INTO v_admin_id FROM test_storage_users WHERE label = 'admin';

  -- Enable RLS and switch to authenticated role
  SET LOCAL row_security = on;
  SET LOCAL ROLE authenticated;

  -- Set context as Admin
  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Admin should NOT see ANY personal-images (D2 enforcement)
  SELECT COUNT(*) INTO v_test_count
  FROM storage.objects
  WHERE bucket_id = 'personal-images';

  IF v_test_count = 0 THEN
    RAISE NOTICE 'PASS: Admin CANNOT read personal-images (D2 enforcement at file level)';
  ELSE
    RAISE EXCEPTION 'FAIL: Admin should NOT read personal-images (D2 violation, got %)', v_test_count;
  END IF;

  -- Admin should see bank-images (public bucket)
  SELECT COUNT(*) INTO v_test_count
  FROM storage.objects
  WHERE bucket_id = 'bank-images';

  IF v_test_count >= 1 THEN
    RAISE NOTICE 'PASS: Admin can read bank-images (public bucket)';
  ELSE
    RAISE EXCEPTION 'FAIL: Admin should read bank-images';
  END IF;

  -- Reset role
  RESET ROLE;
END $$;

-- ============================================================
-- TEST Phase 8.5: UPDATE blocked on personal-images (immutability)
-- ============================================================
DO $$
DECLARE
  v_user_a_id UUID;
  v_user_a_path TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST Phase 8.5: UPDATE blocked on personal-images ===';

  SELECT user_id INTO v_user_a_id FROM test_storage_users WHERE label = 'user_a';
  v_user_a_path := v_user_a_id::text || '/card-a-123.webp';

  -- Enable RLS and switch to authenticated role
  SET LOCAL row_security = on;
  SET LOCAL ROLE authenticated;

  -- Set context as User A
  PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Try to UPDATE own personal-images (should FAIL - no policy UPDATE)
  BEGIN
    UPDATE storage.objects
    SET metadata = '{"size": 99999}'::jsonb
    WHERE bucket_id = 'personal-images'
    AND name = v_user_a_path;

    RAISE EXCEPTION 'FAIL: UPDATE should be blocked on personal-images (immutability)';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: UPDATE blocked on personal-images (immutability enforcement)';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%violates row-level security%' OR SQLERRM LIKE '%permission denied%' THEN
        RAISE NOTICE 'PASS: UPDATE blocked on personal-images (RLS policy)';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  -- Reset role
  RESET ROLE;
END $$;

-- ============================================================
-- TEST Phase 8.6: Path ownership enforcement (split_part validation)
-- ============================================================
DO $$
DECLARE
  v_user_a_id UUID;
  v_user_b_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST Phase 8.6: Path ownership enforcement ===';

  SELECT user_id INTO v_user_a_id FROM test_storage_users WHERE label = 'user_a';
  SELECT user_id INTO v_user_b_id FROM test_storage_users WHERE label = 'user_b';

  -- Bypass RLS for setup
  RESET ROLE;
  SET LOCAL row_security = off;

  -- Try to INSERT personal image with WRONG account_id in path (User A trying to write in User B folder)
  -- This should be blocked by policy WITH CHECK (split_part(name,'/',1) = auth.uid()::text)
  SET LOCAL row_security = on;
  SET LOCAL ROLE authenticated;

  PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'personal-images',
      v_user_b_id::text || '/card-attack-999.webp', -- User A trying to write in User B folder
      v_user_a_id,
      '{"size": 10000}'::jsonb
    );

    RAISE EXCEPTION 'FAIL: INSERT with wrong account_id in path should be blocked';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE 'PASS: INSERT blocked when path account_id != auth.uid() (ownership enforcement)';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%violates row-level security%' OR SQLERRM LIKE '%new row%' THEN
        RAISE NOTICE 'PASS: INSERT blocked by RLS policy (path ownership)';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  -- Reset role
  RESET ROLE;
END $$;

-- ============================================================
-- TEST Phase 8.7: Admin can write bank-images (is_admin())
-- ============================================================
DO $$
DECLARE
  v_admin_id UUID;
  v_user_a_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST Phase 8.7: Admin can write bank-images ===';

  SELECT user_id INTO v_admin_id FROM test_storage_users WHERE label = 'admin';
  SELECT user_id INTO v_user_a_id FROM test_storage_users WHERE label = 'user_a';

  -- Enable RLS and switch to authenticated role
  SET LOCAL row_security = on;
  SET LOCAL ROLE authenticated;

  -- Admin should be able to INSERT bank-images
  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'bank-images',
      'admin-bank-test-999.webp',
      v_admin_id,
      '{"size": 80000}'::jsonb
    );

    RAISE NOTICE 'PASS: Admin can INSERT bank-images (is_admin() policy)';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'FAIL: Admin should be able to INSERT bank-images: %', SQLERRM;
  END;

  -- Non-admin should NOT be able to INSERT bank-images
  PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);

  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'bank-images',
      'user-a-attack-888.webp',
      v_user_a_id,
      '{"size": 70000}'::jsonb
    );

    RAISE EXCEPTION 'FAIL: Non-admin should NOT be able to INSERT bank-images';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE 'PASS: Non-admin cannot INSERT bank-images (is_admin() check)';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%violates row-level security%' OR SQLERRM LIKE '%new row%' THEN
        RAISE NOTICE 'PASS: Non-admin blocked by RLS policy (is_admin())';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  -- Reset role
  RESET ROLE;
END $$;

-- ============================================================
-- CLEANUP: rollback-only (preserves system invariants; idempotent)
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== CLEANUP: ROLLBACK transaction (idempotent, no destructive deletes) ===';
END $$;

ROLLBACK;

-- ============================================================
-- TEST SUMMARY
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '  Phase 8 Storage Smoke Tests: ALL PASSED';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tested invariants:';
  RAISE NOTICE '  - Phase 8.1: Buckets created (personal=private, bank=public)';
  RAISE NOTICE '  - Phase 8.2: anon can read bank-images, NOT personal-images';
  RAISE NOTICE '  - Phase 8.3: User A owner-only personal-images (isolation User B)';
  RAISE NOTICE '  - Phase 8.4: D2 - Admin CANNOT read personal-images (file level)';
  RAISE NOTICE '  - Phase 8.5: UPDATE blocked on personal-images (immutability)';
  RAISE NOTICE '  - Phase 8.6: Path ownership enforcement (split_part validation)';
  RAISE NOTICE '  - Phase 8.7: Admin can write bank-images (is_admin() policy)';
  RAISE NOTICE '';
  RAISE NOTICE 'Critical enforcements:';
  RAISE NOTICE '  - D2: Admin excluded from personal-images (confidentiality)';
  RAISE NOTICE '  - Immutability: UPDATE blocked (force DELETE+INSERT)';
  RAISE NOTICE '  - Ownership: Path source-of-truth (no JOIN to tables)';
  RAISE NOTICE '  - Performance: Policies simple (split_part, no complex queries)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Apply migrations: pnpm supabase db push';
  RAISE NOTICE '  2. Run smoke tests: psql ... -f supabase/tests/phase8_smoke_tests.sql';
  RAISE NOTICE '  3. Test real file upload/download (Supabase CLI or curl)';
  RAISE NOTICE '  4. Deploy to staging/production';
  RAISE NOTICE '';
END $$;
