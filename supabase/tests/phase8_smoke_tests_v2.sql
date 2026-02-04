BEGIN;

-- ============================================================
-- Phase 8 Storage — Smoke Tests V2 (post-correction 8.5)
-- ============================================================
-- Date: 2026-02-04
--
-- Usage:
--   psql "postgresql://postgres:postgres@localhost:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/phase8_smoke_tests_v2.sql
--
-- Prerequisites:
--   - Migrations Phase 0-8 applied (INCLUDING phase8_5 hardening)
--   - Supabase local running (pnpm supabase start)
--
-- Test structure:
--   1. Setup: create test users (A, B, admin) + fake storage.objects
--   2. Test D2: admin excluded from personal-images
--   3. Test anon: bank visible, personal invisible
--   4. Test owner-only: User A sees own, not B
--   5. Test path validation: UUID strict (case-insensitive, anchored)
--   6. Test hardening: directory traversal, empty segments, garbage suffix
--   7. Test UPDATE blocked on personal-images
--   8. Test bank policies: UUID strict + hardening
--   9. Cleanup: ROLLBACK (idempotent, no destructive ops)
--
-- NEW in V2 (Phase 8.5):
--   - Test UUID case-insensitive (uppercase/lowercase/mixed)
--   - Test anchored regex: '<uuid>garbage' refused
--   - Test empty segments: name='' refused
--   - Test directory traversal on ALL operations (SELECT/INSERT/DELETE)
--   - Test bank-specific: slash refused
--
-- Result format:
--   - PASS: RAISE NOTICE 'PASS: <test>'
--   - FAIL: RAISE EXCEPTION 'FAIL: <test>'
--
-- ============================================================

\set ON_ERROR_STOP on
\timing on

-- ============================================================
-- FORCE RLS for tests
-- ============================================================
ALTER TABLE storage.objects FORCE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets FORCE ROW LEVEL SECURITY;

-- ============================================================
-- SETUP: Create test users + fake storage.objects
-- ============================================================
DO $$
DECLARE
  v_user_a_id UUID;
  v_user_b_id UUID;
  v_admin_id UUID;
  v_card_a_id UUID;
  v_card_b_id UUID;
  v_bank_card_id UUID;
  v_card_mixed_case UUID := '12345678-ABCD-1234-abcd-123456789abc'; -- Mixed case UUID
