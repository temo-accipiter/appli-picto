\set ON_ERROR_STOP on
\timing on
\x on

BEGIN;

-- ----------------------------
-- 0) Preconditions
-- ----------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RAISE EXCEPTION 'Missing role "authenticated". This test requires Supabase roles.';
  END IF;

  RAISE NOTICE 'OK: role authenticated exists';
END $$;

SAVEPOINT s0;

-- ----------------------------
-- 1) Create users + accounts, cache ids (NO psql variables)
--    Then store them into custom GUCs: test.user_a / test.user_b / test.admin
-- ----------------------------
CREATE TEMP TABLE tmp_ids (
  user_a uuid,
  user_b uuid,
  admin  uuid
) ON COMMIT DROP;

WITH u AS (
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  VALUES
    (gen_random_uuid(), gen_random_uuid(), 'authenticated', 'authenticated',
     'rls-user-a@example.com', crypt('test-password', gen_salt('bf')),
     '{}'::jsonb, '{}'::jsonb, now(), now()),
    (gen_random_uuid(), gen_random_uuid(), 'authenticated', 'authenticated',
     'rls-user-b@example.com', crypt('test-password', gen_salt('bf')),
     '{}'::jsonb, '{}'::jsonb, now(), now()),
    (gen_random_uuid(), gen_random_uuid(), 'authenticated', 'authenticated',
     'rls-admin@example.com',  crypt('test-password', gen_salt('bf')),
     '{}'::jsonb, '{}'::jsonb, now(), now())
  RETURNING id, email
),
a AS (
  INSERT INTO public.accounts (id, status, timezone)
  SELECT
    u.id,
    CASE
      WHEN u.email = 'rls-admin@example.com' THEN 'admin'::public.account_status
      ELSE 'free'::public.account_status
    END,
    'Europe/Paris'
  FROM u
  RETURNING 1
)
INSERT INTO tmp_ids(user_a, user_b, admin)
SELECT
  (SELECT id FROM u WHERE email='rls-user-a@example.com') AS user_a,
  (SELECT id FROM u WHERE email='rls-user-b@example.com') AS user_b,
  (SELECT id FROM u WHERE email='rls-admin@example.com')  AS admin;

DO $$
DECLARE v record;
BEGIN
  SELECT * INTO v FROM tmp_ids;

  IF v.user_a IS NULL OR v.user_b IS NULL OR v.admin IS NULL THEN
    RAISE EXCEPTION 'tmp_ids not fully populated: %', row_to_json(v);
  END IF;

  -- Store ids in custom GUCs (transaction-local)
  PERFORM set_config('test.user_a', v.user_a::text, true);
  PERFORM set_config('test.user_b', v.user_b::text, true);
  PERFORM set_config('test.admin',  v.admin::text,  true);

  RAISE NOTICE 'OK: created accounts + cached ids (user_a=%, user_b=%, admin=%)', v.user_a, v.user_b, v.admin;
END $$;

SAVEPOINT s1;

-- ----------------------------
-- 2) Seed rows as postgres (bypasses RLS)
--    IMPORTANT: do NOT read tmp_ids later under authenticated.
-- ----------------------------
DO $$
DECLARE
  v_user_a uuid := current_setting('test.user_a')::uuid;
  v_user_b uuid := current_setting('test.user_b')::uuid;
  v_admin  uuid := current_setting('test.admin')::uuid;
BEGIN
  INSERT INTO public.subscriptions (account_id, status, stripe_subscription_id)
  VALUES (v_user_a, 'active', 'sub_rls_a');

  INSERT INTO public.subscription_logs (account_id, event_type, details)
  VALUES (v_user_a, 'seed', '{"ok":true}'::jsonb);

  INSERT INTO public.consent_events (account_id, consent_type, mode, choices, action)
  VALUES (v_user_a, 'analytics', 'custom', '{"analytics":true}'::jsonb, 'update');

  INSERT INTO public.admin_audit_log (actor_account_id, target_account_id, action, reason, metadata)
  VALUES (v_admin, v_user_a, 'export_proof_evidence', 'seed', '{}'::jsonb);

  RAISE NOTICE 'OK: seeded rows for subscriptions/logs/consent/audit';
END $$;

SAVEPOINT s2;

-- ----------------------------
-- 3) subscriptions: admin-only SELECT
-- ----------------------------

-- As userA: should see 0 rows (even own)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);

DO $$
DECLARE v_cnt int;
BEGIN
  SELECT count(*) INTO v_cnt
  FROM public.subscriptions
  WHERE stripe_subscription_id = 'sub_rls_a';

  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'RLS FAIL: userA can see subscriptions (cnt=%)', v_cnt;
  END IF;

  RAISE NOTICE 'OK: userA cannot SELECT subscriptions (admin-only)';
END $$;

RESET ROLE;
SAVEPOINT s3;

-- As admin: should see 1 row
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('test.admin'), true);

DO $$
DECLARE v_cnt int;
BEGIN
  SELECT count(*) INTO v_cnt
  FROM public.subscriptions
  WHERE stripe_subscription_id = 'sub_rls_a';

  IF v_cnt <> 1 THEN
    RAISE EXCEPTION 'RLS FAIL: admin cannot see subscriptions (cnt=%)', v_cnt;
  END IF;

  RAISE NOTICE 'OK: admin can SELECT subscriptions';
