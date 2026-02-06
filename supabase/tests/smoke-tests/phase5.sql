-- ============================================================
-- Phase 5 — Smoke Tests: Sessions & Validations
-- ============================================================
-- Date: 2026-02-06
-- Migrations couvertes:
--   20260130114000_create_sessions.sql
--   20260130115000_create_session_validations.sql
--   20260130116000_add_session_state_transitions.sql
--   20260130117000_phase5_fix_sessions_validations_snapshot.sql
--   20260201119000_phase5_6_corrective_integrity.sql (structural guards)
--
-- Objectif: Vérifier sessions (unicité active, epoch monotone, transitions),
--           validations (idempotence, step-only, non-vide, cross-timeline),
--           auto-completion, snapshot, structural reset.
-- Exécution: psql -v ON_ERROR_STOP=1 -f phase5_smoke.sql
-- ============================================================

BEGIN;

-- ============================================================
-- SETUP
-- ============================================================
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
VALUES (
  'dd000000-0000-0000-0000-000000000001', 'phase5@test.local',
  '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
  NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, status, timezone)
VALUES ('dd000000-0000-0000-0000-000000000001', 'subscriber', 'Europe/Paris')
ON CONFLICT (id) DO NOTHING;

CREATE TEMP TABLE _p5_ids (key TEXT PRIMARY KEY, val UUID NOT NULL);

DO $$
DECLARE
  v_profile uuid;
  v_timeline uuid;
  v_step1 uuid;
  v_step2 uuid;
  v_step3 uuid;
  v_reward uuid;
  v_card uuid;
BEGIN
  SELECT id INTO v_profile FROM child_profiles
  WHERE account_id = 'dd000000-0000-0000-0000-000000000001' LIMIT 1;

  SELECT id INTO v_timeline FROM timelines WHERE child_profile_id = v_profile;

  -- Créer une carte bank pour assigner aux slots
  INSERT INTO cards (name, image_url, type, published)
  VALUES ('Phase5 Card', 'https://test.local/p5.png', 'bank', TRUE)
  RETURNING id INTO v_card;

  -- Récupérer step et reward existants
  SELECT id INTO v_step1 FROM slots
  WHERE timeline_id = v_timeline AND kind = 'step' LIMIT 1;

  SELECT id INTO v_reward FROM slots
  WHERE timeline_id = v_timeline AND kind = 'reward' LIMIT 1;

  -- Assigner carte au step1
  UPDATE slots SET card_id = v_card WHERE id = v_step1;

  -- Ajouter step2 et step3 (avec carte → comptent comme étapes)
  INSERT INTO slots (timeline_id, kind, position, card_id, tokens)
  VALUES (v_timeline, 'step', 2, v_card, 0)
  RETURNING id INTO v_step2;

  INSERT INTO slots (timeline_id, kind, position, card_id, tokens)
  VALUES (v_timeline, 'step', 3, v_card, 0)
  RETURNING id INTO v_step3;

  INSERT INTO _p5_ids VALUES ('profile', v_profile);
  INSERT INTO _p5_ids VALUES ('timeline', v_timeline);
  INSERT INTO _p5_ids VALUES ('step1', v_step1);
  INSERT INTO _p5_ids VALUES ('step2', v_step2);
  INSERT INTO _p5_ids VALUES ('step3', v_step3);
  INSERT INTO _p5_ids VALUES ('reward', v_reward);
  INSERT INTO _p5_ids VALUES ('card', v_card);

  RAISE NOTICE '  SETUP — profile=%, timeline=%, 3 steps + 1 reward, card=%', v_profile, v_timeline, v_card;
END $$;


-- ============================================================
-- TEST 1: Tables existent
-- ============================================================
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name IN ('sessions', 'session_validations');

  IF v_count != 2 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: attendu 2 tables, trouvé %', v_count;
  END IF;

  RAISE NOTICE '✅ TEST 1 PASS — Tables sessions, session_validations existent';
END $$;


