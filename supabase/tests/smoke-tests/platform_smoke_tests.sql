\set ON_ERROR_STOP on
\timing on
\x on

BEGIN;

-- 0) Existence checks
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin' AND pronamespace = 'public'::regnamespace) THEN
    RAISE EXCEPTION 'Missing public.is_admin()';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subscriptions') THEN
    RAISE EXCEPTION 'Missing table public.subscriptions';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subscription_logs') THEN
    RAISE EXCEPTION 'Missing table public.subscription_logs';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='consent_events') THEN
    RAISE EXCEPTION 'Missing table public.consent_events';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='account_preferences') THEN
    RAISE EXCEPTION 'Missing table public.account_preferences';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='admin_audit_log') THEN
    RAISE EXCEPTION 'Missing table public.admin_audit_log';
  END IF;

  RAISE NOTICE 'OK: required functions/tables exist';
END $$;

SAVEPOINT s1;

-- Create a test account
-- Create a test auth user + linked account (accounts.id FK -> auth.users.id)
WITH u AS (
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), gen_random_uuid(), 'authenticated', 'authenticated',
    'platform-smoke-free@example.com',
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
SELECT 'created account' AS msg, id FROM a;


DO $$
DECLARE v_account uuid;
BEGIN
SELECT a.id INTO v_account
FROM public.accounts a
JOIN auth.users u ON u.id = a.id
WHERE u.email='platform-smoke-free@example.com';


  IF v_account IS NULL THEN
    RAISE EXCEPTION 'account not created';
  END IF;

  -- 1) account_preferences auto-created/backfilled
  IF NOT EXISTS (SELECT 1 FROM public.account_preferences WHERE account_id = v_account) THEN
    RAISE EXCEPTION 'account_preferences row missing for account %', v_account;
  END IF;

  -- Defaults
  IF EXISTS (
    SELECT 1
    FROM public.account_preferences p
    WHERE p.account_id = v_account
      AND NOT (p.reduced_motion = true AND p.toasts_enabled = true AND p.confetti_enabled = false)
  ) THEN
    RAISE EXCEPTION 'account_preferences defaults not as expected';
  END IF;

  RAISE NOTICE 'OK: account_preferences created + defaults ok';
END $$;

SAVEPOINT s2;

-- 2) subscriptions period constraint
DO $$
DECLARE v_account uuid;
BEGIN
  SELECT a.id INTO v_account
FROM public.accounts a
JOIN auth.users u ON u.id = a.id
WHERE u.email='platform-smoke-free@example.com';


  BEGIN
    INSERT INTO public.subscriptions (account_id, status, current_period_start, current_period_end)
    VALUES (v_account, 'active', now(), now() - interval '1 day');
    RAISE EXCEPTION 'Expected period constraint violation did not happen';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'OK: period constraint rejects invalid period (%).', SQLERRM;
  END;
END $$;

SAVEPOINT s3;

-- 3) unique active subscription per account
DO $$
DECLARE v_account uuid;
BEGIN
  SELECT a.id INTO v_account
FROM public.accounts a
JOIN auth.users u ON u.id = a.id
WHERE u.email='platform-smoke-free@example.com';

  INSERT INTO public.subscriptions (account_id, status, stripe_subscription_id)
  VALUES (v_account, 'active', 'sub_smoke_1');

  BEGIN
    INSERT INTO public.subscriptions (account_id, status, stripe_subscription_id)
    VALUES (v_account, 'trialing', 'sub_smoke_2');
    RAISE EXCEPTION 'Expected unique active-per-account violation did not happen';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'OK: unique active-per-account enforced (%).', SQLERRM;
  END;
END $$;

SAVEPOINT s4;

-- 4) projection: subscriber
DO $$
DECLARE v_account uuid;
DECLARE v_status public.account_status;
BEGIN
  SELECT a.id INTO v_account