END $$;

RESET ROLE;
SAVEPOINT s4;

-- ----------------------------
-- 4) subscription_logs: admin-only SELECT
-- ----------------------------

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);

DO $$
DECLARE v_cnt int;
BEGIN
  SELECT count(*) INTO v_cnt
  FROM public.subscription_logs
  WHERE event_type = 'seed';

  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'RLS FAIL: userA can see subscription_logs (cnt=%)', v_cnt;
  END IF;

  RAISE NOTICE 'OK: userA cannot SELECT subscription_logs';
END $$;

RESET ROLE;
SAVEPOINT s5;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('test.admin'), true);

DO $$
DECLARE v_cnt int;
BEGIN
  SELECT count(*) INTO v_cnt
  FROM public.subscription_logs
  WHERE event_type = 'seed';

  IF v_cnt <> 1 THEN
    RAISE EXCEPTION 'RLS FAIL: admin cannot see subscription_logs (cnt=%)', v_cnt;
  END IF;

  RAISE NOTICE 'OK: admin can SELECT subscription_logs';
END $$;

RESET ROLE;
SAVEPOINT s6;

-- ----------------------------
-- 5) admin_audit_log: admin-only SELECT + admin-only INSERT
-- ----------------------------

-- userA cannot see audit
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);

DO $$
DECLARE v_cnt int;
BEGIN
  SELECT count(*) INTO v_cnt FROM public.admin_audit_log;

  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'RLS FAIL: userA can see admin_audit_log (cnt=%)', v_cnt;
  END IF;

  RAISE NOTICE 'OK: userA cannot SELECT admin_audit_log';
END $$;

-- userA cannot INSERT audit
DO $$
BEGIN
  BEGIN
    INSERT INTO public.admin_audit_log (actor_account_id, target_account_id, action, reason, metadata)
    VALUES (
      current_setting('test.user_a')::uuid,
      current_setting('test.user_b')::uuid,
      'export_proof_evidence',
      'should_fail',
      '{}'::jsonb
    );
    RAISE EXCEPTION 'RLS FAIL: userA INSERT into admin_audit_log unexpectedly succeeded';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'OK: userA INSERT admin_audit_log rejected (%).', SQLERRM;
  END;
END $$;

RESET ROLE;
SAVEPOINT s7;

-- admin can SELECT + INSERT
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('test.admin'), true);

DO $$
DECLARE v_before int;
DECLARE v_after  int;
BEGIN
  SELECT count(*) INTO v_before FROM public.admin_audit_log;

  INSERT INTO public.admin_audit_log (actor_account_id, target_account_id, action, reason, metadata)
  VALUES (
    current_setting('test.admin')::uuid,
    current_setting('test.user_a')::uuid,
    'export_proof_evidence',
    'admin_ok',
    '{}'::jsonb
  );

  SELECT count(*) INTO v_after FROM public.admin_audit_log;

  IF v_after <> v_before + 1 THEN
    RAISE EXCEPTION 'RLS FAIL: admin INSERT admin_audit_log did not increase row count (% -> %)', v_before, v_after;
  END IF;

  RAISE NOTICE 'OK: admin can SELECT+INSERT admin_audit_log';
END $$;

RESET ROLE;
SAVEPOINT s8;

-- ----------------------------
-- 6) account_preferences: self-only SELECT/UPDATE
-- ----------------------------

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);

DO $$
DECLARE v_cnt int;
BEGIN
  SELECT count(*) INTO v_cnt
  FROM public.account_preferences
  WHERE account_id = current_setting('test.user_a')::uuid;

  IF v_cnt <> 1 THEN
    RAISE EXCEPTION 'RLS FAIL: userA cannot see own account_preferences (cnt=%)', v_cnt;
  END IF;

  RAISE NOTICE 'OK: userA can SELECT own account_preferences';
END $$;

DO $$
DECLARE v_cnt int;
BEGIN
  SELECT count(*) INTO v_cnt
  FROM public.account_preferences
  WHERE account_id = current_setting('test.user_b')::uuid;

  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'RLS FAIL: userA can see userB account_preferences (cnt=%)', v_cnt;
  END IF;

  RAISE NOTICE 'OK: userA cannot SELECT userB account_preferences';
END $$;

DO $$
BEGIN
  UPDATE public.account_preferences
  SET confetti_enabled = true
  WHERE account_id = current_setting('test.user_a')::uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RLS FAIL: userA UPDATE own account_preferences did not affect a row';
  END IF;

  RAISE NOTICE 'OK: userA can UPDATE own account_preferences';
END $$;

DO $$
BEGIN
  UPDATE public.account_preferences
  SET confetti_enabled = true
  WHERE account_id = current_setting('test.user_b')::uuid;

  IF FOUND THEN
    RAISE EXCEPTION 'RLS FAIL: userA updated userB account_preferences';
  END IF;

  RAISE NOTICE 'OK: userA cannot UPDATE userB account_preferences';
END $$;

RESET ROLE;

ROLLBACK;