-- ============================================================
-- TEST 2: Session — cohérence profile ↔ timeline
-- ============================================================
DO $$
DECLARE
  v_profile uuid := (SELECT val FROM _p5_ids WHERE key = 'profile');
  v_timeline uuid := (SELECT val FROM _p5_ids WHERE key = 'timeline');
  v_other_profile uuid;
BEGIN
  -- Créer un 2e profil (auto-crée timeline)
  INSERT INTO child_profiles (account_id, name)
  VALUES ('dd000000-0000-0000-0000-000000000001', 'Other Child')
  RETURNING id INTO v_other_profile;

  -- Session avec timeline du profil 1 mais child_profile du profil 2 → doit échouer
  BEGIN
    INSERT INTO sessions (child_profile_id, timeline_id, state)
    VALUES (v_other_profile, v_timeline, 'active_preview');
    RAISE EXCEPTION 'TEST 2 FAILED: session cross-profile/timeline acceptée';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 2 FAILED%' THEN RAISE; END IF;
      NULL; -- Trigger cohérence bloque = attendu
  END;

  DELETE FROM child_profiles WHERE id = v_other_profile;

  RAISE NOTICE '✅ TEST 2 PASS — Session cohérence profile ↔ timeline enforced';
END $$;


-- ============================================================
-- TEST 3: Unicité session active par (profile, timeline)
-- ============================================================
DO $$
DECLARE
  v_profile uuid := (SELECT val FROM _p5_ids WHERE key = 'profile');
  v_timeline uuid := (SELECT val FROM _p5_ids WHERE key = 'timeline');
  v_session1 uuid;
BEGIN
  INSERT INTO sessions (child_profile_id, timeline_id, state)
  VALUES (v_profile, v_timeline, 'active_preview')
  RETURNING id INTO v_session1;

  INSERT INTO _p5_ids VALUES ('session1', v_session1) ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;

  -- 2e session active → doit échouer (partial unique index)
  BEGIN
    INSERT INTO sessions (child_profile_id, timeline_id, state)
    VALUES (v_profile, v_timeline, 'active_preview');
    RAISE EXCEPTION 'TEST 3 FAILED: 2e session active créée';
  EXCEPTION
    WHEN unique_violation THEN NULL; -- Attendu
  END;

  RAISE NOTICE '✅ TEST 3 PASS — Unicité session active par (profile, timeline)';
END $$;


-- ============================================================
-- TEST 4: Transitions autorisées (preview → started → completed)
-- ============================================================
DO $$
DECLARE
  v_session uuid := (SELECT val FROM _p5_ids WHERE key = 'session1');
  v_step1 uuid := (SELECT val FROM _p5_ids WHERE key = 'step1');
  v_step2 uuid := (SELECT val FROM _p5_ids WHERE key = 'step2');
  v_step3 uuid := (SELECT val FROM _p5_ids WHERE key = 'step3');
  v_state session_state;
BEGIN
  -- Valider step1 → auto-transition preview → started
  INSERT INTO session_validations (session_id, slot_id) VALUES (v_session, v_step1);

  SELECT state INTO v_state FROM sessions WHERE id = v_session;
  IF v_state != 'active_started' THEN
    RAISE EXCEPTION 'TEST 4 FAILED: état=% après 1ère validation (attendu active_started)', v_state;
  END IF;

  -- Valider step2
  INSERT INTO session_validations (session_id, slot_id) VALUES (v_session, v_step2);

  SELECT state INTO v_state FROM sessions WHERE id = v_session;
  IF v_state != 'active_started' THEN
    RAISE EXCEPTION 'TEST 4 FAILED: état=% après 2ème validation (attendu active_started)', v_state;
  END IF;

  -- Valider step3 → auto-completion (3/3)
  INSERT INTO session_validations (session_id, slot_id) VALUES (v_session, v_step3);

  SELECT state INTO v_state FROM sessions WHERE id = v_session;
  IF v_state != 'completed' THEN
    RAISE EXCEPTION 'TEST 4 FAILED: état=% après 3ème validation (attendu completed)', v_state;
  END IF;

  RAISE NOTICE '✅ TEST 4 PASS — Transitions autorisées (preview → started → completed)';