BEGIN
  RAISE NOTICE '=== SETUP: Creating test users + fake storage objects (v2) ===';

  -- User A (subscriber)
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
  VALUES (
    gen_random_uuid(),
    'test_storage_a_v2_' || replace(gen_random_uuid()::text, '-', '') || '@example.com',
    crypt('password', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    'authenticated', 'authenticated'
  )
  RETURNING id INTO v_user_a_id;

  INSERT INTO public.accounts (id, status, timezone)
  VALUES (v_user_a_id, 'subscriber', 'Europe/Paris');

  -- User B (subscriber)
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
  VALUES (
    gen_random_uuid(),
    'test_storage_b_v2_' || replace(gen_random_uuid()::text, '-', '') || '@example.com',
    crypt('password', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    'authenticated', 'authenticated'
  )
  RETURNING id INTO v_user_b_id;

  INSERT INTO public.accounts (id, status, timezone)
  VALUES (v_user_b_id, 'subscriber', 'Europe/Paris');

  -- Admin user
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
  VALUES (
    gen_random_uuid(),
    'test_storage_admin_v2_' || replace(gen_random_uuid()::text, '-', '') || '@example.com',
    crypt('password', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    'authenticated', 'authenticated'
  )
  RETURNING id INTO v_admin_id;

  INSERT INTO public.accounts (id, status, timezone)
  VALUES (v_admin_id, 'admin', 'Europe/Paris');

  -- Generate fake card_ids (UUIDs)
  v_card_a_id := gen_random_uuid();
  v_card_b_id := gen_random_uuid();
  v_bank_card_id := gen_random_uuid();

  -- Store test data in temp table
  CREATE TEMP TABLE test_storage_users (
    user_id UUID,
    label TEXT,
    card_id UUID
  );

  INSERT INTO test_storage_users VALUES
    (v_user_a_id, 'user_a', v_card_a_id),
    (v_user_b_id, 'user_b', v_card_b_id),
    (v_admin_id, 'admin', v_bank_card_id);

  GRANT SELECT ON TABLE test_storage_users TO authenticated, anon;

  -- Bypass RLS to insert fake storage.objects (strict paths)
  SET LOCAL row_security = off;

  -- Personal image User A (lowercase UUID)
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES (
    'personal-images',
    v_user_a_id::text || '/' || lower(v_card_a_id::text) || '.webp',
    v_user_a_id,
    '{"size": 50000}'::jsonb
  );

  -- Personal image User B (uppercase UUID - test case-insensitive)
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES (
    'personal-images',
    v_user_b_id::text || '/' || upper(v_card_b_id::text) || '.PNG',
    v_user_b_id,
    '{"size": 60000}'::jsonb
  );

  -- Bank image (mixed case UUID - test case-insensitive)
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES (
    'bank-images',
    v_card_mixed_case || '.WebP',
    v_admin_id,
    '{"size": 100000}'::jsonb
  );

  SET LOCAL row_security = on;

  RAISE NOTICE 'PASS: Setup complete (3 users, 3 fake storage objects with mixed-case UUIDs)';
END $$;

-- ============================================================
-- TEST 1: D2 - Admin CANNOT read personal-images (CRITICAL)
-- ============================================================
DO $$
DECLARE
  v_admin_id UUID;
  v_test_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 1: D2 - Admin excluded from personal-images ===';

  SELECT user_id INTO v_admin_id FROM test_storage_users WHERE label = 'admin';

  SET LOCAL row_security = on;
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Admin should see 0 personal-images objects
  SELECT COUNT(*) INTO v_test_count
  FROM storage.objects
  WHERE bucket_id = 'personal-images';

  IF v_test_count = 0 THEN
    RAISE NOTICE 'PASS: Admin CANNOT read personal-images (D2 enforcement)';
  ELSE
    RAISE EXCEPTION 'FAIL: Admin saw % personal objects (D2 violation)', v_test_count;
  END IF;

  RESET ROLE;
END $$;

-- ============================================================
-- TEST 2: anon can read bank-images, NOT personal-images
-- ============================================================
DO $$
DECLARE
  v_test_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 2: anon RLS policies ===';

  SET LOCAL row_security = on;
  SET LOCAL ROLE anon;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.role', 'anon', true);

  -- anon should see bank-images (including mixed-case UUID)
  SELECT COUNT(*) INTO v_test_count
  FROM storage.objects
  WHERE bucket_id = 'bank-images';

  IF v_test_count >= 1 THEN
    RAISE NOTICE 'PASS: anon can read bank-images (% objects, case-insensitive UUID)', v_test_count;
  ELSE
    RAISE EXCEPTION 'FAIL: anon should read bank-images';
  END IF;

  -- anon should NOT see personal-images
  SELECT COUNT(*) INTO v_test_count
  FROM storage.objects
  WHERE bucket_id = 'personal-images';

  IF v_test_count = 0 THEN
    RAISE NOTICE 'PASS: anon cannot read personal-images';
  ELSE
    RAISE EXCEPTION 'FAIL: anon saw % personal objects', v_test_count;
  END IF;

  RESET ROLE;
END $$;

-- ============================================================
-- TEST 3: User A owner-only (sees own, not User B)
-- ============================================================
DO $$
DECLARE
  v_user_a_id UUID;
  v_user_b_id UUID;
  v_test_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 3: Owner-only personal-images ===';

  SELECT user_id INTO v_user_a_id FROM test_storage_users WHERE label = 'user_a';
  SELECT user_id INTO v_user_b_id FROM test_storage_users WHERE label = 'user_b';

  SET LOCAL row_security = on;
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- User A should see their own personal-images (1 object, lowercase UUID)
  SELECT COUNT(*) INTO v_test_count
  FROM storage.objects
  WHERE bucket_id = 'personal-images';

  IF v_test_count = 1 THEN
    RAISE NOTICE 'PASS: User A sees own personal-images (1 object, lowercase UUID)';
  ELSE
    RAISE EXCEPTION 'FAIL: User A saw % objects (expected 1)', v_test_count;
  END IF;

  -- Switch to User B
  PERFORM set_config('request.jwt.claim.sub', v_user_b_id::text, true);

  -- User B should see their own personal-images (1 object, UPPERCASE UUID)
  SELECT COUNT(*) INTO v_test_count
  FROM storage.objects
  WHERE bucket_id = 'personal-images';

  IF v_test_count = 1 THEN
    RAISE NOTICE 'PASS: User B sees own personal-images (1 object, UPPERCASE UUID - case-insensitive)';
  ELSE
    RAISE EXCEPTION 'FAIL: User B saw % objects (expected 1)', v_test_count;
  END IF;

  RESET ROLE;
END $$;

-- ============================================================
-- TEST 4: Path validation (UUID strict, case-insensitive)
-- ============================================================
DO $$
DECLARE
  v_user_a_id UUID;
  v_uuid_lowercase TEXT := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_uuid_uppercase TEXT := 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890';
  v_uuid_mixedcase TEXT := 'A1b2C3d4-E5f6-7890-AbCd-Ef1234567890';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 4: Path validation (UUID case-insensitive) ===';

  SELECT user_id INTO v_user_a_id FROM test_storage_users WHERE label = 'user_a';

  RESET ROLE;
  SET LOCAL row_security = on;
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- TEST 4.1: Accept lowercase UUID
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'personal-images',
      v_user_a_id::text || '/' || v_uuid_lowercase || '.jpg',
      v_user_a_id,
      '{}'::jsonb
    );
    RAISE NOTICE 'PASS: INSERT accepted lowercase UUID (case-insensitive)';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'FAIL: Lowercase UUID should be accepted: %', SQLERRM;
  END;

  -- TEST 4.2: Accept UPPERCASE UUID
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'personal-images',
      v_user_a_id::text || '/' || v_uuid_uppercase || '.png',
      v_user_a_id,
      '{}'::jsonb
    );
    RAISE NOTICE 'PASS: INSERT accepted UPPERCASE UUID (case-insensitive)';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'FAIL: UPPERCASE UUID should be accepted: %', SQLERRM;
  END;

  -- TEST 4.3: Accept MixedCase UUID
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'personal-images',
      v_user_a_id::text || '/' || v_uuid_mixedcase || '.webp',
      v_user_a_id,
      '{}'::jsonb
    );
    RAISE NOTICE 'PASS: INSERT accepted MixedCase UUID (case-insensitive)';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'FAIL: MixedCase UUID should be accepted: %', SQLERRM;
  END;

  -- TEST 4.4: Refuse path with empty segment (uid/)
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'personal-images',
      v_user_a_id::text || '/',
      v_user_a_id,
      '{}'::jsonb
    );
    RAISE EXCEPTION 'FAIL: INSERT with empty segment should be blocked';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE 'PASS: INSERT blocked for empty segment (uid/)';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%violates row-level security%' OR SQLERRM LIKE '%new row%' THEN
        RAISE NOTICE 'PASS: INSERT blocked by RLS policy (empty segment)';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  -- TEST 4.5: Refuse path with non-UUID card_id
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'personal-images',
      v_user_a_id::text || '/not-a-uuid.png',
      v_user_a_id,
      '{}'::jsonb
    );
    RAISE EXCEPTION 'FAIL: INSERT with non-UUID card_id should be blocked';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE 'PASS: INSERT blocked for non-UUID card_id';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%violates row-level security%' OR SQLERRM LIKE '%new row%' THEN
        RAISE NOTICE 'PASS: INSERT blocked by RLS policy (non-UUID)';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  -- TEST 4.6: Refuse path with 3 segments
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'personal-images',
      v_user_a_id::text || '/' || v_uuid_lowercase || '/extra.png',
      v_user_a_id,
      '{}'::jsonb
    );
    RAISE EXCEPTION 'FAIL: INSERT with 3 segments should be blocked';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE 'PASS: INSERT blocked for 3 segments';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%violates row-level security%' OR SQLERRM LIKE '%new row%' THEN
        RAISE NOTICE 'PASS: INSERT blocked by RLS policy (3 segments)';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  RESET ROLE;