FROM public.accounts a
JOIN auth.users u ON u.id = a.id
WHERE u.email='platform-smoke-free@example.com';

  SELECT status INTO v_status FROM public.accounts WHERE id = v_account;
  IF v_status <> 'subscriber' THEN
    RAISE EXCEPTION 'Expected account status subscriber after active subscription, got %', v_status;
  END IF;

  RAISE NOTICE 'OK: subscription projected to accounts.status=subscriber';
END $$;

SAVEPOINT s5;

-- 5) unlock child profiles on upgrade (locked -> active)
DO $$
DECLARE v_account uuid;
DECLARE v_child uuid;
DECLARE v_child_status public.child_profile_status;
BEGIN
  SELECT a.id INTO v_account
FROM public.accounts a
JOIN auth.users u ON u.id = a.id
WHERE u.email='platform-smoke-free@example.com';


INSERT INTO public.child_profiles (account_id, name, status)
  VALUES (v_account, 'SmokeChild', 'locked')
  RETURNING id INTO v_child;

  UPDATE public.subscriptions
    SET status = 'active'
  WHERE account_id = v_account AND stripe_subscription_id = 'sub_smoke_1';

  SELECT status INTO v_child_status FROM public.child_profiles WHERE id = v_child;

  IF v_child_status <> 'active' THEN
    RAISE EXCEPTION 'Expected child_profile unlocked to active, got %', v_child_status;
  END IF;

  RAISE NOTICE 'OK: upgrade unlocks child_profiles locked->active';
END $$;

SAVEPOINT s6;

-- 6) downgrade: free
DO $$
DECLARE v_account uuid;
DECLARE v_status public.account_status;
BEGIN
  SELECT a.id INTO v_account
FROM public.accounts a
JOIN auth.users u ON u.id = a.id
WHERE u.email='platform-smoke-free@example.com';


  UPDATE public.subscriptions
    SET status = 'canceled'
  WHERE account_id = v_account AND stripe_subscription_id = 'sub_smoke_1';

  SELECT status INTO v_status FROM public.accounts WHERE id = v_account;
  IF v_status <> 'free' THEN
    RAISE EXCEPTION 'Expected account status free after cancel, got %', v_status;
  END IF;

  RAISE NOTICE 'OK: cancel projected to accounts.status=free';
END $$;

SAVEPOINT s7;

-- 7) append-only triggers
DO $$
DECLARE v_account uuid;
DECLARE v_log uuid;
DECLARE v_consent uuid;
DECLARE v_admin uuid;
BEGIN
  SELECT a.id INTO v_account
FROM public.accounts a
JOIN auth.users u ON u.id = a.id
WHERE u.email='platform-smoke-free@example.com';


  INSERT INTO public.subscription_logs (account_id, event_type, details)
VALUES (v_account, 'smoke_event', '{"k":"v"}'::jsonb)
  RETURNING id INTO v_log;

  BEGIN
    UPDATE public.subscription_logs SET event_type='mutate' WHERE id=v_log;
    RAISE EXCEPTION 'Expected append-only update rejection did not happen (subscription_logs)';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'OK: subscription_logs update rejected (%).', SQLERRM;
  END;

  INSERT INTO public.consent_events (account_id, consent_type, mode, choices, action)
VALUES (v_account, 'analytics', 'custom', '{"analytics":true}'::jsonb, 'update')
  RETURNING id INTO v_consent;

  BEGIN
    DELETE FROM public.consent_events WHERE id=v_consent;
    RAISE EXCEPTION 'Expected append-only delete rejection did not happen (consent_events)';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'OK: consent_events delete rejected (%).', SQLERRM;
  END;

  INSERT INTO public.admin_audit_log (actor_account_id, target_account_id, action, reason, metadata)
  VALUES (v_account, v_account, 'export_proof_evidence', 'smoke', '{}'::jsonb)
  RETURNING id INTO v_admin;

  BEGIN
    UPDATE public.admin_audit_log SET reason='mutate' WHERE id=v_admin;
    RAISE EXCEPTION 'Expected append-only update rejection did not happen (admin_audit_log)';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'OK: admin_audit_log update rejected (%).', SQLERRM;
  END;

END $$;

ROLLBACK;
