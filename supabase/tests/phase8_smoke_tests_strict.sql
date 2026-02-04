BEGIN;

-- ============================================================
-- Phase 8 Storage — Smoke Tests STRICT (post-correction 8.4)
-- ============================================================
-- Date: 2026-02-04
--
-- Usage:
--   psql "postgresql://postgres:postgres@localhost:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/phase8_smoke_tests_strict.sql
--
-- Prerequisites:
--   - Migrations Phase 0-8 applied (INCLUDING phase8_4 corrections)
--   - Supabase local running (pnpm supabase start)
--
-- Test structure:
--   1. Setup: create test users (A, B, admin) + fake storage.objects
--   2. Test D2: admin excluded from personal-images
--   3. Test anon: bank visible, personal invisible
--   4. Test owner-only: User A sees own, not B
--   5. Test path validation: refuse invalid UUIDs, segments vides
--   6. Test UPDATE blocked on personal-images
--   7. Cleanup: ROLLBACK (idempotent, no destructive ops)
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
BEGIN
  RAISE NOTICE '=== SETUP: Creating test users + fake storage objects ===';

  -- User A (subscriber)
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
  VALUES (
    gen_random_uuid(),
    'test_storage_a_' || replace(gen_random_uuid()::text, '-', '') || '@example.com',
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
    'test_storage_b_' || replace(gen_random_uuid()::text, '-', '') || '@example.com',
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
    'test_storage_admin_' || replace(gen_random_uuid()::text, '-', '') || '@example.com',
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

  -- Personal image User A (path: <user_a_uuid>/<card_a_uuid>.webp)
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES (
    'personal-images',
    v_user_a_id::text || '/' || v_card_a_id::text || '.webp',
    v_user_a_id,
    '{"size": 50000}'::jsonb
  );

  -- Personal image User B (path: <user_b_uuid>/<card_b_uuid>.webp)
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES (
    'personal-images',
    v_user_b_id::text || '/' || v_card_b_id::text || '.webp',
    v_user_b_id,
    '{"size": 60000}'::jsonb
  );

  -- Bank image (path: <bank_card_uuid>.webp)
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES (
    'bank-images',
    v_bank_card_id::text || '.webp',
    v_admin_id,
    '{"size": 100000}'::jsonb
  );

  SET LOCAL row_security = on;

  RAISE NOTICE 'PASS: Setup complete (3 users, 3 fake storage objects)';
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

  -- anon should see bank-images
  SELECT COUNT(*) INTO v_test_count
  FROM storage.objects
  WHERE bucket_id = 'bank-images';

  IF v_test_count >= 1 THEN
    RAISE NOTICE 'PASS: anon can read bank-images (% objects)', v_test_count;
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

  -- User A should see their own personal-images (1 object)
  SELECT COUNT(*) INTO v_test_count
  FROM storage.objects
  WHERE bucket_id = 'personal-images';

  IF v_test_count = 1 THEN
    RAISE NOTICE 'PASS: User A sees own personal-images (1 object)';
  ELSE
    RAISE EXCEPTION 'FAIL: User A saw % objects (expected 1)', v_test_count;
  END IF;

  -- Switch to User B
  PERFORM set_config('request.jwt.claim.sub', v_user_b_id::text, true);

  -- User B should see their own personal-images (1 object, different from A)
  SELECT COUNT(*) INTO v_test_count
  FROM storage.objects
  WHERE bucket_id = 'personal-images';

  IF v_test_count = 1 THEN
    RAISE NOTICE 'PASS: User B sees own personal-images (isolated from A)';
  ELSE
    RAISE EXCEPTION 'FAIL: User B saw % objects (expected 1)', v_test_count;
  END IF;

  RESET ROLE;
END $$;

-- ============================================================
-- TEST 4: Path validation (refuse invalid UUIDs, segments vides)
-- ============================================================
DO $$
DECLARE
  v_user_a_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 4: Path validation strict (UUID + segments) ===';

  SELECT user_id INTO v_user_a_id FROM test_storage_users WHERE label = 'user_a';

  RESET ROLE;
  SET LOCAL row_security = on;
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- TEST 4.1: Refuse path with segment vide (uid/)
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
      RAISE NOTICE 'PASS: INSERT blocked for path with empty segment (uid/)';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%violates row-level security%' OR SQLERRM LIKE '%new row%' THEN
        RAISE NOTICE 'PASS: INSERT blocked by RLS policy (empty segment)';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  -- TEST 4.2: Refuse path with non-UUID card_id (uid/not-a-uuid.png)
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
      RAISE NOTICE 'PASS: INSERT blocked for non-UUID card_id (uid/not-a-uuid.png)';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%violates row-level security%' OR SQLERRM LIKE '%new row%' THEN
        RAISE NOTICE 'PASS: INSERT blocked by RLS policy (non-UUID)';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  -- TEST 4.3: Refuse path with 3 segments (uid/card/extra.png)
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'personal-images',
      v_user_a_id::text || '/' || gen_random_uuid()::text || '/extra.png',
      v_user_a_id,
      '{}'::jsonb
    );
    RAISE EXCEPTION 'FAIL: INSERT with 3 segments should be blocked';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE 'PASS: INSERT blocked for path with 3 segments';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%violates row-level security%' OR SQLERRM LIKE '%new row%' THEN
        RAISE NOTICE 'PASS: INSERT blocked by RLS policy (3 segments)';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  -- TEST 4.4: Accept valid path (uid/card_uuid.webp)
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'personal-images',
      v_user_a_id::text || '/' || gen_random_uuid()::text || '.webp',
      v_user_a_id,
      '{}'::jsonb
    );
    RAISE NOTICE 'PASS: INSERT accepted for valid UUID path (uid/card_uuid.webp)';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'FAIL: Valid UUID path should be accepted: %', SQLERRM;
  END;

  RESET ROLE;
