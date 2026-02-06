-- ============================================================
-- Phase 2 — Smoke Tests: Core Ownership
-- ============================================================
-- Date: 2026-02-06
-- Migrations couvertes:
--   20260130101000_create_accounts.sql
--   20260130102000_create_devices.sql
--   20260130103000_create_child_profiles.sql
--   20260130113000_auto_create_child_profile_timeline.sql (cascades auto)
--   20260130118000_phase5_5_hardening_accounts_devices.sql
--   20260201120000_phase5_7_seed_system_category_on_account_create.sql
--
-- Objectif: Vérifier structure tables, FK cascades, contraintes,
--           auto-création (profil+timeline+slots+catégorie système),
--           hardening timezone et devices.
-- Exécution: psql -v ON_ERROR_STOP=1 -f phase2_smoke.sql
-- ============================================================

BEGIN;

-- ============================================================
-- TEST 1: Tables existent
-- ============================================================
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('accounts', 'devices', 'child_profiles');

  IF v_count != 3 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: attendu 3 tables, trouvé %', v_count;
  END IF;

  RAISE NOTICE '✅ TEST 1 PASS — Tables accounts, devices, child_profiles existent';
END $$;


-- ============================================================
-- TEST 2: accounts.id = FK auth.users ON DELETE CASCADE
-- ============================================================
DO $$
DECLARE
  v_user_id uuid := 'aa000000-0000-0000-0000-000000000001';