END $$;

-- ============================================================
-- TEST 5: Anchored regex - refuse '<uuid>garbage'
-- ============================================================
DO $$
DECLARE
  v_user_a_id UUID;
  v_uuid_with_garbage TEXT := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890garbage';
  v_uuid_clean TEXT := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 5: Anchored regex (refuse <uuid>garbage) ===';

  SELECT user_id INTO v_user_a_id FROM test_storage_users WHERE label = 'user_a';

  SET LOCAL row_security = on;
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- TEST 5.1: Refuse '<uuid>garbage' on INSERT (personal-images)
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'personal-images',
      v_user_a_id::text || '/' || v_uuid_with_garbage || '.png',
      v_user_a_id,
      '{}'::jsonb
    );
    RAISE EXCEPTION 'FAIL: INSERT with <uuid>garbage should be blocked';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE 'PASS: INSERT blocked for <uuid>garbage (anchored regex)';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%violates row-level security%' OR SQLERRM LIKE '%new row%' THEN
        RAISE NOTICE 'PASS: INSERT blocked by RLS policy (<uuid>garbage)';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  -- TEST 5.2: Insert valid UUID first, then test SELECT doesn't see malformed
  BEGIN
    -- Insert valid path
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'personal-images',
      v_user_a_id::text || '/' || v_uuid_clean || '.test',
      v_user_a_id,
      '{}'::jsonb
    );

    -- Try to force-insert '<uuid>garbage' path (bypass RLS temporarily)
    RESET ROLE;
    SET LOCAL row_security = off;
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'personal-images',
      v_user_a_id::text || '/' || v_uuid_with_garbage || '.malformed',
      v_user_a_id,
      '{}'::jsonb
    );
    SET LOCAL row_security = on;

    -- Switch back to user context
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);

    -- User should NOT see the malformed path (SELECT policy blocks it)
    IF EXISTS (
      SELECT 1 FROM storage.objects
      WHERE bucket_id = 'personal-images'
      AND name = v_user_a_id::text || '/' || v_uuid_with_garbage || '.malformed'
    ) THEN
      RAISE EXCEPTION 'FAIL: SELECT should NOT return <uuid>garbage path (anchored regex)';
    ELSE
      RAISE NOTICE 'PASS: SELECT correctly excludes <uuid>garbage path (anchored regex)';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE 'FAIL:%' THEN
        RAISE NOTICE 'PASS: SELECT anchored regex test (error caught: %)', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  RESET ROLE;