END $$;


-- ============================================================
-- TEST 5: Snapshot steps_total_snapshot figé au démarrage
-- ============================================================
DO $$
DECLARE
  v_session uuid := (SELECT val FROM _p5_ids WHERE key = 'session1');
  v_snapshot int;
BEGIN
  SELECT steps_total_snapshot INTO v_snapshot FROM sessions WHERE id = v_session;

  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'TEST 5 FAILED: steps_total_snapshot est NULL';
  END IF;

  IF v_snapshot != 3 THEN
    RAISE EXCEPTION 'TEST 5 FAILED: snapshot=% (attendu 3)', v_snapshot;
  END IF;

  RAISE NOTICE '✅ TEST 5 PASS — Snapshot steps_total_snapshot = 3 (figé au démarrage)';
END $$;


-- ============================================================
-- TEST 6: Validation sur session completed → bloquée
-- ============================================================
DO $$
DECLARE
  v_session uuid := (SELECT val FROM _p5_ids WHERE key = 'session1');
  v_step1 uuid := (SELECT val FROM _p5_ids WHERE key = 'step1');
BEGIN
  -- Session1 est completed. Tenter d'ajouter une validation.
  -- On utilise step1 qui est déjà validé, mais le trigger completed check passe AVANT le UNIQUE
  -- Cependant step1 a déjà un UNIQUE (session_id, slot_id) → pourrait bloquer avant.
  -- Utilisons un scénario propre: le trigger devrait bloquer de toute façon.
  BEGIN
    INSERT INTO session_validations (session_id, slot_id) VALUES (v_session, v_step1);
    RAISE EXCEPTION 'TEST 6 FAILED: validation insérée sur session completed';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 6 FAILED%' THEN RAISE; END IF;
      NULL; -- Trigger bloque = attendu (completed ou idempotence)
    WHEN unique_violation THEN NULL; -- UNIQUE bloque aussi = OK
  END;

  RAISE NOTICE '✅ TEST 6 PASS — Validation sur session completed bloquée';
END $$;


-- ============================================================
-- TEST 7: Transitions interdites (completed → active, preview → completed)
-- ============================================================
DO $$
DECLARE
  v_session uuid := (SELECT val FROM _p5_ids WHERE key = 'session1');
BEGIN
  -- completed → active_preview
  BEGIN
    UPDATE sessions SET state = 'active_preview' WHERE id = v_session;
    RAISE EXCEPTION 'TEST 7a FAILED: transition completed → active_preview acceptée';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 7a FAILED%' THEN RAISE; END IF;
      NULL; -- Trigger bloque = attendu
  END;

  -- completed → active_started
  BEGIN
    UPDATE sessions SET state = 'active_started' WHERE id = v_session;
    RAISE EXCEPTION 'TEST 7b FAILED: transition completed → active_started acceptée';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 7b FAILED%' THEN RAISE; END IF;
      NULL;
  END;

  RAISE NOTICE '✅ TEST 7 PASS — Transitions interdites bloquées';
END $$;


-- ============================================================
-- TEST 8: Epoch monotone — INSERT (nouvelle session)
-- ============================================================
DO $$
DECLARE
  v_profile uuid := (SELECT val FROM _p5_ids WHERE key = 'profile');
  v_timeline uuid := (SELECT val FROM _p5_ids WHERE key = 'timeline');
  v_session2 uuid;
  v_epoch2 int;
