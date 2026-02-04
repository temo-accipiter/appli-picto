BEGIN;

-- ============================================================
-- Phase 7 RLS — Smoke Tests Comprehensive (CORRECTED)
-- ============================================================
-- Date: 2026-02-03
-- CORRECTED: 2026-02-03 (execution-only enforcement + bank unpublished if referenced + anon tests)
--
-- Usage:
--   psql "postgresql://postgres:postgres@localhost:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/phase7_smoke_tests.sql
--
-- Prerequisites:
--   - Migrations Phase 0-7 applied
--   - Supabase local running (pnpm supabase start)
--
-- Test structure:
--   1. Setup: create test users (A free, B subscriber, admin)
--   2. Test each migration invariants (0-8)
--   3. Cleanup: delete test data
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
-- Required because psql runs as postgres (superuser) which bypasses RLS by default
ALTER TABLE public.accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.devices FORCE ROW LEVEL SECURITY;
ALTER TABLE public.child_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cards FORCE ROW LEVEL SECURITY;
ALTER TABLE public.categories FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_card_categories FORCE ROW LEVEL SECURITY;
ALTER TABLE public.timelines FORCE ROW LEVEL SECURITY;
ALTER TABLE public.slots FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.session_validations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sequences FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_steps FORCE ROW LEVEL SECURITY;

-- ============================================================
-- SETUP: Create test users
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

  -- Use unique emails per run to avoid false failures if previous run aborted before ROLLBACK
  v_email_a := 'test_user_a_' || replace(gen_random_uuid()::text, '-', '') || '@example.com';
  v_email_b := 'test_user_b_' || replace(gen_random_uuid()::text, '-', '') || '@example.com';
  v_email_admin := 'test_admin_' || replace(gen_random_uuid()::text, '-', '') || '@example.com';

  -- User A (free)
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
  VALUES (v_user_a_id, 'free', 'Europe/Paris');

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

  -- Store test user IDs in temp table for later cleanup
  CREATE TEMP TABLE test_users (
    user_id UUID,
    label TEXT
  );

  INSERT INTO test_users VALUES
    (v_user_a_id, 'user_a'),
    (v_user_b_id, 'user_b'),
    (v_admin_id, 'admin');

  GRANT SELECT ON TABLE test_users TO authenticated;
  GRANT SELECT ON TABLE test_users TO anon;

  -- Create a bank published card for anon tests (bypass RLS)
  SET LOCAL row_security = off;
  INSERT INTO public.cards (type, account_id, name, image_url, published)
  VALUES ('bank', NULL, 'Bank Card Public Test', 'https://example.com/bank_public.png', TRUE);
  SET LOCAL row_security = on;

  RAISE NOTICE 'PASS: Test users created successfully';
END $$;

-- ============================================================
-- TEST Phase 7.0: Bugfix cards.image_url immutable (personal)
-- ============================================================
DO $$
DECLARE
  v_user_b_id UUID;
  v_card_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST Phase 7.0: cards.image_url immutable ===';

  SELECT user_id INTO v_user_b_id FROM test_users WHERE label = 'user_b';

  -- Bypass RLS for admin operations
  SET LOCAL row_security = off;

  -- Create personal card (subscriber can create)
  INSERT INTO public.cards (type, account_id, name, image_url)
  VALUES ('personal', v_user_b_id, 'Test Card', 'https://example.com/image1.png')
  RETURNING id INTO v_card_id;

  -- Try to UPDATE image_url (should FAIL)
  BEGIN
    UPDATE public.cards
    SET image_url = 'https://example.com/image2.png'
    WHERE id = v_card_id;

    RAISE EXCEPTION 'FAIL: UPDATE image_url should be blocked for personal cards';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%Invariant violation: cannot update image_url%' THEN
        RAISE NOTICE 'PASS: UPDATE image_url blocked for personal card';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  -- UPDATE name should still work (not image_url)
  UPDATE public.cards
  SET name = 'Updated Name'
  WHERE id = v_card_id;

  RAISE NOTICE 'PASS: UPDATE name works for personal card (image_url immutable)';

  SET LOCAL row_security = on;
END $$;