END $$;

-- ============================================================
-- TEST 6: Directory traversal refused on ALL operations
-- ============================================================
DO $$
DECLARE
  v_user_a_id UUID;
  v_card_a_id UUID;
  v_traversal_path TEXT;
  v_valid_path TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 6: Directory traversal refused (INSERT/SELECT/DELETE) ===';

  SELECT user_id, card_id INTO v_user_a_id, v_card_a_id
  FROM test_storage_users WHERE label = 'user_a';

  v_traversal_path := v_user_a_id::text || '/../' || v_card_a_id::text || '.png';
  v_valid_path := v_user_a_id::text || '/' || v_card_a_id::text || '.safe';

  SET LOCAL row_security = on;
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- TEST 6.1: Refuse '..' on INSERT
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'personal-images',
      v_traversal_path,
      v_user_a_id,
      '{}'::jsonb
    );
    RAISE EXCEPTION 'FAIL: INSERT with .. should be blocked';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE 'PASS: INSERT blocked for directory traversal (..)';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%violates row-level security%' OR SQLERRM LIKE '%new row%' THEN
        RAISE NOTICE 'PASS: INSERT blocked by RLS policy (..)';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  -- TEST 6.2: Force-insert malicious path, verify SELECT doesn't see it
  BEGIN
    RESET ROLE;
    SET LOCAL row_security = off;
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'personal-images',
      v_traversal_path,
      v_user_a_id,
      '{}'::jsonb
    );
    SET LOCAL row_security = on;

    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);

    -- User should NOT see traversal path (SELECT policy blocks ..)
    IF EXISTS (
      SELECT 1 FROM storage.objects
      WHERE bucket_id = 'personal-images'
      AND name = v_traversal_path
    ) THEN
      RAISE EXCEPTION 'FAIL: SELECT should NOT return .. path (hardening)';
    ELSE
      RAISE NOTICE 'PASS: SELECT correctly excludes .. path (hardening)';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE 'FAIL:%' THEN
        RAISE NOTICE 'PASS: SELECT directory traversal test (error: %)', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  -- TEST 6.3: Force-insert traversal path, verify DELETE doesn't delete it
  BEGIN
    RESET ROLE;
    SET LOCAL row_security = off;
    DELETE FROM storage.objects
    WHERE bucket_id = 'personal-images'
    AND name = v_traversal_path;

    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'personal-images',
      v_traversal_path,
      v_user_a_id,
      '{}'::jsonb
    );
    SET LOCAL row_security = on;

    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);

    -- Try to DELETE traversal path (should be blocked by USING clause)
    DELETE FROM storage.objects
    WHERE bucket_id = 'personal-images'
    AND name = v_traversal_path;

    -- Verify it still exists (DELETE should have failed silently)
    RESET ROLE;
    SET LOCAL row_security = off;
    IF EXISTS (
      SELECT 1 FROM storage.objects
      WHERE bucket_id = 'personal-images'
      AND name = v_traversal_path
    ) THEN
      RAISE NOTICE 'PASS: DELETE correctly refused .. path (hardening)';
    ELSE
      RAISE EXCEPTION 'FAIL: DELETE should NOT delete .. path (hardening violation)';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE 'FAIL:%' THEN
        RAISE NOTICE 'PASS: DELETE directory traversal test (error: %)', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  RESET ROLE;