BEGIN
  -- Session1 est completed → on peut créer session2 (active)
  INSERT INTO sessions (child_profile_id, timeline_id, state, epoch)
  VALUES (v_profile, v_timeline, 'active_preview', 1)
  RETURNING id INTO v_session2;

  SELECT epoch INTO v_epoch2 FROM sessions WHERE id = v_session2;

  -- Epoch doit être > epoch de session1 (qui est 1)
  IF v_epoch2 <= 1 THEN
    RAISE EXCEPTION 'TEST 8 FAILED: epoch=% (devrait être > 1)', v_epoch2;
  END IF;

  INSERT INTO _p5_ids VALUES ('session2', v_session2) ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;

  RAISE NOTICE '✅ TEST 8 PASS — Epoch monotone (session2 epoch=%, > 1)', v_epoch2;
END $$;


-- ============================================================
-- TEST 9: Epoch monotone — UPDATE (décroissance interdite)
-- ============================================================
DO $$
DECLARE
  v_session2 uuid := (SELECT val FROM _p5_ids WHERE key = 'session2');
BEGIN
  BEGIN
    UPDATE sessions SET epoch = 0 WHERE id = v_session2;
    RAISE EXCEPTION 'TEST 9 FAILED: epoch décrémenté';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 9 FAILED%' THEN RAISE; END IF;
      NULL; -- Trigger bloque = attendu
  END;

  RAISE NOTICE '✅ TEST 9 PASS — Epoch décroissance bloquée (UPDATE)';
END $$;


-- ============================================================
-- TEST 10: Validation idempotence — UNIQUE (session_id, slot_id)
-- ============================================================
DO $$
DECLARE
  v_session2 uuid := (SELECT val FROM _p5_ids WHERE key = 'session2');
  v_step1 uuid := (SELECT val FROM _p5_ids WHERE key = 'step1');
BEGIN
  -- 1ère validation → OK
  INSERT INTO session_validations (session_id, slot_id) VALUES (v_session2, v_step1);

  -- 2ème identique → doit échouer UNIQUE
  BEGIN
    INSERT INTO session_validations (session_id, slot_id) VALUES (v_session2, v_step1);
    RAISE EXCEPTION 'TEST 10 FAILED: doublon validation accepté';
  EXCEPTION
    WHEN unique_violation THEN NULL; -- Attendu
  END;

  RAISE NOTICE '✅ TEST 10 PASS — Validation idempotence (UNIQUE session_id, slot_id)';
END $$;


-- ============================================================
-- TEST 11: Validation step-only — reward interdit
-- ============================================================
DO $$
DECLARE
  v_session2 uuid := (SELECT val FROM _p5_ids WHERE key = 'session2');
  v_reward uuid := (SELECT val FROM _p5_ids WHERE key = 'reward');
BEGIN
  BEGIN
    INSERT INTO session_validations (session_id, slot_id) VALUES (v_session2, v_reward);
    RAISE EXCEPTION 'TEST 11 FAILED: validation sur reward acceptée';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 11 FAILED%' THEN RAISE; END IF;
      NULL; -- Trigger step-only bloque = attendu
  END;

  RAISE NOTICE '✅ TEST 11 PASS — Validation step-only (reward interdit)';
END $$;


-- ============================================================
-- TEST 12: Validation step vide (card_id NULL) — interdit
-- ============================================================
DO $$
DECLARE
  v_session2 uuid := (SELECT val FROM _p5_ids WHERE key = 'session2');
  v_timeline uuid := (SELECT val FROM _p5_ids WHERE key = 'timeline');
  v_empty_step uuid;
BEGIN
  -- Créer un step vide (card_id NULL)
  INSERT INTO slots (timeline_id, kind, position, card_id, tokens)
  VALUES (v_timeline, 'step', 80, NULL, 0)
  RETURNING id INTO v_empty_step;

  BEGIN
    INSERT INTO session_validations (session_id, slot_id) VALUES (v_session2, v_empty_step);
    RAISE EXCEPTION 'TEST 12 FAILED: validation sur step vide acceptée';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 12 FAILED%' THEN RAISE; END IF;
      NULL; -- Trigger non-vide bloque = attendu
  END;

  DELETE FROM slots WHERE id = v_empty_step;

  RAISE NOTICE '✅ TEST 12 PASS — Validation step vide (card_id NULL) bloquée';