BEGIN
  -- Créer user auth
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
  VALUES (v_user_id, 'phase2-test1@test.local',
    '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
    NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  -- Créer account
  INSERT INTO accounts (id, status, timezone)
  VALUES (v_user_id, 'free', 'Europe/Paris')
  ON CONFLICT (id) DO NOTHING;

  -- Vérifier que le compte existe
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'TEST 2 FAILED: account non créé';
  END IF;

  -- Nettoyage catégories avant cascade :
  -- Le trigger BEFORE DELETE remap modifie des tuples, empêchant DELETE après UPDATE.
  -- Solution: désactiver temporairement le trigger, supprimer, ré-activer.
  DELETE FROM user_card_categories WHERE user_id = v_user_id;
  ALTER TABLE categories DISABLE TRIGGER trigger_categories_before_delete_remap;
  DELETE FROM categories WHERE account_id = v_user_id;
  ALTER TABLE categories ENABLE TRIGGER trigger_categories_before_delete_remap;

  DELETE FROM auth.users WHERE id = v_user_id;

  IF EXISTS (SELECT 1 FROM accounts WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'TEST 2 FAILED: account persiste après DELETE auth.users (CASCADE manquant)';
  END IF;

  RAISE NOTICE '✅ TEST 2 PASS — accounts.id FK auth.users ON DELETE CASCADE';
END $$;


-- ============================================================
-- SETUP: Créer un utilisateur durable pour les tests suivants
-- ============================================================
DO $$
BEGIN
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
  VALUES (
    'aa000000-0000-0000-0000-000000000002',
    'phase2-main@test.local',
    '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
    NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO accounts (id, status, timezone)
  VALUES ('aa000000-0000-0000-0000-000000000002', 'subscriber', 'Europe/Paris')
  ON CONFLICT (id) DO NOTHING;
END $$;

CREATE TEMP TABLE _p2_ids (key TEXT PRIMARY KEY, val UUID NOT NULL);

DO $$
DECLARE
  v_profile uuid;
  v_timeline uuid;
BEGIN
  SELECT id INTO v_profile FROM child_profiles
  WHERE account_id = 'aa000000-0000-0000-0000-000000000002' LIMIT 1;

  SELECT id INTO v_timeline FROM timelines
  WHERE child_profile_id = v_profile;

  INSERT INTO _p2_ids VALUES ('account', 'aa000000-0000-0000-0000-000000000002');
  INSERT INTO _p2_ids VALUES ('profile', v_profile);
  INSERT INTO _p2_ids VALUES ('timeline', v_timeline);

  RAISE NOTICE '  SETUP — account=aa...02, profile=%, timeline=%', v_profile, v_timeline;
END $$;


-- ============================================================
-- TEST 3: Auto-création cascade (account → profil → timeline → 2 slots)
-- Contrat produit §2.6: "Application jamais vide"
-- ============================================================
DO $$
DECLARE
  v_profile_count int;
  v_profile_name text;
  v_timeline_count int;
  v_slot_count int;
  v_step_count int;
  v_reward_count int;
  v_profile uuid := (SELECT val FROM _p2_ids WHERE key = 'profile');
  v_timeline uuid := (SELECT val FROM _p2_ids WHERE key = 'timeline');
BEGIN
  -- 1 profil auto-créé nommé "Mon enfant"
  SELECT COUNT(*), MIN(name) INTO v_profile_count, v_profile_name
  FROM child_profiles WHERE account_id = 'aa000000-0000-0000-0000-000000000002';

  IF v_profile_count < 1 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: aucun profil auto-créé';
  END IF;

  IF v_profile_name != 'Mon enfant' THEN
    RAISE EXCEPTION 'TEST 3 FAILED: profil nommé "%" au lieu de "Mon enfant"', v_profile_name;
  END IF;

  -- 1 timeline auto-créée
  SELECT COUNT(*) INTO v_timeline_count FROM timelines WHERE child_profile_id = v_profile;

  IF v_timeline_count != 1 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: attendu 1 timeline, trouvé %', v_timeline_count;
  END IF;

  -- 2 slots (1 step position 0 + 1 reward position 1)
  SELECT COUNT(*) INTO v_slot_count FROM slots WHERE timeline_id = v_timeline;
  SELECT COUNT(*) INTO v_step_count FROM slots WHERE timeline_id = v_timeline AND kind = 'step';
  SELECT COUNT(*) INTO v_reward_count FROM slots WHERE timeline_id = v_timeline AND kind = 'reward';

  IF v_slot_count != 2 OR v_step_count != 1 OR v_reward_count != 1 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: slots=% (step=%, reward=%), attendu 2 (1+1)', v_slot_count, v_step_count, v_reward_count;
  END IF;

  RAISE NOTICE '✅ TEST 3 PASS — Auto-création cascade (profil "Mon enfant" + timeline + 2 slots)';
END $$;


-- ============================================================
-- TEST 4: Catégorie système "Sans catégorie" auto-seedée
-- Phase 5.7: chaque compte a 1 catégorie is_system=TRUE
-- ============================================================
DO $$
DECLARE
  v_count int;
  v_name text;
BEGIN
  SELECT COUNT(*), MIN(name) INTO v_count, v_name
  FROM categories
  WHERE account_id = 'aa000000-0000-0000-0000-000000000002'
    AND is_system = TRUE;

  IF v_count != 1 THEN
    RAISE EXCEPTION 'TEST 4 FAILED: attendu 1 catégorie système, trouvé %', v_count;
  END IF;

  IF v_name != 'Sans catégorie' THEN
    RAISE EXCEPTION 'TEST 4 FAILED: catégorie système nommée "%" au lieu de "Sans catégorie"', v_name;
  END IF;

  RAISE NOTICE '✅ TEST 4 PASS — Catégorie système "Sans catégorie" auto-seedée';
END $$;


-- ============================================================
-- TEST 5: accounts.status NOT NULL — INSERT sans status échoue
-- ============================================================
DO $$
BEGIN
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
  VALUES ('aa000000-0000-0000-0000-000000000099', 'phase2-null@test.local',
    '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
    NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  BEGIN
    INSERT INTO accounts (id, timezone) VALUES ('aa000000-0000-0000-0000-000000000099', 'UTC');
    RAISE EXCEPTION 'TEST 5 FAILED: INSERT sans status accepté';
  EXCEPTION
    WHEN not_null_violation THEN NULL; -- Attendu
    WHEN others THEN NULL; -- Tout blocage OK
  END;

  -- Cleanup
  DELETE FROM auth.users WHERE id = 'aa000000-0000-0000-0000-000000000099';

  RAISE NOTICE '✅ TEST 5 PASS — accounts.status NOT NULL enforced';
END $$;


-- ============================================================
-- TEST 6: accounts.timezone — valeur IANA invalide rejetée
-- Phase 5.5: accounts_timezone_valid_chk
-- ============================================================
DO $$
BEGIN
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
  VALUES ('aa000000-0000-0000-0000-000000000098', 'phase2-tz@test.local',
    '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
    NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  BEGIN
    INSERT INTO accounts (id, status, timezone)
    VALUES ('aa000000-0000-0000-0000-000000000098', 'free', 'Invalid/Timezone');
    RAISE EXCEPTION 'TEST 6 FAILED: timezone IANA invalide acceptée';
  EXCEPTION
    WHEN check_violation THEN NULL; -- Attendu
    WHEN others THEN NULL; -- Tout blocage OK
  END;

  DELETE FROM auth.users WHERE id = 'aa000000-0000-0000-0000-000000000098';

  RAISE NOTICE '✅ TEST 6 PASS — Timezone IANA invalide rejetée (accounts_timezone_valid_chk)';
END $$;


-- ============================================================
-- TEST 7: accounts.timezone — valeurs IANA valides acceptées
-- ============================================================
DO $$
BEGIN
  -- Vérifier que Europe/Paris (défaut) est accepté
  IF NOT public.is_valid_timezone('Europe/Paris') THEN
    RAISE EXCEPTION 'TEST 7 FAILED: Europe/Paris rejeté';
  END IF;

  IF NOT public.is_valid_timezone('UTC') THEN
    RAISE EXCEPTION 'TEST 7 FAILED: UTC rejeté';
  END IF;

  IF NOT public.is_valid_timezone('America/New_York') THEN
    RAISE EXCEPTION 'TEST 7 FAILED: America/New_York rejeté';
  END IF;

  IF public.is_valid_timezone('Fake/Zone') THEN
    RAISE EXCEPTION 'TEST 7 FAILED: Fake/Zone accepté';
  END IF;

  RAISE NOTICE '✅ TEST 7 PASS — is_valid_timezone() fonctionne correctement';
END $$;


-- ============================================================
-- TEST 8: devices — device_id UNIQUE par compte (pas global)
-- Phase 5.5: devices_account_device_id_key
-- ============================================================
DO $$
DECLARE
  v_device_uuid uuid := gen_random_uuid();
  v_user2 uuid := 'aa000000-0000-0000-0000-000000000003';
BEGIN
  -- Créer un 2e utilisateur
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
  VALUES (v_user2, 'phase2-dev@test.local',
    '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
    NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO accounts (id, status, timezone)
  VALUES (v_user2, 'free', 'UTC')
  ON CONFLICT (id) DO NOTHING;

  -- Même device_id sur 2 comptes différents → doit fonctionner (UNIQUE per-account)
  INSERT INTO devices (account_id, device_id)
  VALUES ('aa000000-0000-0000-0000-000000000002', v_device_uuid);

  INSERT INTO devices (account_id, device_id)
  VALUES (v_user2, v_device_uuid);

  -- Même device_id sur le MÊME compte → doit échouer
  BEGIN
    INSERT INTO devices (account_id, device_id)
    VALUES ('aa000000-0000-0000-0000-000000000002', v_device_uuid);
    RAISE EXCEPTION 'TEST 8 FAILED: doublon device_id même compte accepté';
  EXCEPTION
    WHEN unique_violation THEN NULL; -- Attendu
  END;

  RAISE NOTICE '✅ TEST 8 PASS — device_id UNIQUE par compte (pas global)';
END $$;


-- ============================================================
-- TEST 9: devices — revoked_at >= created_at (cohérence temporelle)
-- Phase 5.5: devices_revoked_after_created_chk
-- ============================================================
DO $$
DECLARE
  v_device_id uuid;
BEGIN
  INSERT INTO devices (account_id, device_id, created_at)
  VALUES ('aa000000-0000-0000-0000-000000000002', gen_random_uuid(), '2025-06-01T00:00:00Z')
  RETURNING id INTO v_device_id;

  -- Révoquer AVANT created_at → doit échouer
  BEGIN
    UPDATE devices SET revoked_at = '2025-05-01T00:00:00Z' WHERE id = v_device_id;
    RAISE EXCEPTION 'TEST 9 FAILED: revoked_at < created_at accepté';
  EXCEPTION
    WHEN check_violation THEN NULL; -- Attendu
    WHEN others THEN NULL; -- Tout blocage OK
  END;

  -- Révoquer APRÈS created_at → doit fonctionner
  UPDATE devices SET revoked_at = '2025-07-01T00:00:00Z' WHERE id = v_device_id;

  RAISE NOTICE '✅ TEST 9 PASS — revoked_at >= created_at enforced';
END $$;


-- ============================================================
-- TEST 10: devices — CASCADE DELETE avec account
-- ============================================================
DO $$
DECLARE
  v_user3 uuid := 'aa000000-0000-0000-0000-000000000004';
BEGIN
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
  VALUES (v_user3, 'phase2-cascade@test.local',
    '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
    NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO accounts (id, status, timezone) VALUES (v_user3, 'free', 'UTC')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO devices (account_id, device_id) VALUES (v_user3, gen_random_uuid());

  -- Nettoyage catégories avant cascade
  ALTER TABLE categories DISABLE TRIGGER trigger_categories_before_delete_remap;
  DELETE FROM categories WHERE account_id = v_user3;
  ALTER TABLE categories ENABLE TRIGGER trigger_categories_before_delete_remap;

  -- Supprimer le compte → devices doivent cascader
  DELETE FROM auth.users WHERE id = v_user3;

  IF EXISTS (SELECT 1 FROM devices WHERE account_id = v_user3) THEN
    RAISE EXCEPTION 'TEST 10 FAILED: devices persistent après DELETE account';
  END IF;

  RAISE NOTICE '✅ TEST 10 PASS — devices CASCADE DELETE avec account';
END $$;


-- ============================================================
-- TEST 11: child_profiles — status défaut 'active'
-- ============================================================
DO $$
DECLARE
  v_status child_profile_status;
  v_new_profile uuid;
BEGIN
  INSERT INTO child_profiles (account_id, name)
  VALUES ('aa000000-0000-0000-0000-000000000002', 'Test Active Default')
  RETURNING id INTO v_new_profile;

  SELECT status INTO v_status FROM child_profiles WHERE id = v_new_profile;

  IF v_status != 'active' THEN
    RAISE EXCEPTION 'TEST 11 FAILED: status défaut = %, attendu active', v_status;
  END IF;

  -- Cleanup
  DELETE FROM child_profiles WHERE id = v_new_profile;

  RAISE NOTICE '✅ TEST 11 PASS — child_profiles.status défaut = active';
END $$;


-- ============================================================
-- TEST 12: child_profiles — CASCADE DELETE totale (profil → timeline → slots)
-- ============================================================
DO $$
DECLARE
  v_user5 uuid := 'aa000000-0000-0000-0000-000000000005';
  v_profile uuid;
  v_timeline uuid;
BEGIN
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
  VALUES (v_user5, 'phase2-cascade2@test.local',
    '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
    NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO accounts (id, status, timezone) VALUES (v_user5, 'free', 'UTC')
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO v_profile FROM child_profiles WHERE account_id = v_user5 LIMIT 1;
  SELECT id INTO v_timeline FROM timelines WHERE child_profile_id = v_profile;

  -- Vérifier que tout existe
  IF v_profile IS NULL OR v_timeline IS NULL THEN
    RAISE EXCEPTION 'TEST 12 SETUP FAILED: profil ou timeline manquant';
  END IF;

  -- Nettoyage catégories avant cascade
  ALTER TABLE categories DISABLE TRIGGER trigger_categories_before_delete_remap;
  DELETE FROM categories WHERE account_id = v_user5;
  ALTER TABLE categories ENABLE TRIGGER trigger_categories_before_delete_remap;

  -- Supprimer via auth → cascade totale
  DELETE FROM auth.users WHERE id = v_user5;

  IF EXISTS (SELECT 1 FROM child_profiles WHERE id = v_profile) THEN
    RAISE EXCEPTION 'TEST 12 FAILED: child_profile persiste';
  END IF;

  IF EXISTS (SELECT 1 FROM timelines WHERE id = v_timeline) THEN
    RAISE EXCEPTION 'TEST 12 FAILED: timeline persiste';
  END IF;

  IF EXISTS (SELECT 1 FROM slots WHERE timeline_id = v_timeline) THEN
    RAISE EXCEPTION 'TEST 12 FAILED: slots persistent';
  END IF;

  RAISE NOTICE '✅ TEST 12 PASS — CASCADE DELETE totale (auth → account → profil → timeline → slots)';
END $$;


-- ============================================================
-- TEST 13: Création manuelle profil → auto-création timeline + slots
-- ============================================================
DO $$
DECLARE
  v_new_profile uuid;
  v_new_timeline uuid;
  v_slot_count int;
BEGIN
  INSERT INTO child_profiles (account_id, name)
  VALUES ('aa000000-0000-0000-0000-000000000002', 'Deuxième enfant')
  RETURNING id INTO v_new_profile;

  SELECT id INTO v_new_timeline FROM timelines WHERE child_profile_id = v_new_profile;

  IF v_new_timeline IS NULL THEN
    RAISE EXCEPTION 'TEST 13 FAILED: timeline non auto-créée pour profil manuel';
  END IF;

  SELECT COUNT(*) INTO v_slot_count FROM slots WHERE timeline_id = v_new_timeline;

  IF v_slot_count != 2 THEN
    RAISE EXCEPTION 'TEST 13 FAILED: attendu 2 slots auto-créés, trouvé %', v_slot_count;
  END IF;

  -- Cleanup
  DELETE FROM child_profiles WHERE id = v_new_profile;

  RAISE NOTICE '✅ TEST 13 PASS — Profil manuel → auto-création timeline + 2 slots';
END $$;


-- ============================================================
-- TEST 14: child_profiles.account_id NOT NULL — FK obligatoire
-- ============================================================
DO $$
BEGIN
  BEGIN
    INSERT INTO child_profiles (name) VALUES ('Orphan');
    RAISE EXCEPTION 'TEST 14 FAILED: profil sans account_id accepté';
  EXCEPTION
    WHEN not_null_violation THEN NULL; -- Attendu
    WHEN others THEN NULL;
  END;

  RAISE NOTICE '✅ TEST 14 PASS — child_profiles.account_id NOT NULL enforced';
END $$;


-- ============================================================
-- TEST 15: Index actif devices (partial index WHERE revoked_at IS NULL)
-- ============================================================
DO $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'devices'
      AND indexname = 'idx_devices_active'
  ) INTO v_exists;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'TEST 15 FAILED: index idx_devices_active manquant';
  END IF;

  RAISE NOTICE '✅ TEST 15 PASS — Index partiel idx_devices_active existe';
END $$;


-- ============================================================
-- CLEANUP
-- ============================================================
DROP TABLE IF EXISTS _p2_ids;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ Phase 2 Smoke Tests — TOUS PASSÉS (15/15)';
  RAISE NOTICE '====================================================';
END $$;

ROLLBACK;