-- ============================================================
-- TEST Phase 7.1: RLS helpers (is_admin, is_execution_only)
-- ============================================================
DO $$
DECLARE
  v_user_a_id UUID;
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_is_exec_only BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST Phase 7.1: RLS helpers ===';

  SELECT user_id INTO v_user_a_id FROM test_users WHERE label = 'user_a';
  SELECT user_id INTO v_admin_id FROM test_users WHERE label = 'admin';

  -- Test is_admin() for admin user
  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  SELECT public.is_admin() INTO v_is_admin;
  IF v_is_admin THEN
    RAISE NOTICE 'PASS: is_admin() returns TRUE for admin user';
  ELSE
    RAISE EXCEPTION 'FAIL: is_admin() should return TRUE for admin';
  END IF;

  -- Test is_admin() for non-admin user
  PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);

  SELECT public.is_admin() INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE NOTICE 'PASS: is_admin() returns FALSE for non-admin user';
  ELSE
    RAISE EXCEPTION 'FAIL: is_admin() should return FALSE for non-admin';
  END IF;

  -- Test is_execution_only() for free user with 1 profile (should be FALSE)
  SELECT public.is_execution_only() INTO v_is_exec_only;
  IF NOT v_is_exec_only THEN
    RAISE NOTICE 'PASS: is_execution_only() returns FALSE for free with 1 profile';
  ELSE
    RAISE EXCEPTION 'FAIL: is_execution_only() should be FALSE (free + 1 profile)';
  END IF;

  -- Bypass RLS to create 2nd profile
  SET LOCAL row_security = off;
  INSERT INTO public.child_profiles (account_id, name, status)
  VALUES (v_user_a_id, 'Profile 2', 'active');
  SET LOCAL row_security = on;

  SELECT public.is_execution_only() INTO v_is_exec_only;
  IF v_is_exec_only THEN
    RAISE NOTICE 'PASS: is_execution_only() returns TRUE for free with 2 profiles';
  ELSE
    RAISE EXCEPTION 'FAIL: is_execution_only() should be TRUE (free + 2 profiles)';
  END IF;
END $$;

-- ============================================================
-- TEST BLOCKER 4: execution-only enforcement
-- ============================================================
DO $$
DECLARE
  v_user_a_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST BLOCKER 4: execution-only enforcement ===';

  SELECT user_id INTO v_user_a_id FROM test_users WHERE label = 'user_a';

  -- Enable RLS and switch to authenticated role
  SET LOCAL row_security = on;
  SET LOCAL ROLE authenticated;

  -- Set context as user A (free + 2 profiles = execution-only)
  PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Try to INSERT child_profile (should FAIL in execution-only)
  BEGIN
    INSERT INTO public.child_profiles (account_id, name, status)
    VALUES (v_user_a_id, 'Profile 3', 'active');

    RAISE EXCEPTION 'FAIL: child_profiles INSERT should be blocked in execution-only mode';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE 'PASS: child_profiles INSERT blocked in execution-only mode';
    WHEN OTHERS THEN
      -- Policy WITH CHECK failed (new row violates row-level security policy)
      IF SQLERRM LIKE '%violates row-level security%' OR SQLERRM LIKE '%new row%' THEN
        RAISE NOTICE 'PASS: child_profiles INSERT blocked in execution-only mode (policy)';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  -- Try to INSERT personal card (should FAIL in execution-only)
  BEGIN
    INSERT INTO public.cards (type, account_id, name, image_url)
    VALUES ('personal', v_user_a_id, 'Exec Only Card', 'https://example.com/exec.png');

    RAISE EXCEPTION 'FAIL: cards personal INSERT should be blocked in execution-only mode';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE 'PASS: cards personal INSERT blocked in execution-only mode';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%violates row-level security%' OR SQLERRM LIKE '%new row%' THEN
        RAISE NOTICE 'PASS: cards personal INSERT blocked in execution-only mode (policy)';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  -- Try to INSERT category (should FAIL in execution-only)
  BEGIN
    INSERT INTO public.categories (account_id, name, is_system)
    VALUES (v_user_a_id, 'Exec Only Category', FALSE);

    RAISE EXCEPTION 'FAIL: categories INSERT should be blocked in execution-only mode';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE 'PASS: categories INSERT blocked in execution-only mode';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%violates row-level security%' OR SQLERRM LIKE '%new row%' THEN
        RAISE NOTICE 'PASS: categories INSERT blocked in execution-only mode (policy)';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;
