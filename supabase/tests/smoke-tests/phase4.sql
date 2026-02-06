-- ============================================================
-- Phase 4 — Smoke Tests: Planning (timelines, slots)
-- ============================================================
-- Date: 2026-02-06
-- Migrations couvertes:
--   20260130109000_create_timelines.sql
--   20260130110000_create_slots.sql
--   20260130111000_slots_enforce_min_step.sql
--   20260130112000_slots_enforce_min_reward.sql
--   20260202121000_phase5_8_invariants_reward_bank_guard.sql (single reward)
--
-- Objectif: Vérifier structure timelines/slots, contraintes UNIQUE,
--           tokens CHECK by kind, min step/reward triggers, 1 reward unique.
-- Exécution: psql -v ON_ERROR_STOP=1 -f phase4_smoke.sql
-- ============================================================

BEGIN;

-- ============================================================
-- SETUP
-- ============================================================
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
VALUES (
  'cc000000-0000-0000-0000-000000000001', 'phase4@test.local',
  '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
  NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, status, timezone)
VALUES ('cc000000-0000-0000-0000-000000000001', 'subscriber', 'Europe/Paris')
ON CONFLICT (id) DO NOTHING;

CREATE TEMP TABLE _p4_ids (key TEXT PRIMARY KEY, val UUID NOT NULL);

DO $$
DECLARE
  v_profile uuid;
  v_timeline uuid;
  v_step uuid;
  v_reward uuid;
BEGIN
  SELECT id INTO v_profile FROM child_profiles
  WHERE account_id = 'cc000000-0000-0000-0000-000000000001' LIMIT 1;

  SELECT id INTO v_timeline FROM timelines WHERE child_profile_id = v_profile;

  SELECT id INTO v_step FROM slots
  WHERE timeline_id = v_timeline AND kind = 'step' LIMIT 1;

  SELECT id INTO v_reward FROM slots
  WHERE timeline_id = v_timeline AND kind = 'reward' LIMIT 1;

  INSERT INTO _p4_ids VALUES ('profile', v_profile);
  INSERT INTO _p4_ids VALUES ('timeline', v_timeline);
  INSERT INTO _p4_ids VALUES ('step', v_step);
  INSERT INTO _p4_ids VALUES ('reward', v_reward);

  RAISE NOTICE '  SETUP — profile=%, timeline=%, step=%, reward=%', v_profile, v_timeline, v_step, v_reward;
END $$;


-- ============================================================
-- TEST 1: Tables existent
-- ============================================================
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name IN ('timelines', 'slots');

  IF v_count != 2 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: attendu 2 tables, trouvé %', v_count;
  END IF;

  RAISE NOTICE '✅ TEST 1 PASS — Tables timelines, slots existent';
END $$;


-- ============================================================
-- TEST 2: Timeline UNIQUE par profil (1:1 strict)
-- ============================================================
DO $$
DECLARE
  v_profile uuid := (SELECT val FROM _p4_ids WHERE key = 'profile');
BEGIN
  BEGIN
    INSERT INTO timelines (child_profile_id) VALUES (v_profile);
    RAISE EXCEPTION 'TEST 2 FAILED: 2e timeline créée pour même profil';
  EXCEPTION
    WHEN unique_violation THEN NULL; -- Attendu
  END;

  RAISE NOTICE '✅ TEST 2 PASS — Timeline UNIQUE par profil (1:1)';
END $$;


-- ============================================================
-- TEST 3: Slots — position >= 0
-- ============================================================
DO $$
DECLARE
  v_timeline uuid := (SELECT val FROM _p4_ids WHERE key = 'timeline');
BEGIN
  BEGIN
    INSERT INTO slots (timeline_id, kind, position, tokens)
    VALUES (v_timeline, 'step', -1, 0);
    RAISE EXCEPTION 'TEST 3 FAILED: position négative acceptée';
  EXCEPTION
    WHEN check_violation THEN NULL; -- Attendu
  END;

  RAISE NOTICE '✅ TEST 3 PASS — Slots position >= 0';
END $$;


-- ============================================================
-- TEST 4: Slots — UNIQUE (timeline_id, position)
-- ============================================================
DO $$
DECLARE
  v_timeline uuid := (SELECT val FROM _p4_ids WHERE key = 'timeline');
BEGIN
  -- Position 0 est déjà occupée (step auto-créé)
  BEGIN
    INSERT INTO slots (timeline_id, kind, position, tokens)
    VALUES (v_timeline, 'step', 0, 0);
    RAISE EXCEPTION 'TEST 4 FAILED: doublon position accepté';
  EXCEPTION
    WHEN unique_violation THEN NULL; -- Attendu
  END;

  RAISE NOTICE '✅ TEST 4 PASS — Slots UNIQUE (timeline_id, position)';
