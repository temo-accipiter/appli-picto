-- ============================================================
-- Phase 9 — Smoke Tests: Quotas & Downgrade
-- ============================================================
-- Date: 2026-02-06
-- Migrations couvertes:
--   20260204135000_phase9_1_quota_month_context.sql
--   20260204136000_phase9_2_quota_helpers.sql
--   20260204137000_phase9_3_quota_check_cards.sql
--   20260204138000_phase9_4_quota_check_profiles_devices.sql
--   20260204139000_phase9_5_downgrade_lock_profiles_on_session_completion.sql
--   20260204140000_phase9_6_fix_child_profiles_auto_timeline_privileges.sql
--
-- Objectif: Vérifier quota helpers, month context, feature gating cards,
--           quota profils (free=1, sub=3, admin=∞), quota devices,
--           downgrade lock (session completed → profils verrouillés).
-- Exécution: psql -v ON_ERROR_STOP=1 -f phase9_smoke.sql
-- ============================================================

BEGIN;

-- ============================================================
-- SETUP
-- ============================================================
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
VALUES
  ('ff000000-0000-0000-0000-000000000001', 'p9-free@test.local',
   '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
   NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('ff000000-0000-0000-0000-000000000002', 'p9-sub@test.local',
   '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
   NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('ff000000-0000-0000-0000-000000000003', 'p9-admin@test.local',
   '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
   NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, status, timezone) VALUES
  ('ff000000-0000-0000-0000-000000000001', 'free', 'Europe/Paris'),
  ('ff000000-0000-0000-0000-000000000002', 'subscriber', 'America/New_York'),
  ('ff000000-0000-0000-0000-000000000003', 'admin', 'UTC')
ON CONFLICT (id) DO NOTHING;

-- Les auto-triggers ont créé 1 profil + 1 timeline + 2 slots par compte

DO $$
BEGIN
  RAISE NOTICE '  SETUP — free=ff...01, subscriber=ff...02, admin=ff...03';
END $$;


-- ============================================================
-- TEST 1: Table account_quota_months existe
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'account_quota_months'
  ) THEN
    RAISE EXCEPTION 'TEST 1 FAILED: table account_quota_months n''existe pas';
  END IF;

  RAISE NOTICE '✅ TEST 1 PASS — Table account_quota_months existe';
END $$;


-- ============================================================
-- TEST 2: Quota helpers — valeurs correctes
-- ============================================================
DO $$
BEGIN
  -- Profiles: free=1, subscriber=3, admin=NULL (illimité)
  IF public.quota_profiles_limit('free') != 1 THEN
    RAISE EXCEPTION 'TEST 2 FAILED: quota_profiles_limit(free) != 1';
  END IF;
  IF public.quota_profiles_limit('subscriber') != 3 THEN
    RAISE EXCEPTION 'TEST 2 FAILED: quota_profiles_limit(subscriber) != 3';
  END IF;
  IF public.quota_profiles_limit('admin') IS NOT NULL THEN
    RAISE EXCEPTION 'TEST 2 FAILED: quota_profiles_limit(admin) devrait être NULL';
  END IF;

  -- Devices: free=1, subscriber=3, admin=NULL
  IF public.quota_devices_limit('free') != 1 THEN
    RAISE EXCEPTION 'TEST 2 FAILED: quota_devices_limit(free) != 1';
  END IF;
  IF public.quota_devices_limit('subscriber') != 3 THEN
    RAISE EXCEPTION 'TEST 2 FAILED: quota_devices_limit(subscriber) != 3';
  END IF;

  -- Cards stock: subscriber=50, admin=NULL
  IF public.quota_cards_stock_limit('subscriber') != 50 THEN
    RAISE EXCEPTION 'TEST 2 FAILED: quota_cards_stock_limit(subscriber) != 50';
  END IF;
  IF public.quota_cards_stock_limit('admin') IS NOT NULL THEN
    RAISE EXCEPTION 'TEST 2 FAILED: quota_cards_stock_limit(admin) devrait être NULL';
  END IF;

  -- Cards monthly: subscriber=100, admin=NULL
  IF public.quota_cards_monthly_limit('subscriber') != 100 THEN
    RAISE EXCEPTION 'TEST 2 FAILED: quota_cards_monthly_limit(subscriber) != 100';
  END IF;

  -- Feature gating: free=FALSE, subscriber=TRUE, admin=TRUE
  IF public.cards_personal_feature_enabled('free') != FALSE THEN
    RAISE EXCEPTION 'TEST 2 FAILED: cards_personal_feature_enabled(free) != FALSE';
  END IF;
  IF public.cards_personal_feature_enabled('subscriber') != TRUE THEN
    RAISE EXCEPTION 'TEST 2 FAILED: cards_personal_feature_enabled(subscriber) != TRUE';
  END IF;

  RAISE NOTICE '✅ TEST 2 PASS — Quota helpers valeurs correctes';
END $$;


-- ============================================================
-- TEST 3: ensure_quota_month_context — crée et retourne un contexte
-- ============================================================
DO $$
DECLARE
  v_ctx record;
BEGIN
  SELECT * INTO v_ctx
  FROM public.ensure_quota_month_context('ff000000-0000-0000-0000-000000000002');

  IF v_ctx.period_ym IS NULL THEN
    RAISE EXCEPTION 'TEST 3 FAILED: period_ym NULL';
  END IF;

  IF v_ctx.tz_ref != 'America/New_York' THEN
    RAISE EXCEPTION 'TEST 3 FAILED: tz_ref=% (attendu America/New_York)', v_ctx.tz_ref;
  END IF;

  IF v_ctx.month_end_utc <= v_ctx.month_start_utc THEN
    RAISE EXCEPTION 'TEST 3 FAILED: month_end <= month_start';
  END IF;

  RAISE NOTICE '✅ TEST 3 PASS — ensure_quota_month_context retourne contexte (period=%, tz=%)', v_ctx.period_ym, v_ctx.tz_ref;
END $$;


-- ============================================================
-- TEST 4: ensure_quota_month_context — idempotent (2e appel = même row)
-- ============================================================
DO $$
DECLARE
  v_ctx1 record;
  v_ctx2 record;
BEGIN
  SELECT * INTO v_ctx1 FROM public.ensure_quota_month_context('ff000000-0000-0000-0000-000000000002');
  SELECT * INTO v_ctx2 FROM public.ensure_quota_month_context('ff000000-0000-0000-0000-000000000002');

  IF v_ctx1.period_ym != v_ctx2.period_ym THEN
    RAISE EXCEPTION 'TEST 4 FAILED: period_ym différent entre 2 appels';
  END IF;

  RAISE NOTICE '✅ TEST 4 PASS — ensure_quota_month_context idempotent';
END $$;


-- ============================================================
-- TEST 5: Free — personal card bloquée (FEATURE_UNAVAILABLE)
-- ============================================================
DO $$
BEGIN
  BEGIN
    INSERT INTO cards (name, image_url, type, account_id)
    VALUES ('Free Card', 'https://test.local/f.png', 'personal', 'ff000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'TEST 5 FAILED: carte personal acceptée pour free';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 5 FAILED%' THEN RAISE; END IF;
      NULL; -- Feature gating bloque = attendu
  END;

  RAISE NOTICE '✅ TEST 5 PASS — Free: personal card bloquée (feature unavailable)';
END $$;


-- ============================================================
-- TEST 6: Subscriber — personal card acceptée
-- ============================================================
DO $$
DECLARE
  v_card_id uuid;
BEGIN
  INSERT INTO cards (name, image_url, type, account_id)
  VALUES ('Sub Card 1', 'https://test.local/s1.png', 'personal', 'ff000000-0000-0000-0000-000000000002')
  RETURNING id INTO v_card_id;

  IF v_card_id IS NULL THEN
    RAISE EXCEPTION 'TEST 6 FAILED: carte personal non créée pour subscriber';
  END IF;

  RAISE NOTICE '✅ TEST 6 PASS — Subscriber: personal card acceptée';
END $$;


-- ============================================================
-- TEST 7: Subscriber — monthly quota s'incrémente
-- ============================================================
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT personal_cards_created INTO v_count
  FROM account_quota_months
  WHERE account_id = 'ff000000-0000-0000-0000-000000000002'
  ORDER BY period_ym DESC LIMIT 1;

  IF v_count IS NULL OR v_count < 1 THEN
    RAISE EXCEPTION 'TEST 7 FAILED: personal_cards_created=% (devrait être >= 1)', v_count;
  END IF;

  RAISE NOTICE '✅ TEST 7 PASS — Monthly quota incrémenté (personal_cards_created=%)', v_count;
END $$;


-- ============================================================
-- TEST 8: Bank card — pas affectée par quota (admin ou pas)
-- ============================================================
DO $$
DECLARE
  v_card uuid;
BEGIN
  INSERT INTO cards (name, image_url, type, published)
  VALUES ('Bank Free', 'https://test.local/bank-free.png', 'bank', TRUE)
  RETURNING id INTO v_card;

  IF v_card IS NULL THEN
    RAISE EXCEPTION 'TEST 8 FAILED: bank card non créée';
  END IF;

  RAISE NOTICE '✅ TEST 8 PASS — Bank card pas affectée par quota';
END $$;


-- ============================================================
-- TEST 9: Free — quota profils = 1 (auto-créé déjà 1, 2e bloqué)
-- ============================================================
DO $$
BEGIN
  BEGIN
    INSERT INTO child_profiles (account_id, name)
    VALUES ('ff000000-0000-0000-0000-000000000001', 'Deuxième Enfant Free');
    RAISE EXCEPTION 'TEST 9 FAILED: 2e profil accepté pour free';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 9 FAILED%' THEN RAISE; END IF;
      NULL; -- Quota bloque = attendu
  END;

  RAISE NOTICE '✅ TEST 9 PASS — Free: quota profils = 1 (2e bloqué)';
END $$;


-- ============================================================
-- TEST 10: Subscriber — quota profils = 3
-- ============================================================
DO $$
DECLARE
  v_p2 uuid;
  v_p3 uuid;
BEGIN
  -- Auto-créé = 1. On peut en ajouter 2 de plus.
  INSERT INTO child_profiles (account_id, name)
  VALUES ('ff000000-0000-0000-0000-000000000002', 'Enfant 2 Sub')
  RETURNING id INTO v_p2;

  INSERT INTO child_profiles (account_id, name)
  VALUES ('ff000000-0000-0000-0000-000000000002', 'Enfant 3 Sub')
  RETURNING id INTO v_p3;

  -- 4e profil → bloqué
  BEGIN
    INSERT INTO child_profiles (account_id, name)
    VALUES ('ff000000-0000-0000-0000-000000000002', 'Enfant 4 Sub');
    RAISE EXCEPTION 'TEST 10 FAILED: 4e profil accepté pour subscriber';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 10 FAILED%' THEN RAISE; END IF;
      NULL; -- Quota bloque = attendu
  END;

  RAISE NOTICE '✅ TEST 10 PASS — Subscriber: quota profils = 3 (4e bloqué)';
END $$;


-- ============================================================
-- TEST 11: Free — quota devices = 1
-- ============================================================
DO $$
BEGIN
  -- Auto-triggered device registration doesn't happen. Insert manually.
  INSERT INTO devices (account_id, device_id)
  VALUES ('ff000000-0000-0000-0000-000000000001', gen_random_uuid());

  -- 2e device → bloqué
  BEGIN
    INSERT INTO devices (account_id, device_id)
    VALUES ('ff000000-0000-0000-0000-000000000001', gen_random_uuid());
    RAISE EXCEPTION 'TEST 11 FAILED: 2e device accepté pour free';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 11 FAILED%' THEN RAISE; END IF;
      NULL; -- Quota bloque = attendu
  END;

  RAISE NOTICE '✅ TEST 11 PASS — Free: quota devices = 1 (2e bloqué)';
END $$;


-- ============================================================
-- TEST 12: Device déjà révoqué ne consomme pas de quota
-- ============================================================
DO $$
BEGIN
  -- Insérer un device déjà révoqué → ne devrait PAS consommer de quota
  INSERT INTO devices (account_id, device_id, revoked_at)
  VALUES ('ff000000-0000-0000-0000-000000000001', gen_random_uuid(), NOW());

  RAISE NOTICE '✅ TEST 12 PASS — Device déjà révoqué ne consomme pas de quota';
END $$;


-- ============================================================
-- TEST 13: Admin — profils illimités
-- ============================================================
DO $$
DECLARE
  i int;
BEGIN
  FOR i IN 1..5 LOOP
    INSERT INTO child_profiles (account_id, name)
    VALUES ('ff000000-0000-0000-0000-000000000003', 'Admin Child ' || i);
  END LOOP;

  RAISE NOTICE '✅ TEST 13 PASS — Admin: profils illimités (5 créés en plus de l''auto)';
END $$;


-- ============================================================
-- TEST 14: Admin — personal cards illimités
-- ============================================================
DO $$
DECLARE
  i int;
BEGIN
  FOR i IN 1..5 LOOP
    INSERT INTO cards (name, image_url, type, account_id)
    VALUES ('Admin Card ' || i, 'https://test.local/adm' || i || '.png', 'personal', 'ff000000-0000-0000-0000-000000000003');
  END LOOP;

  RAISE NOTICE '✅ TEST 14 PASS — Admin: personal cards illimités';
END $$;


-- ============================================================
-- TEST 15: account_quota_months constraints
-- ============================================================
DO $$
BEGIN
  -- month_end <= month_start → CHECK violation
  BEGIN
    INSERT INTO account_quota_months (account_id, period_ym, tz_ref, month_start_utc, month_end_utc)
    VALUES ('ff000000-0000-0000-0000-000000000002', 999901, 'UTC', '2099-01-31T00:00:00Z', '2099-01-01T00:00:00Z');
    RAISE EXCEPTION 'TEST 15a FAILED: month_end < month_start accepté';
  EXCEPTION
    WHEN check_violation THEN NULL; -- Attendu
  END;

  -- tz_ref invalide → CHECK violation
  BEGIN
    INSERT INTO account_quota_months (account_id, period_ym, tz_ref, month_start_utc, month_end_utc)
    VALUES ('ff000000-0000-0000-0000-000000000002', 999902, 'Fake/Zone', '2099-02-01T00:00:00Z', '2099-03-01T00:00:00Z');
    RAISE EXCEPTION 'TEST 15b FAILED: tz_ref invalide accepté';
  EXCEPTION
    WHEN check_violation THEN NULL; -- Attendu
  END;

  -- personal_cards_created < 0 → CHECK violation
  BEGIN
    INSERT INTO account_quota_months (account_id, period_ym, tz_ref, month_start_utc, month_end_utc, personal_cards_created)
    VALUES ('ff000000-0000-0000-0000-000000000002', 999903, 'UTC', '2099-03-01T00:00:00Z', '2099-04-01T00:00:00Z', -1);
    RAISE EXCEPTION 'TEST 15c FAILED: personal_cards_created négatif accepté';
  EXCEPTION
    WHEN check_violation THEN NULL; -- Attendu
  END;

  RAISE NOTICE '✅ TEST 15 PASS — account_quota_months constraints (bounds, tz, non-negative)';
END $$;


-- ============================================================
-- TEST 16: Downgrade lock — subscriber → free verrouille profils excédentaires
-- Simule: subscriber avec 3 profils, downgrade → free (quota 1)
-- Session completion trigger → lock les 2 profils les plus récents
-- ============================================================
DO $$
DECLARE
  v_user uuid := 'ff000000-0000-0000-0000-000000000002';
  v_profile1 uuid;
  v_timeline1 uuid;
  v_session uuid;
  v_step uuid;
  v_card uuid;
  v_active_count int;
  v_locked_count int;
BEGIN
  -- Le subscriber a 3 profils. Récupérer le plus ancien (même tri que enforce_child_profile_limit).
  SELECT id INTO v_profile1 FROM child_profiles
  WHERE account_id = v_user ORDER BY created_at ASC, id ASC LIMIT 1;

  SELECT id INTO v_timeline1 FROM timelines WHERE child_profile_id = v_profile1;

  -- Donner un step avec carte pour pouvoir compléter
  SELECT id INTO v_step FROM slots
  WHERE timeline_id = v_timeline1 AND kind = 'step' LIMIT 1;

  INSERT INTO cards (name, image_url, type, account_id)
  VALUES ('Downgrade Card', 'https://test.local/dg.png', 'personal', v_user)
  RETURNING id INTO v_card;

  UPDATE slots SET card_id = v_card WHERE id = v_step;

  -- Créer session et la compléter (preview → started → completed)
  INSERT INTO sessions (child_profile_id, timeline_id, state)
  VALUES (v_profile1, v_timeline1, 'active_preview')
  RETURNING id INTO v_session;

  -- Downgrade AVANT completion (pour que le trigger fire avec status free)
  UPDATE accounts SET status = 'free' WHERE id = v_user;

  -- Valider le step → auto-transition → completed → trigger downgrade lock
  INSERT INTO session_validations (session_id, slot_id) VALUES (v_session, v_step);

  -- Vérifier: 1 profil actif, 2 verrouillés
  SELECT COUNT(*) INTO v_active_count FROM child_profiles
  WHERE account_id = v_user AND status = 'active';

  SELECT COUNT(*) INTO v_locked_count FROM child_profiles
  WHERE account_id = v_user AND status = 'locked';

  IF v_active_count != 1 THEN
    RAISE EXCEPTION 'TEST 16 FAILED: active=% (attendu 1)', v_active_count;
  END IF;

  IF v_locked_count != 2 THEN
    RAISE EXCEPTION 'TEST 16 FAILED: locked=% (attendu 2)', v_locked_count;
  END IF;

  -- Vérifier que le profil actif est bien celui avec le plus petit (created_at, id)
  -- Note: dans une même transaction, created_at identiques → tiebreaker = id ASC (UUID)
  IF NOT EXISTS (
    SELECT 1 FROM child_profiles
    WHERE account_id = v_user AND status = 'active'
      AND id = (
        SELECT id FROM child_profiles
        WHERE account_id = v_user
        ORDER BY created_at ASC, id ASC
        LIMIT 1
      )
  ) THEN
    RAISE EXCEPTION 'TEST 16 FAILED: le profil avec le plus petit (created_at, id) n''est pas actif';
  END IF;

  RAISE NOTICE '✅ TEST 16 PASS — Downgrade lock: 1 actif (déterministe) + 2 verrouillés';
END $$;


-- ============================================================
-- TEST 17: get_account_status helper
-- ============================================================
DO $$
BEGIN
  -- Le subscriber est passé free au test 16
  IF public.get_account_status('ff000000-0000-0000-0000-000000000001') != 'free' THEN
    RAISE EXCEPTION 'TEST 17 FAILED: get_account_status free incorrect';
  END IF;

  IF public.get_account_status('ff000000-0000-0000-0000-000000000003') != 'admin' THEN
    RAISE EXCEPTION 'TEST 17 FAILED: get_account_status admin incorrect';
  END IF;

  RAISE NOTICE '✅ TEST 17 PASS — get_account_status helper';
END $$;


-- ============================================================
-- TEST 18: RLS activé sur account_quota_months
-- ============================================================
DO $$
DECLARE
  v_rls boolean;
BEGIN
  SELECT c.relrowsecurity INTO v_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'account_quota_months';

  IF v_rls IS NOT TRUE THEN
    RAISE EXCEPTION 'TEST 18 FAILED: RLS non activé sur account_quota_months';
  END IF;

  RAISE NOTICE '✅ TEST 18 PASS — RLS activé sur account_quota_months';
END $$;


-- ============================================================
-- TEST 19: SECURITY DEFINER functions existent et sont protégées
-- ============================================================
DO $$
DECLARE
  v_definer boolean;
BEGIN
  -- enforce_child_profile_limit_after_session_completion doit être SECURITY DEFINER
  SELECT p.prosecdef INTO v_definer
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'enforce_child_profile_limit_after_session_completion';

  IF v_definer IS NOT TRUE THEN
    RAISE EXCEPTION 'TEST 19 FAILED: enforce_child_profile_limit n''est pas SECURITY DEFINER';
  END IF;

  -- child_profiles_auto_create_timeline doit être SECURITY DEFINER
  SELECT p.prosecdef INTO v_definer
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'child_profiles_auto_create_timeline';

  IF v_definer IS NOT TRUE THEN
    RAISE EXCEPTION 'TEST 19 FAILED: child_profiles_auto_create_timeline n''est pas SECURITY DEFINER';
  END IF;

  -- timelines_auto_create_minimal_slots doit être SECURITY DEFINER
  SELECT p.prosecdef INTO v_definer
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'timelines_auto_create_minimal_slots';

  IF v_definer IS NOT TRUE THEN
    RAISE EXCEPTION 'TEST 19 FAILED: timelines_auto_create_minimal_slots n''est pas SECURITY DEFINER';
  END IF;

  RAISE NOTICE '✅ TEST 19 PASS — SECURITY DEFINER functions protégées';
END $$;


-- ============================================================
-- TEST 20: enforce_child_profile_limit bloquée si appelée hors trigger
-- ============================================================
DO $$
BEGIN
  BEGIN
    PERFORM public.enforce_child_profile_limit_after_session_completion(gen_random_uuid());
    RAISE EXCEPTION 'TEST 20 FAILED: function callable hors trigger';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL; -- Attendu (pg_trigger_depth() = 0)
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 20 FAILED%' THEN RAISE; END IF;
      NULL; -- Aussi acceptable
  END;

  RAISE NOTICE '✅ TEST 20 PASS — enforce_child_profile_limit bloquée hors trigger (pg_trigger_depth guard)';
END $$;


-- ============================================================
-- CLEANUP
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ Phase 9 Smoke Tests — TOUS PASSÉS (20/20)';
  RAISE NOTICE '====================================================';
END $$;

ROLLBACK;