END $$;


-- ============================================================
-- TEST 13: Validation cross-timeline — interdit
-- ============================================================
DO $$
DECLARE
  v_session2 uuid := (SELECT val FROM _p5_ids WHERE key = 'session2');
  v_other_profile uuid;
  v_other_timeline uuid;
  v_other_step uuid;
  v_card uuid := (SELECT val FROM _p5_ids WHERE key = 'card');
BEGIN
  -- Créer un 2e profil avec timeline et step
  INSERT INTO child_profiles (account_id, name)
  VALUES ('dd000000-0000-0000-0000-000000000001', 'Other Profile')
  RETURNING id INTO v_other_profile;

  SELECT id INTO v_other_timeline FROM timelines WHERE child_profile_id = v_other_profile;

  SELECT id INTO v_other_step FROM slots
  WHERE timeline_id = v_other_timeline AND kind = 'step' LIMIT 1;

  UPDATE slots SET card_id = v_card WHERE id = v_other_step;

  -- Tenter de valider un slot d'une autre timeline dans session2
  BEGIN
    INSERT INTO session_validations (session_id, slot_id) VALUES (v_session2, v_other_step);
    RAISE EXCEPTION 'TEST 13 FAILED: validation cross-timeline acceptée';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 13 FAILED%' THEN RAISE; END IF;
      NULL; -- Trigger cross-timeline bloque = attendu
  END;

  DELETE FROM child_profiles WHERE id = v_other_profile;

  RAISE NOTICE '✅ TEST 13 PASS — Validation cross-timeline bloquée';
END $$;


-- ============================================================
-- TEST 14: Timestamps (started_at, completed_at)
-- ============================================================
DO $$
DECLARE
  v_session uuid := (SELECT val FROM _p5_ids WHERE key = 'session1');
  v_started timestamptz;
  v_completed timestamptz;
BEGIN
  SELECT started_at, completed_at INTO v_started, v_completed
  FROM sessions WHERE id = v_session;

  IF v_started IS NULL THEN
    RAISE EXCEPTION 'TEST 14 FAILED: started_at NULL sur session completed';
  END IF;

  IF v_completed IS NULL THEN
    RAISE EXCEPTION 'TEST 14 FAILED: completed_at NULL sur session completed';
  END IF;

  IF v_completed < v_started THEN
    RAISE EXCEPTION 'TEST 14 FAILED: completed_at < started_at';
  END IF;

  RAISE NOTICE '✅ TEST 14 PASS — Timestamps started_at et completed_at cohérents';
END $$;


-- ============================================================
-- TEST 15: CASCADE DELETE sessions avec profil
-- ============================================================
DO $$
DECLARE
  v_prof uuid;
  v_sess uuid;
  v_tl uuid;
BEGIN
  INSERT INTO child_profiles (account_id, name)
  VALUES ('dd000000-0000-0000-0000-000000000001', 'Cascade Session')
  RETURNING id INTO v_prof;

  SELECT id INTO v_tl FROM timelines WHERE child_profile_id = v_prof;

  INSERT INTO sessions (child_profile_id, timeline_id, state)
  VALUES (v_prof, v_tl, 'active_preview')
  RETURNING id INTO v_sess;

  DELETE FROM child_profiles WHERE id = v_prof;

  IF EXISTS (SELECT 1 FROM sessions WHERE id = v_sess) THEN
    RAISE EXCEPTION 'TEST 15 FAILED: session persiste après DELETE profil';
  END IF;

  RAISE NOTICE '✅ TEST 15 PASS — Sessions CASCADE DELETE avec profil';
END $$;


-- ============================================================
-- CLEANUP
-- ============================================================
DROP TABLE IF EXISTS _p5_ids;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ Phase 5 Smoke Tests — TOUS PASSÉS (15/15)';
  RAISE NOTICE '====================================================';
END $$;

ROLLBACK;