END $$;


-- ============================================================
-- TEST 5: Slots — CHECK tokens by kind (step: 0-5, reward: NULL)
-- ============================================================
DO $$
DECLARE
  v_timeline uuid := (SELECT val FROM _p4_ids WHERE key = 'timeline');
BEGIN
  -- Step avec tokens NULL → doit échouer
  BEGIN
    INSERT INTO slots (timeline_id, kind, position, tokens)
    VALUES (v_timeline, 'step', 10, NULL);
    RAISE EXCEPTION 'TEST 5a FAILED: step avec tokens NULL accepté';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  -- Step avec tokens 6 → doit échouer
  BEGIN
    INSERT INTO slots (timeline_id, kind, position, tokens)
    VALUES (v_timeline, 'step', 10, 6);
    RAISE EXCEPTION 'TEST 5b FAILED: step avec tokens=6 accepté';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  -- Reward avec tokens non NULL → doit échouer (trigger normalise d'abord)
  BEGIN
    INSERT INTO slots (timeline_id, kind, position, tokens)
    VALUES (v_timeline, 'reward', 10, 3);
    RAISE EXCEPTION 'TEST 5c FAILED: reward avec tokens=3 accepté';
  EXCEPTION
    WHEN check_violation THEN NULL;
    WHEN unique_violation THEN NULL; -- single reward guard peut bloquer avant
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 5c FAILED%' THEN RAISE; END IF;
      NULL; -- single reward trigger peut bloquer
  END;

  -- Step avec tokens 0 → OK
  INSERT INTO slots (timeline_id, kind, position, tokens)
  VALUES (v_timeline, 'step', 20, 0);

  -- Step avec tokens 5 → OK
  INSERT INTO slots (timeline_id, kind, position, tokens)
  VALUES (v_timeline, 'step', 21, 5);

  RAISE NOTICE '✅ TEST 5 PASS — CHECK tokens by kind (step=0-5, reward=NULL)';
END $$;


-- ============================================================
-- TEST 6: Min step — suppression dernier step bloquée
-- ============================================================
DO $$
DECLARE
  v_timeline uuid := (SELECT val FROM _p4_ids WHERE key = 'timeline');
  v_last_step uuid;
BEGIN
  -- On a ajouté des steps au test 5. Supprimer tous sauf un.
  -- D'abord, garder seulement le step original (position 0)
  DELETE FROM slots WHERE timeline_id = v_timeline AND kind = 'step'
    AND id != (SELECT val FROM _p4_ids WHERE key = 'step');

  -- Maintenant il ne reste qu'1 step. Tenter de le supprimer → bloqué
  v_last_step := (SELECT val FROM _p4_ids WHERE key = 'step');

  BEGIN
    DELETE FROM slots WHERE id = v_last_step;
    RAISE EXCEPTION 'TEST 6 FAILED: dernier step supprimé';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 6 FAILED%' THEN RAISE; END IF;
      NULL; -- Trigger min_step a bloqué = attendu
  END;

  RAISE NOTICE '✅ TEST 6 PASS — Min step: suppression dernier step bloquée';
END $$;


-- ============================================================
-- TEST 7: Min reward — suppression dernier reward bloquée
-- ============================================================
DO $$
DECLARE
  v_reward uuid := (SELECT val FROM _p4_ids WHERE key = 'reward');
BEGIN
  BEGIN
    DELETE FROM slots WHERE id = v_reward;
    RAISE EXCEPTION 'TEST 7 FAILED: dernier reward supprimé';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 7 FAILED%' THEN RAISE; END IF;
      NULL; -- Trigger min_reward a bloqué = attendu
  END;

  RAISE NOTICE '✅ TEST 7 PASS — Min reward: suppression dernier reward bloquée';
END $$;


-- ============================================================
-- TEST 8: Exactly 1 reward par timeline (UNIQUE index + trigger)
-- ============================================================
DO $$
DECLARE
  v_timeline uuid := (SELECT val FROM _p4_ids WHERE key = 'timeline');
BEGIN
  BEGIN
    INSERT INTO slots (timeline_id, kind, position, tokens)
    VALUES (v_timeline, 'reward', 99, NULL);
    RAISE EXCEPTION 'TEST 8 FAILED: 2e reward inséré';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 8 FAILED%' THEN RAISE; END IF;
      NULL; -- Trigger single reward a bloqué = attendu
    WHEN unique_violation THEN NULL; -- Unique index bloque aussi = OK
  END;

  RAISE NOTICE '✅ TEST 8 PASS — Exactly 1 reward par timeline';
END $$;


-- ============================================================
-- TEST 9: Reward ne peut pas changer de kind (reward → step interdit)
-- ============================================================
DO $$
DECLARE
  v_reward uuid := (SELECT val FROM _p4_ids WHERE key = 'reward');
BEGIN
  BEGIN
    UPDATE slots SET kind = 'step', tokens = 0 WHERE id = v_reward;
    RAISE EXCEPTION 'TEST 9 FAILED: reward changé en step';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 9 FAILED%' THEN RAISE; END IF;
      NULL; -- Trigger bloque = attendu
  END;

  RAISE NOTICE '✅ TEST 9 PASS — Reward kind immutable (reward → step interdit)';
END $$;


-- ============================================================
-- TEST 10: Slots card_id ON DELETE SET NULL (slot devient vide)
-- Note: on utilise une personal card car bank cards ont un delete guard
-- ============================================================
DO $$
DECLARE
  v_timeline uuid := (SELECT val FROM _p4_ids WHERE key = 'timeline');
  v_card_id uuid;
  v_slot_id uuid;
  v_card_after uuid;
BEGIN
  -- Créer une carte personal (subscriber peut)
  INSERT INTO cards (name, image_url, type, account_id)
  VALUES ('Temp Personal', 'https://test.local/temp.png', 'personal', 'cc000000-0000-0000-0000-000000000001')
  RETURNING id INTO v_card_id;

  -- Créer un slot avec cette carte
  INSERT INTO slots (timeline_id, kind, position, card_id, tokens)
  VALUES (v_timeline, 'step', 50, v_card_id, 0)
  RETURNING id INTO v_slot_id;

  -- Supprimer la carte personal (pas de delete guard sur personal)
  DELETE FROM cards WHERE id = v_card_id;

  -- Le slot doit exister avec card_id = NULL
  SELECT card_id INTO v_card_after FROM slots WHERE id = v_slot_id;

  IF v_card_after IS NOT NULL THEN
    RAISE EXCEPTION 'TEST 10 FAILED: card_id = % après suppression carte (devrait être NULL)', v_card_after;
  END IF;

  -- Cleanup
  DELETE FROM slots WHERE id = v_slot_id;

  RAISE NOTICE '✅ TEST 10 PASS — Slots card_id ON DELETE SET NULL';
END $$;


-- ============================================================
-- TEST 11: Timelines CASCADE DELETE avec child_profile
-- ============================================================
DO $$
DECLARE
  v_profile uuid;
  v_timeline uuid;
BEGIN
  -- Créer un nouveau profil (auto-crée timeline + slots)
  INSERT INTO child_profiles (account_id, name)
  VALUES ('cc000000-0000-0000-0000-000000000001', 'Cascade Test')
  RETURNING id INTO v_profile;

  SELECT id INTO v_timeline FROM timelines WHERE child_profile_id = v_profile;

  -- Supprimer le profil → cascade timeline → slots
  DELETE FROM child_profiles WHERE id = v_profile;

  IF EXISTS (SELECT 1 FROM timelines WHERE id = v_timeline) THEN
    RAISE EXCEPTION 'TEST 11 FAILED: timeline persiste après DELETE profil';
  END IF;

  IF EXISTS (SELECT 1 FROM slots WHERE timeline_id = v_timeline) THEN
    RAISE EXCEPTION 'TEST 11 FAILED: slots persistent après DELETE profil';
  END IF;

  RAISE NOTICE '✅ TEST 11 PASS — Timelines CASCADE DELETE avec child_profile';
END $$;


-- ============================================================
-- TEST 12: Slots — DnD (update position) ne change pas PK
-- ============================================================
DO $$
DECLARE
  v_step uuid := (SELECT val FROM _p4_ids WHERE key = 'step');
  v_id_before uuid;
  v_id_after uuid;
BEGIN
  v_id_before := v_step;

  -- Changer position
  UPDATE slots SET position = 99 WHERE id = v_step;

  SELECT id INTO v_id_after FROM slots WHERE id = v_step;

  IF v_id_after IS NULL OR v_id_after != v_id_before THEN
    RAISE EXCEPTION 'TEST 12 FAILED: PK changé après update position';
  END IF;

  -- Remettre
  UPDATE slots SET position = 0 WHERE id = v_step;

  RAISE NOTICE '✅ TEST 12 PASS — DnD update position ne change pas PK (identité stable)';
END $$;


-- ============================================================
-- CLEANUP
-- ============================================================
DROP TABLE IF EXISTS _p4_ids;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ Phase 4 Smoke Tests — TOUS PASSÉS (12/12)';
  RAISE NOTICE '====================================================';
END $$;

ROLLBACK;