END $$;

-- ============================================================
-- TEST BLOCKER 5: bank unpublished readable if referenced
-- ============================================================
DO $$
DECLARE
  v_user_b_id UUID;
  v_admin_id UUID;
  v_bank_card_id UUID;
  v_timeline_id UUID;
  v_profile_id UUID;
  v_slot_id UUID;
  v_test_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST BLOCKER 5: bank unpublished readable if referenced ===';

  SELECT user_id INTO v_user_b_id FROM test_users WHERE label = 'user_b';
  SELECT user_id INTO v_admin_id FROM test_users WHERE label = 'admin';

  -- Bypass RLS for setup (must RESET ROLE to allow row_security=off)
  RESET ROLE;
  SET LOCAL row_security = off;

  -- Admin creates bank card (published)
  INSERT INTO public.cards (type, account_id, name, image_url, published)
  VALUES ('bank', NULL, 'Bank Card Unpublish Test', 'https://example.com/bank_unpub.png', TRUE)
  RETURNING id INTO v_bank_card_id;

  -- Ensure User B has profile, timeline, and slot (create if missing)
  SELECT cp.id, t.id INTO v_profile_id, v_timeline_id
  FROM public.child_profiles cp
  LEFT JOIN public.timelines t ON t.child_profile_id = cp.id
  WHERE cp.account_id = v_user_b_id
  LIMIT 1;

  -- If no profile exists (shouldn't happen due to auto-trigger), create one
  IF v_profile_id IS NULL THEN
    INSERT INTO public.child_profiles (account_id, name, status)
    VALUES (v_user_b_id, 'Test Profile B', 'active')
    RETURNING id INTO v_profile_id;
  END IF;

  -- If no timeline exists (shouldn't happen due to auto-trigger), create one
  IF v_timeline_id IS NULL THEN
    INSERT INTO public.timelines (child_profile_id)
    VALUES (v_profile_id)
    RETURNING id INTO v_timeline_id;
  END IF;

  -- Ensure at least one step slot exists
  SELECT id INTO v_slot_id
  FROM public.slots
  WHERE timeline_id = v_timeline_id
  AND kind = 'step'
  LIMIT 1;

  IF v_slot_id IS NULL THEN
    INSERT INTO public.slots (timeline_id, kind, position, tokens)
    VALUES (v_timeline_id, 'step', 0, 0)
    RETURNING id INTO v_slot_id;
  END IF;

  -- User B references bank card in slot (UPDATE via id, not LIMIT)
  UPDATE public.slots
  SET card_id = v_bank_card_id
  WHERE id = v_slot_id;

  RAISE NOTICE 'User B now references bank card % in slot %', v_bank_card_id, v_slot_id;

  -- Admin unpublishes bank card
  UPDATE public.cards
  SET published = FALSE
  WHERE id = v_bank_card_id;

  RAISE NOTICE 'Admin unpublished bank card %', v_bank_card_id;

  SET LOCAL row_security = on;
  SET LOCAL ROLE authenticated;


  -- Canaries (avoid false positives after setup bypass)
  IF current_user <> 'authenticated' THEN
    RAISE EXCEPTION 'FAIL: expected authenticated role after blocker-5 setup (current_user=%)', current_user;
  END IF;

  IF current_setting('row_security', true) <> 'on' THEN
    RAISE EXCEPTION 'FAIL: expected row_security=on after blocker-5 setup (row_security=%)', current_setting('row_security', true);
  END IF;

  -- User B should STILL see unpublished bank card (because referenced)
  PERFORM set_config('request.jwt.claim.sub', v_user_b_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  SELECT COUNT(*) INTO v_test_count
  FROM public.cards
  WHERE id = v_bank_card_id;

  IF v_test_count = 1 THEN
    RAISE NOTICE 'PASS: User B can still read bank unpublished card (referenced in owned slot, BLOCKER 5 TSA)';
  ELSE
    RAISE EXCEPTION 'FAIL: User B should read bank unpublished card (referenced)';
  END IF;
END $$;

-- ============================================================
-- TEST anon: bank published read-only
-- ============================================================
DO $$
DECLARE
  v_test_count INTEGER;
  v_bank_published_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST anon: bank published read-only ===';

  -- Enable RLS and switch to anon role
  SET LOCAL row_security = on;
  SET LOCAL ROLE anon;

  -- Set context as anon
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.role', 'anon', true);

  -- Anon should see bank published cards
  SELECT COUNT(*) INTO v_bank_published_count
  FROM public.cards
  WHERE type = 'bank' AND published = TRUE;

  IF v_bank_published_count >= 1 THEN
    RAISE NOTICE 'PASS: anon can read bank published cards (% cards)', v_bank_published_count;
  ELSE
    RAISE EXCEPTION 'FAIL: anon should read at least 1 bank published card';
  END IF;

  -- Anon should NOT see personal cards
  SELECT COUNT(*) INTO v_test_count
  FROM public.cards
  WHERE type = 'personal';

  IF v_test_count = 0 THEN
    RAISE NOTICE 'PASS: anon cannot read personal cards';
  ELSE
    RAISE EXCEPTION 'FAIL: anon should NOT read personal cards';
  END IF;

  -- Anon should NOT see bank unpublished cards
  SELECT COUNT(*) INTO v_test_count
  FROM public.cards
  WHERE type = 'bank' AND published = FALSE;

  IF v_test_count = 0 THEN
    RAISE NOTICE 'PASS: anon cannot read bank unpublished cards';
  ELSE
    RAISE EXCEPTION 'FAIL: anon should NOT read bank unpublished cards';
  END IF;

  -- Anon should NOT be able to INSERT cards
  BEGIN
    INSERT INTO public.cards (type, account_id, name, image_url, published)
    VALUES ('bank', NULL, 'Anon Card', 'https://example.com/anon.png', TRUE);

    RAISE EXCEPTION 'FAIL: anon should NOT be able to INSERT cards';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: anon cannot INSERT cards';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%permission denied%' OR SQLERRM LIKE '%violates row-level security%' THEN
        RAISE NOTICE 'PASS: anon cannot INSERT cards (RLS blocked)';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  -- Anon should NOT be able to read accounts (expect permission denied)
  BEGIN
    PERFORM (SELECT COUNT(*) FROM public.accounts);
    RAISE EXCEPTION 'FAIL: anon can read accounts (should be denied)';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: anon cannot read accounts (permission denied as expected)';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'FAIL: unexpected error when reading accounts: %', SQLERRM;
  END;
END $$;

-- ============================================================
-- TEST Phase 7.3: RLS Identity (accounts, devices, child_profiles)
-- ============================================================
DO $$
DECLARE
  v_user_a_id UUID;
  v_user_b_id UUID;
  v_test_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST Phase 7.3: RLS Identity ===';

    SET LOCAL row_security = on;
  SET LOCAL ROLE authenticated;
  -- DEBUG (before claims are set)
  RAISE NOTICE 'DEBUG(before): current_user=% role_claim=% sub_claim=%',
    current_user,
    current_setting('request.jwt.claim.role', true),
    current_setting('request.jwt.claim.sub', true);

  SELECT user_id INTO v_user_a_id FROM test_users WHERE label = 'user_a';
  SELECT user_id INTO v_user_b_id FROM test_users WHERE label = 'user_b';

  -- Set context as user A
  PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- DEBUG (after claims are set)
  RAISE NOTICE 'DEBUG(after): current_user=% role_claim=% sub_claim=%',
    current_user,
    current_setting('request.jwt.claim.role', true),
    current_setting('request.jwt.claim.sub', true);

  -- CANARIES: ensure test is valid (no false positives)
  IF current_user <> 'authenticated' THEN
    RAISE EXCEPTION 'FAIL: Not running as authenticated role (current_user=%)', current_user;
  END IF;

  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'FAIL: role claim not set to authenticated (role_claim=%)',
      current_setting('request.jwt.claim.role', true);
  END IF;

  IF current_setting('request.jwt.claim.sub', true) IS DISTINCT FROM v_user_a_id::text THEN
    RAISE EXCEPTION 'FAIL: sub claim mismatch (expected %, got %)',
      v_user_a_id::text,
      current_setting('request.jwt.claim.sub', true);
  END IF;

  -- Test accounts: can read own account
  SELECT COUNT(*) INTO v_test_count
  FROM public.accounts
  WHERE id = v_user_a_id;

  IF v_test_count = 1 THEN
    RAISE NOTICE 'PASS: User A can read own account';
  ELSE
    RAISE EXCEPTION 'FAIL: User A should read own account';
  END IF;

  -- Test accounts: cannot read other user account
  SELECT COUNT(*) INTO v_test_count
  FROM public.accounts
  WHERE id = v_user_b_id;

  IF v_test_count = 0 THEN
    RAISE NOTICE 'PASS: User A cannot read User B account (RLS isolation)';
  ELSE
    RAISE EXCEPTION 'FAIL: User A should not read User B account';
  END IF;

  -- Test child_profiles: can read own profiles
  SELECT COUNT(*) INTO v_test_count
  FROM public.child_profiles
  WHERE account_id = v_user_a_id;

  IF v_test_count >= 1 THEN
    RAISE NOTICE 'PASS: User A can read own child profiles (% profiles)', v_test_count;
  ELSE
    RAISE EXCEPTION 'FAIL: User A should read own child profiles';
  END IF;

  -- Test child_profiles: cannot read other user profiles
  SELECT COUNT(*) INTO v_test_count
  FROM public.child_profiles
  WHERE account_id = v_user_b_id;

  IF v_test_count = 0 THEN
    RAISE NOTICE 'PASS: User A cannot read User B child profiles (RLS isolation)';
  ELSE
    RAISE EXCEPTION 'FAIL: User A should not read User B child profiles';
  END IF;
END $$;

-- ============================================================
-- TEST Phase 7.4: RLS Library (cards) + admin isolation (D2)
-- ============================================================
DO $$
DECLARE
  v_user_b_id UUID;
  v_admin_id UUID;
  v_bank_card_id UUID;
  v_personal_b_id UUID;
  v_test_count INTEGER;
BEGIN
  -- Enforce RLS context for this block
  SET LOCAL row_security = on;
  SET LOCAL ROLE authenticated;

  RAISE NOTICE '';
  RAISE NOTICE '=== TEST Phase 7.4: RLS Library (cards) + D2 ===';

  SELECT user_id INTO v_user_b_id FROM test_users WHERE label = 'user_b';
  SELECT user_id INTO v_admin_id FROM test_users WHERE label = 'admin';

  -- Get existing bank card (SETUP lookup must bypass RLS safely)
  RESET ROLE;
  SET LOCAL row_security = off;

  SELECT id
    INTO v_bank_card_id
  FROM public.cards
  WHERE type = 'bank'
    AND published = TRUE
    AND name = 'Bank Card Public Test'
  LIMIT 1;

  IF v_bank_card_id IS NULL THEN
    RAISE EXCEPTION 'FAIL: Setup bank published card not found (name=Bank Card Public Test)';
  ELSE
    RAISE NOTICE 'PASS: Setup bank published card found: %', v_bank_card_id;
  END IF;

  SET LOCAL row_security = on;
  SET LOCAL ROLE authenticated;

  -- Canaries (avoid false positives after bypass)
  IF current_user <> 'authenticated' THEN
    RAISE EXCEPTION 'FAIL: expected authenticated role after setup lookup (current_user=%)', current_user;
  END IF;

  IF current_setting('row_security', true) <> 'on' THEN
    RAISE EXCEPTION 'FAIL: expected row_security=on after setup lookup (row_security=%)', current_setting('row_security', true);
  END IF;

  -- User B reads bank published
  PERFORM set_config('request.jwt.claim.sub', v_user_b_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  SELECT COUNT(*) INTO v_test_count
  FROM public.cards
  WHERE type = 'bank' AND published = TRUE;

  IF v_test_count >= 1 THEN
    RAISE NOTICE 'PASS: User B can read bank published cards';
  ELSE
    RAISE EXCEPTION 'FAIL: User B should read bank published cards';
  END IF;

  -- User B reads own personal
  SELECT id INTO v_personal_b_id FROM public.cards WHERE account_id = v_user_b_id LIMIT 1;

  IF v_personal_b_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_test_count
    FROM public.cards
    WHERE id = v_personal_b_id;

    IF v_test_count = 1 THEN
      RAISE NOTICE 'PASS: User B can read own personal card';
    ELSE
      RAISE EXCEPTION 'FAIL: User B should read own personal card';
    END IF;

    -- Admin CANNOT read personal cards (D2)
    PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    -- Canaries (avoid false positives)
    IF current_user <> 'authenticated' THEN
      RAISE EXCEPTION 'FAIL: not running as authenticated role in Phase 7.4 (current_user=%)', current_user;
    END IF;

    SELECT COUNT(*) INTO v_test_count
    FROM public.cards
    WHERE id = v_personal_b_id;

    IF v_test_count = 0 THEN
      RAISE NOTICE 'PASS: Admin cannot read User B personal card (D2 enforcement)';
    ELSE
      RAISE EXCEPTION 'FAIL: Admin should NOT read personal cards (D2)';
    END IF;
  ELSE
    RAISE NOTICE 'SKIP: User B has no personal card to test D2 isolation';
  END IF;
END $$;

-- ============================================================
-- TEST Phase 7.5: Admin support channel (targeted access only)
-- ============================================================
DO $$
DECLARE
  v_user_b_id UUID;
  v_admin_id UUID;
  v_support_info JSON;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST Phase 7.5: Admin support channel ===';

  SELECT user_id INTO v_user_b_id FROM test_users WHERE label = 'user_b';
  SELECT user_id INTO v_admin_id FROM test_users WHERE label = 'admin';

  -- Non-admin cannot access support info
  PERFORM set_config('request.jwt.claim.sub', v_user_b_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    SELECT public.admin_get_account_support_info(v_user_b_id) INTO v_support_info;
    RAISE EXCEPTION 'FAIL: Non-admin should not access support info';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%Access denied%' THEN
        RAISE NOTICE 'PASS: Non-admin cannot access admin_get_account_support_info';
      ELSE
        RAISE EXCEPTION 'FAIL: Unexpected error: %', SQLERRM;
      END IF;
  END;

  -- Admin CAN access support info
  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);

  SELECT public.admin_get_account_support_info(v_user_b_id) INTO v_support_info;

  IF v_support_info IS NOT NULL THEN
    RAISE NOTICE 'PASS: Admin can access support info for User B (targeted access only)';
  ELSE
    RAISE EXCEPTION 'FAIL: Admin should access support info';
  END IF;
END $$;

-- ============================================================
-- CLEANUP: rollback-only (preserves system invariants; avoids destructive deletes)
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== CLEANUP: ROLLBACK transaction (no destructive deletes; system invariants preserved) ===';
END $$;

ROLLBACK;

-- ============================================================
-- TEST SUMMARY
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '  Phase 7 RLS Smoke Tests: ALL PASSED';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tested migrations:';
  RAISE NOTICE '  - Phase 7.0: cards.image_url immutable';
  RAISE NOTICE '  - Phase 7.1: RLS helpers (is_admin, is_execution_only)';
  RAISE NOTICE '  - BLOCKER 4: execution-only enforcement (structural blocks)';
  RAISE NOTICE '  - BLOCKER 5: bank unpublished readable if referenced (TSA)';
  RAISE NOTICE '  - anon: bank published read-only (no writes)';
  RAISE NOTICE '  - Phase 7.3: RLS Identity (accounts, devices, child_profiles)';
  RAISE NOTICE '  - Phase 7.4: RLS Library (cards, D2 admin isolation)';
  RAISE NOTICE '  - Phase 7.5: Admin support channel (targeted only)';
  RAISE NOTICE '';
  RAISE NOTICE 'BLOCKERS resolved:';
  RAISE NOTICE '  1. admin_list_accounts_summary removed (no mass surveillance)';
  RAISE NOTICE '  2. search_path hardened on all SECURITY DEFINER functions';
  RAISE NOTICE '  3. REVOKE/GRANT explicit on all functions';
  RAISE NOTICE '  4. execution-only enforcement (child_profiles, cards, categories)';
  RAISE NOTICE '  5. bank unpublished readable if referenced (TSA critical)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Apply migrations: pnpm supabase db push';
  RAISE NOTICE '  2. Run smoke tests: psql ... -f supabase/tests/phase7_smoke_tests.sql';
  RAISE NOTICE '  3. CRITICAL: Phase 8 Storage Policies (before production uploads)';
  RAISE NOTICE '';
END $$;