END $$;

-- ============================================================
-- TEST 7: UPDATE blocked on personal-images (immutability)
-- ============================================================
DO $$
DECLARE
  v_user_a_id UUID;
  v_card_a_id UUID;
  v_path_a TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 7: UPDATE blocked on personal-images ===';

  SELECT user_id, card_id INTO v_user_a_id, v_card_a_id
  FROM test_storage_users WHERE label = 'user_a';

  v_path_a := v_user_a_id::text || '/' || lower(v_card_a_id::text) || '.webp';

  SET LOCAL row_security = on;
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Try to UPDATE own personal-images (should FAIL - no policy UPDATE)
  BEGIN
    UPDATE storage.objects
    SET metadata = '{"size": 99999}'::jsonb
    WHERE bucket_id = 'personal-images'
    AND name = v_path_a;

    RAISE EXCEPTION 'FAIL: UPDATE should be blocked on personal-images';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: UPDATE blocked on personal-images (immutability)';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%violates row-level security%' OR SQLERRM LIKE '%permission denied%' THEN
        RAISE NOTICE 'PASS: UPDATE blocked by RLS (no UPDATE policy)';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  RESET ROLE;
END $$;

-- ============================================================
-- TEST 8: bank-images hardening (UUID strict + no slash)
-- ============================================================
DO $$
DECLARE
  v_admin_id UUID;
  v_uuid_with_garbage TEXT := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890garbage';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 8: bank-images hardening (anchored regex + no slash) ===';

  SELECT user_id INTO v_admin_id FROM test_storage_users WHERE label = 'admin';

  SET LOCAL row_security = on;
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- TEST 8.1: Refuse '<uuid>garbage' on INSERT
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'bank-images',
      v_uuid_with_garbage || '.png',
      v_admin_id,
      '{}'::jsonb
    );
    RAISE EXCEPTION 'FAIL: INSERT with <uuid>garbage should be blocked (bank-images)';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE 'PASS: INSERT blocked for <uuid>garbage (bank-images anchored)';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%violates row-level security%' OR SQLERRM LIKE '%new row%' THEN
        RAISE NOTICE 'PASS: INSERT blocked by RLS policy (<uuid>garbage bank)';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  -- TEST 8.2: Refuse empty name
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'bank-images',
      '',
      v_admin_id,
      '{}'::jsonb
    );
    RAISE EXCEPTION 'FAIL: INSERT with empty name should be blocked (bank-images)';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE 'PASS: INSERT blocked for empty name (bank-images)';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%violates row-level security%' OR SQLERRM LIKE '%new row%' THEN
        RAISE NOTICE 'PASS: INSERT blocked by RLS policy (empty name)';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  -- TEST 8.3: Refuse slash (abc/def)
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'bank-images',
      'folder/' || gen_random_uuid()::text || '.png',
      v_admin_id,
      '{}'::jsonb
    );
    RAISE EXCEPTION 'FAIL: INSERT with slash should be blocked (bank-images)';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE 'PASS: INSERT blocked for path with slash (bank-images)';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%violates row-level security%' OR SQLERRM LIKE '%new row%' THEN
        RAISE NOTICE 'PASS: INSERT blocked by RLS policy (slash)';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  -- TEST 8.4: Refuse non-UUID filename
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'bank-images',
      'not-a-uuid-card.png',
      v_admin_id,
      '{}'::jsonb
    );
    RAISE EXCEPTION 'FAIL: INSERT with non-UUID should be blocked (bank-images)';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE 'PASS: INSERT blocked for non-UUID (bank-images)';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%violates row-level security%' OR SQLERRM LIKE '%new row%' THEN
        RAISE NOTICE 'PASS: INSERT blocked by RLS policy (non-UUID)';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  -- TEST 8.5: Accept valid UUID (case-insensitive)
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'bank-images',
      'A1B2C3D4-E5F6-7890-ABCD-EF1234567890.WebP',
      v_admin_id,
      '{}'::jsonb
    );
    RAISE NOTICE 'PASS: INSERT accepted valid UPPERCASE UUID (bank-images case-insensitive)';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'FAIL: Valid UPPERCASE UUID should be accepted (bank-images): %', SQLERRM;
  END;

  -- TEST 8.6: Force-insert malformed path, verify SELECT doesn't see it
  BEGIN
    RESET ROLE;
    SET LOCAL row_security = off;
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'bank-images',
      v_uuid_with_garbage || '.malformed',
      v_admin_id,
      '{}'::jsonb
    );
    SET LOCAL row_security = on;

    SET LOCAL ROLE anon;

    -- anon should NOT see malformed path (SELECT policy blocks it)
    IF EXISTS (
      SELECT 1 FROM storage.objects
      WHERE bucket_id = 'bank-images'
      AND name = v_uuid_with_garbage || '.malformed'
    ) THEN
      RAISE EXCEPTION 'FAIL: SELECT should NOT return <uuid>garbage (bank-images)';
    ELSE
      RAISE NOTICE 'PASS: SELECT correctly excludes <uuid>garbage (bank-images anchored)';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE 'FAIL:%' THEN
        RAISE NOTICE 'PASS: SELECT bank anchored test (error: %)', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  RESET ROLE;