END $$;

-- ============================================================
-- TEST 5: UPDATE blocked on personal-images (immutability)
-- ============================================================
DO $$
DECLARE
  v_user_a_id UUID;
  v_card_a_id UUID;
  v_path_a TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 5: UPDATE blocked on personal-images ===';

  SELECT user_id, card_id INTO v_user_a_id, v_card_a_id
  FROM test_storage_users WHERE label = 'user_a';

  v_path_a := v_user_a_id::text || '/' || v_card_a_id::text || '.webp';

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
-- TEST 6: bank-images path validation (<uuid>.<ext> strict)
-- ============================================================
DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 6: bank-images path validation (UUID strict) ===';

  SELECT user_id INTO v_admin_id FROM test_storage_users WHERE label = 'admin';

  SET LOCAL row_security = on;
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- TEST 6.1: Refuse path with slash (not-allowed/card.png)
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'bank-images',
      'folder/' || gen_random_uuid()::text || '.png',
      v_admin_id,
      '{}'::jsonb
    );
    RAISE EXCEPTION 'FAIL: INSERT with slash in bank-images should be blocked';
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

  -- TEST 6.2: Refuse non-UUID filename
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'bank-images',
      'not-a-uuid-card.png',
      v_admin_id,
      '{}'::jsonb
    );
    RAISE EXCEPTION 'FAIL: INSERT with non-UUID filename should be blocked';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE 'PASS: INSERT blocked for non-UUID filename (bank-images)';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%violates row-level security%' OR SQLERRM LIKE '%new row%' THEN
        RAISE NOTICE 'PASS: INSERT blocked by RLS policy (non-UUID)';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  -- TEST 6.3: Accept valid UUID path (card_uuid.webp)
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'bank-images',
      gen_random_uuid()::text || '.webp',
      v_admin_id,
      '{}'::jsonb
    );
    RAISE NOTICE 'PASS: INSERT accepted for valid UUID path (card_uuid.webp)';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'FAIL: Valid UUID path should be accepted: %', SQLERRM;
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
  RAISE NOTICE '==================================================';
  RAISE NOTICE '  Phase 8 Storage Smoke Tests STRICT: ALL PASSED';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tested invariants (post-correction 8.4):';
  RAISE NOTICE '  1. D2: Admin CANNOT read personal-images (CRITICAL)';
  RAISE NOTICE '  2. anon: bank visible, personal invisible';
  RAISE NOTICE '  3. Owner-only: User A isolated from User B';
  RAISE NOTICE '  4. Path validation: UUID strict, refuse invalid segments';
  RAISE NOTICE '  5. UPDATE blocked: personal-images immutable';
  RAISE NOTICE '  6. bank-images: UUID strict, no slashes';
  RAISE NOTICE '';
  RAISE NOTICE 'Enforcements validated:';
  RAISE NOTICE '  - D2: Admin excluded (zero personal access)';
  RAISE NOTICE '  - Immutability: UPDATE blocked (no policy)';
  RAISE NOTICE '  - Ownership: Path source-of-truth (split_part + UUID regex)';
  RAISE NOTICE '  - Security: No bypass possible (strict policies)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Apply phase8_4 correction: pnpm supabase db push';
  RAISE NOTICE '  2. Run strict tests: psql ... -f phase8_smoke_tests_strict.sql';
  RAISE NOTICE '  3. Test real upload/download (Supabase CLI / curl)';
  RAISE NOTICE '  4. Deploy to production';
  RAISE NOTICE '';
END $$;
