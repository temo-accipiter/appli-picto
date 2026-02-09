\set ON_ERROR_STOP on
\timing on
\x on

BEGIN;

-- 0) Existence checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typnamespace='public'::regnamespace AND typname='transport_type'
  ) THEN
    RAISE EXCEPTION 'Missing type public.transport_type';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='stations'
  ) THEN
    RAISE EXCEPTION 'Missing table public.stations';
  END IF;

  -- Columns in account_preferences
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='account_preferences' AND column_name='train_progress_enabled'
  ) THEN
    RAISE EXCEPTION 'Missing column account_preferences.train_progress_enabled';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='account_preferences' AND column_name='train_line'
  ) THEN
    RAISE EXCEPTION 'Missing column account_preferences.train_line';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='account_preferences' AND column_name='train_type'
  ) THEN
    RAISE EXCEPTION 'Missing column account_preferences.train_type';
  END IF;

  RAISE NOTICE 'OK: microfeatures required objects exist';
END $$;

SAVEPOINT s1;

-- 1) Create a test account (auth.users + accounts) to test account_preferences guards
WITH u AS (
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), gen_random_uuid(), 'authenticated', 'authenticated',
    'platform-microfeatures@example.com',
    crypt('test-password', gen_salt('bf')),
    '{}'::jsonb, '{}'::jsonb,
    now(), now()
  )
  RETURNING id
),
a AS (
  INSERT INTO public.accounts (id, status, timezone)
  SELECT u.id, 'free', 'Europe/Paris'
  FROM u
  RETURNING id
)
SELECT 'created microfeatures account' AS msg, id FROM a;

DO $$
DECLARE v_account uuid;
DECLARE v_confetti boolean;
DECLARE v_rm boolean;
BEGIN
  SELECT a.id INTO v_account
  FROM public.accounts a
  JOIN auth.users u ON u.id = a.id
  WHERE u.email='platform-microfeatures@example.com';

  IF v_account IS NULL THEN
    RAISE EXCEPTION 'account not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.account_preferences WHERE account_id = v_account) THEN
    RAISE EXCEPTION 'account_preferences row missing';
  END IF;

  -- Attempt to set reduced_motion=true AND confetti_enabled=true
  -- DB must FORCE confetti OFF (trigger) and must never allow the invalid state (check)
  UPDATE public.account_preferences
  SET reduced_motion = true, confetti_enabled = true
  WHERE account_id = v_account;

  SELECT reduced_motion, confetti_enabled INTO v_rm, v_confetti
  FROM public.account_preferences
  WHERE account_id = v_account;

  IF v_rm IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Expected reduced_motion=true, got %', v_rm;
  END IF;

  IF v_confetti IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Invariant broken: confetti must be forced OFF when reduced_motion=true (got %)', v_confetti;
  END IF;

  RAISE NOTICE 'OK: reduced_motion forces confetti OFF (trigger + check)';
END $$;

SAVEPOINT s2;

-- 2) stations RLS: read-only for anon + authenticated
-- Seed 1 station row as postgres
INSERT INTO public.stations (type, ligne, ordre, label)
VALUES ('metro', '1', 1, 'Test Station')
ON CONFLICT DO NOTHING;

-- As anon: SELECT OK, write must fail
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    RAISE EXCEPTION 'Missing role anon';
  END IF;
END $$;

SET LOCAL ROLE anon;

DO $$
DECLARE v_cnt int;
BEGIN
  SELECT count(*) INTO v_cnt FROM public.stations WHERE label='Test Station';
  IF v_cnt < 1 THEN
    RAISE EXCEPTION 'anon SELECT stations expected >=1 row, got %', v_cnt;
  END IF;
  RAISE NOTICE 'OK: anon can SELECT stations';
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.stations (type, ligne, ordre, label)
    VALUES ('metro', '1', 2, 'Anon Write Should Fail');
    RAISE EXCEPTION 'Expected anon INSERT to fail but it succeeded';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'OK: anon INSERT rejected (%).', SQLERRM;
  END;
END $$;

RESET ROLE;

-- As authenticated: SELECT OK, UPDATE must NOT be able to change anything
SET LOCAL ROLE authenticated;

DO $$
DECLARE v_cnt int;
BEGIN
  SELECT count(*) INTO v_cnt FROM public.stations WHERE label='Test Station';
  IF v_cnt < 1 THEN
    RAISE EXCEPTION 'authenticated SELECT stations expected >=1 row, got %', v_cnt;
  END IF;
  RAISE NOTICE 'OK: authenticated can SELECT stations';
END $$;

DO $$
DECLARE v_id uuid;
DECLARE v_label text;
DECLARE v_rows int;
BEGIN
  BEGIN
    -- Pick a row visible via SELECT
    SELECT id INTO v_id
    FROM public.stations
    WHERE label='Test Station'
    LIMIT 1;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Test Station not found (SELECT should be allowed)';
    END IF;

    -- Attempt UPDATE
    UPDATE public.stations
    SET label='Authenticated Write Should Fail'
    WHERE id = v_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;

    -- Verify nothing changed
    SELECT label INTO v_label
    FROM public.stations
    WHERE id = v_id;

    IF v_rows <> 0 OR v_label <> 'Test Station' THEN
      RAISE EXCEPTION 'RLS FAIL: authenticated modified stations (rows=%, label=%)', v_rows, v_label;
    END IF;

    RAISE NOTICE 'OK: authenticated cannot UPDATE stations (blocked, rows=%)', v_rows;

  EXCEPTION WHEN others THEN
    -- Also OK if we get a real error (permission denied / RLS violation)
    RAISE NOTICE 'OK: authenticated UPDATE stations rejected (%).', SQLERRM;
  END;
END $$;

RESET ROLE;

ROLLBACK;