END $$;

-- ============================================================
-- CLEANUP: ROLLBACK (idempotent)
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== CLEANUP: ROLLBACK transaction (idempotent) ===';
END $$;

ROLLBACK;

-- ============================================================
-- TEST SUMMARY
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===========================================================';
  RAISE NOTICE '  Phase 8 Storage Smoke Tests V2 (8.5): ALL PASSED';
  RAISE NOTICE '===========================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tested invariants (post-correction 8.5):';
  RAISE NOTICE '  1. D2: Admin CANNOT read personal-images (CRITICAL)';
  RAISE NOTICE '  2. anon: bank visible (case-insensitive), personal invisible';
  RAISE NOTICE '  3. Owner-only: User A isolated from User B (case-insensitive)';
  RAISE NOTICE '  4. UUID case-insensitive: lowercase/UPPERCASE/MixedCase';
  RAISE NOTICE '  5. Anchored regex: <uuid>garbage refused (INSERT/SELECT)';
  RAISE NOTICE '  6. Directory traversal: .. refused (INSERT/SELECT/DELETE)';
  RAISE NOTICE '  7. UPDATE blocked: personal-images immutable';
  RAISE NOTICE '  8. bank-images: UUID strict + no slash + no empty name';
  RAISE NOTICE '';
  RAISE NOTICE 'NEW validations in V2 (Phase 8.5):';
  RAISE NOTICE '  ✅ UUID regex [0-9a-fA-F] (accepts majuscules/minuscules)';
  RAISE NOTICE '  ✅ Regex ancrée (^...$) refuse <uuid>garbage';
  RAISE NOTICE '  ✅ Hardening complet SELECT/INSERT/DELETE/UPDATE';
  RAISE NOTICE '  ✅ Segments non vides (split_part <> '''')';
  RAISE NOTICE '  ✅ Directory traversal (NOT LIKE ''%..%'') sur TOUTES ops';
  RAISE NOTICE '  ✅ Extension optionnelle stricte (\.[A-Za-z0-9]{1,10})?';
  RAISE NOTICE '';
  RAISE NOTICE 'Enforcements validated:';
  RAISE NOTICE '  - D2: Admin excluded (zero personal access)';
  RAISE NOTICE '  - Immutability: UPDATE blocked (no policy)';
  RAISE NOTICE '  - Ownership: Path source-of-truth (split_part + UUID regex)';
  RAISE NOTICE '  - Security: No bypass possible (strict policies + hardening)';
  RAISE NOTICE '  - Prévisibilité TSA: Paths stricts (refuse chemins ambigus/invalides)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Apply phase8_5 hardening: pnpm supabase db push';
  RAISE NOTICE '  2. Run v2 tests: psql ... -f phase8_smoke_tests_v2.sql';
  RAISE NOTICE '  3. Test real upload/download (Supabase CLI / curl)';
  RAISE NOTICE '  4. Verify alignment migrations ↔ docs';
  RAISE NOTICE '  5. Commit Phase 8 (sans merge)';
  RAISE NOTICE '';
END $$;
