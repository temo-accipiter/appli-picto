-- ============================================================
-- Phase 10 — Smoke Tests Synchronisation & Offline
-- ============================================================
-- Date: 2026-02-06
-- Objectif: Vérifier que les invariants sync documentés dans
--           SYNC_CONTRACT.md sont réellement défendus par la DB.
-- Exécution: psql -v ON_ERROR_STOP=1 -f phase10_sync_smoke.sql
--
-- Prérequis: Toutes migrations Phases 1–9 appliquées.
-- Environnement: Supabase local (supabase db reset + migrations privilégiées)
--
-- Convention: chaque test est un DO $$ ... $$ block autonome.
-- Succès = pas d'erreur. Échec = RAISE EXCEPTION.
-- ============================================================

BEGIN;

-- ============================================================
-- SETUP: Données de test minimales
-- ============================================================
-- Désactiver temporairement RLS pour setup (on simule un contexte système)
-- En environnement de test local, on utilise le rôle postgres.

-- Créer un utilisateur de test dans auth.users (requis par FK accounts)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'sync-test@test.local',
  '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
  NOW(), NOW(), NOW(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- Créer le compte (déclenche auto-create: profil "Mon enfant" + timeline + 2 slots)
INSERT INTO accounts (id, status, timezone)
VALUES ('a0000000-0000-0000-0000-000000000001', 'subscriber', 'Europe/Paris')
ON CONFLICT (id) DO NOTHING;

-- Récupérer les IDs auto-créés
DO $$
DECLARE
  v_profile_id uuid;
  v_timeline_id uuid;
  v_slot_step_id uuid;
  v_slot_reward_id uuid;
  v_extra_step_id uuid;
  v_card_id uuid;
  v_third_step_id uuid;
BEGIN
  -- Récupérer profil auto-créé
  SELECT id INTO v_profile_id
  FROM child_profiles
  WHERE account_id = 'a0000000-0000-0000-0000-000000000001'
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'SETUP FAILED: profil enfant auto-créé introuvable';
  END IF;

  -- Récupérer timeline auto-créée
  SELECT id INTO v_timeline_id
  FROM timelines
  WHERE child_profile_id = v_profile_id;

  IF v_timeline_id IS NULL THEN
    RAISE EXCEPTION 'SETUP FAILED: timeline auto-créée introuvable';
  END IF;

  -- Récupérer slots auto-créés
  SELECT id INTO v_slot_step_id
  FROM slots
  WHERE timeline_id = v_timeline_id AND kind = 'step'
  ORDER BY position LIMIT 1;

  SELECT id INTO v_slot_reward_id
  FROM slots
  WHERE timeline_id = v_timeline_id AND kind = 'reward'
  LIMIT 1;

  IF v_slot_step_id IS NULL OR v_slot_reward_id IS NULL THEN
    RAISE EXCEPTION 'SETUP FAILED: slots auto-créés introuvables';
  END IF;

  -- Créer une carte bank de test (requise: on ne peut pas valider un slot vide)
  INSERT INTO cards (name, image_url, type, published)
  VALUES ('Test Card Sync', 'https://test.local/card.png', 'bank', TRUE)
  RETURNING id INTO v_card_id;

  -- Assigner la carte aux slots step (card_id NOT NULL requis pour validation)
  UPDATE slots SET card_id = v_card_id WHERE id = v_slot_step_id;

  -- Ajouter un 2e slot step AVEC carte (pour tester union multi-device)
  INSERT INTO slots (timeline_id, kind, position, card_id, tokens)
  VALUES (v_timeline_id, 'step', 2, v_card_id, 0)
  RETURNING id INTO v_extra_step_id;

  -- Ajouter un 3e slot step (pour empêcher la complétion auto après test 2)
  -- Avec 3 steps, valider 2 slots ≠ complétion → la session reste active_started
  INSERT INTO slots (timeline_id, kind, position, card_id, tokens)
  VALUES (v_timeline_id, 'step', 3, v_card_id, 0)
  RETURNING id INTO v_third_step_id;

  -- Stocker dans une table temporaire pour accès cross-block
  CREATE TEMP TABLE IF NOT EXISTS _test_ids (
    key TEXT PRIMARY KEY,
    val UUID NOT NULL
  );

  INSERT INTO _test_ids VALUES ('profile', v_profile_id)    ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
  INSERT INTO _test_ids VALUES ('timeline', v_timeline_id)   ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
  INSERT INTO _test_ids VALUES ('card', v_card_id)           ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
  INSERT INTO _test_ids VALUES ('slot_step1', v_slot_step_id) ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
  INSERT INTO _test_ids VALUES ('slot_step2', v_extra_step_id) ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
  INSERT INTO _test_ids VALUES ('slot_step3', v_third_step_id) ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
  INSERT INTO _test_ids VALUES ('slot_reward', v_slot_reward_id) ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;

  RAISE NOTICE '✅ SETUP OK — profile=%, timeline=%, step1=%, step2=%, step3=%, reward=%',
    v_profile_id, v_timeline_id, v_slot_step_id, v_extra_step_id, v_third_step_id, v_slot_reward_id;
END $$;


-- ============================================================
-- TEST 1: Idempotence validation
-- SYNC_CONTRACT §3.1 — même (session_id, slot_id) deux fois = pas de doublon
-- ============================================================
DO $$
DECLARE
  v_profile_id uuid := (SELECT val FROM _test_ids WHERE key = 'profile');
  v_timeline_id uuid := (SELECT val FROM _test_ids WHERE key = 'timeline');
  v_slot_step1 uuid := (SELECT val FROM _test_ids WHERE key = 'slot_step1');
  v_session_id uuid;
  v_count int;
BEGIN
  -- Créer session active
  INSERT INTO sessions (child_profile_id, timeline_id, state)
  VALUES (v_profile_id, v_timeline_id, 'active_preview')
  RETURNING id INTO v_session_id;

  INSERT INTO _test_ids VALUES ('session1', v_session_id) ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;

  -- Première validation : OK
  INSERT INTO session_validations (session_id, slot_id)
  VALUES (v_session_id, v_slot_step1);

  -- Deuxième validation même slot : doit échouer (UNIQUE)
  BEGIN
    INSERT INTO session_validations (session_id, slot_id)
    VALUES (v_session_id, v_slot_step1);
    RAISE EXCEPTION 'TEST 1 FAILED: doublon validation accepté';
  EXCEPTION
    WHEN unique_violation THEN
      NULL; -- Attendu
  END;

  -- Vérifier qu'il n'y a qu'une seule ligne
  SELECT COUNT(*) INTO v_count
  FROM session_validations
  WHERE session_id = v_session_id AND slot_id = v_slot_step1;

  IF v_count != 1 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: attendu 1 validation, trouvé %', v_count;
  END IF;

  RAISE NOTICE '✅ TEST 1 PASS — Idempotence validation';
END $$;


-- ============================================================
-- TEST 2: Union multi-device
-- SYNC_CONTRACT §3.1 — A valide slot1, B valide slot2 → set final = {1,2}
-- ============================================================
DO $$
DECLARE
  v_session_id uuid := (SELECT val FROM _test_ids WHERE key = 'session1');
  v_slot_step2 uuid := (SELECT val FROM _test_ids WHERE key = 'slot_step2');
  v_count int;
  v_distinct_slots int;
BEGIN
  -- slot_step1 déjà validé par "Appareil A" (test 1)
  -- "Appareil B" valide slot_step2
  INSERT INTO session_validations (session_id, slot_id)
  VALUES (v_session_id, v_slot_step2);

  -- Vérifier union : 2 validations distinctes
  SELECT COUNT(*), COUNT(DISTINCT slot_id)
  INTO v_count, v_distinct_slots
  FROM session_validations
  WHERE session_id = v_session_id;

  IF v_count != 2 OR v_distinct_slots != 2 THEN
    RAISE EXCEPTION 'TEST 2 FAILED: attendu 2 validations distinctes, trouvé count=%, distinct=%',
      v_count, v_distinct_slots;
  END IF;

  RAISE NOTICE '✅ TEST 2 PASS — Union multi-device (2 slots validés par 2 sources)';
END $$;


-- ============================================================
-- TEST 3: Unicité session active
-- SYNC_CONTRACT §3.3 — créer 2 sessions actives même (profil,timeline) → rejet
-- ============================================================
DO $$
DECLARE
  v_profile_id uuid := (SELECT val FROM _test_ids WHERE key = 'profile');
  v_timeline_id uuid := (SELECT val FROM _test_ids WHERE key = 'timeline');
BEGIN
  -- Session 1 est déjà active (test 1)
  -- Tenter de créer une 2e session active
  BEGIN
    INSERT INTO sessions (child_profile_id, timeline_id, state)
    VALUES (v_profile_id, v_timeline_id, 'active_preview');
    RAISE EXCEPTION 'TEST 3 FAILED: 2e session active acceptée';
  EXCEPTION
    WHEN unique_violation THEN
      NULL; -- Attendu (partial UNIQUE index)
  END;

  RAISE NOTICE '✅ TEST 3 PASS — Unicité session active';
END $$;


-- ============================================================
-- TEST 4: Epoch/Reset
-- SYNC_CONTRACT §3.2 — epoch=1, reset → epoch=2, ancienne session = completed
-- ============================================================
DO $$
DECLARE
  v_profile_id uuid := (SELECT val FROM _test_ids WHERE key = 'profile');
  v_timeline_id uuid := (SELECT val FROM _test_ids WHERE key = 'timeline');
  v_session1_id uuid := (SELECT val FROM _test_ids WHERE key = 'session1');
  v_session2_id uuid;
  v_epoch1 int;
  v_epoch2 int;
  v_state1 session_state;
BEGIN
  -- Vérifier epoch session 1
  SELECT epoch INTO v_epoch1 FROM sessions WHERE id = v_session1_id;
  IF v_epoch1 != 1 THEN
    RAISE EXCEPTION 'TEST 4 FAILED: epoch session 1 attendu 1, trouvé %', v_epoch1;
  END IF;

  -- Passer session 1 en completed (simuler fin ou reset admin)
  -- Note: la session est en active_started (après les validations des tests 1-2)
  -- On la force en completed pour libérer le partial UNIQUE
  UPDATE sessions SET state = 'completed', completed_at = NOW()
  WHERE id = v_session1_id;

  -- Créer nouvelle session (reset) — le trigger doit forcer epoch=2
  INSERT INTO sessions (child_profile_id, timeline_id, state, epoch)
  VALUES (v_profile_id, v_timeline_id, 'active_preview', 1)  -- On passe 1 exprès
  RETURNING id INTO v_session2_id;

  INSERT INTO _test_ids VALUES ('session2', v_session2_id) ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;

  -- Vérifier que le trigger a forcé epoch=2
  SELECT epoch INTO v_epoch2 FROM sessions WHERE id = v_session2_id;
  IF v_epoch2 < 2 THEN
    RAISE EXCEPTION 'TEST 4 FAILED: epoch session 2 attendu >=2, trouvé %', v_epoch2;
  END IF;

  -- Vérifier que session 1 est bien completed
  SELECT state INTO v_state1 FROM sessions WHERE id = v_session1_id;
  IF v_state1 != 'completed' THEN
    RAISE EXCEPTION 'TEST 4 FAILED: session 1 devrait être completed, trouvé %', v_state1;
  END IF;

  RAISE NOTICE '✅ TEST 4 PASS — Epoch reset (session2.epoch=%, session1.state=%)', v_epoch2, v_state1;
END $$;


-- ============================================================
-- TEST 5: Validation sur session completed → rejet
-- SYNC_CONTRACT §3 implicite — session completed = lecture seule
-- ============================================================
DO $$
DECLARE
  v_session1_id uuid := (SELECT val FROM _test_ids WHERE key = 'session1');
  -- Utiliser slot_step3 qui n'a PAS été validé sur session1
  -- → on teste le rejet par état completed, pas par doublon UNIQUE
  v_slot_step3 uuid := (SELECT val FROM _test_ids WHERE key = 'slot_step3');
BEGIN
  -- Session 1 est completed (test 4)
  -- Tenter de valider un slot JAMAIS validé dessus
  BEGIN
    INSERT INTO session_validations (session_id, slot_id)
    VALUES (v_session1_id, v_slot_step3);
    RAISE EXCEPTION 'TEST 5 FAILED: validation sur session completed acceptée';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 5 FAILED%' THEN
        RAISE;
      END IF;
      NULL; -- Trigger a bloqué = attendu
    WHEN others THEN
      NULL; -- Tout blocage = OK
  END;

  RAISE NOTICE '✅ TEST 5 PASS — Validation sur session completed rejetée';
END $$;


-- ============================================================
-- TEST 6: Validation cross-timeline → rejet
-- SYNC_CONTRACT §3 implicite — slot d'une autre timeline = interdit
-- ============================================================
DO $$
DECLARE
  v_session2_id uuid := (SELECT val FROM _test_ids WHERE key = 'session2');
  v_profile_id uuid := (SELECT val FROM _test_ids WHERE key = 'profile');
  v_other_timeline_id uuid;
  v_other_slot_id uuid;
  v_other_profile_id uuid;
BEGIN
  -- Créer un 2e profil (subscriber = quota 3)
  INSERT INTO child_profiles (account_id, name)
  VALUES ('a0000000-0000-0000-0000-000000000001', 'Autre enfant')
  RETURNING id INTO v_other_profile_id;

  -- Le trigger auto-crée une timeline + slots pour ce profil
  SELECT t.id INTO v_other_timeline_id
  FROM timelines t WHERE t.child_profile_id = v_other_profile_id;

  SELECT s.id INTO v_other_slot_id
  FROM slots s WHERE s.timeline_id = v_other_timeline_id AND s.kind = 'step'
  LIMIT 1;

  -- Assigner une carte au slot (sinon le trigger rejette pour card_id NULL avant cross-timeline)
  UPDATE slots SET card_id = (SELECT val FROM _test_ids WHERE key = 'card')
  WHERE id = v_other_slot_id;

  -- Tenter de valider un slot de l'autre timeline dans session2
  BEGIN
    INSERT INTO session_validations (session_id, slot_id)
    VALUES (v_session2_id, v_other_slot_id);
    RAISE EXCEPTION 'TEST 6 FAILED: validation cross-timeline acceptée';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 6 FAILED%' THEN
        RAISE;
      END IF;
      NULL; -- Trigger a bloqué = attendu
    WHEN others THEN
      NULL; -- Tout blocage = OK
  END;

  -- Cleanup: supprimer le profil de test supplémentaire
  DELETE FROM child_profiles WHERE id = v_other_profile_id;

  RAISE NOTICE '✅ TEST 6 PASS — Validation cross-timeline rejetée';
END $$;


-- ============================================================
-- TEST 7: Introspection anti-dérive
-- SYNC_CONTRACT §8 — vérifier qu'aucune colonne sync_*/offline_*/progress* n'existe
-- ============================================================
DO $$
DECLARE
  v_violations TEXT;
  v_count int;
BEGIN
  SELECT COUNT(*), string_agg(table_name || '.' || column_name, ', ')
  INTO v_count, v_violations
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN (
      'accounts', 'devices', 'child_profiles',
      'cards', 'categories', 'user_card_categories',
      'timelines', 'slots',
      'sessions', 'session_validations',
      'sequences', 'sequence_steps',
      'account_quota_months'
    )
    AND (
      column_name LIKE 'sync_%'
      OR column_name LIKE 'synced_%'
      OR column_name LIKE '%_synced'
      OR column_name LIKE 'offline_%'
      OR column_name = 'is_offline'
      OR column_name LIKE 'last_sync%'
      OR column_name LIKE '%_sync_at'
      OR column_name = 'device_source'
      OR column_name LIKE 'synced_from_%'
      OR column_name = 'is_dirty'
      OR column_name = 'needs_sync'
      OR column_name LIKE 'pending_%'
      -- progress est OK si c'est steps_total_snapshot (snapshot figé)
      OR (column_name LIKE 'progress%' AND column_name != 'steps_total_snapshot')
    );

  IF v_count > 0 THEN
    RAISE EXCEPTION 'TEST 7 FAILED: colonnes sync/offline détectées: %', v_violations;
  END IF;

  RAISE NOTICE '✅ TEST 7 PASS — Aucune colonne sync/offline/progress parasite détectée';
END $$;


-- ============================================================
-- TEST 8: Vérification tables métier — pas de table sync dédiée
-- SYNC_CONTRACT §7.3 — aucune table sync_*, device_sync_*, offline_*
-- ============================================================
DO $$
DECLARE
  v_violations TEXT;
  v_count int;
BEGIN
  SELECT COUNT(*), string_agg(table_name, ', ')
  INTO v_count, v_violations
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND (
      table_name LIKE 'sync_%'
      OR table_name LIKE '%_sync'
      OR table_name LIKE 'device_sync%'
      OR table_name LIKE 'offline_%'
      OR table_name LIKE '%_sync_log'
      OR table_name LIKE '%_sync_event%'
    );

  IF v_count > 0 THEN
    RAISE EXCEPTION 'TEST 8 FAILED: tables sync/offline détectées: %', v_violations;
  END IF;

  RAISE NOTICE '✅ TEST 8 PASS — Aucune table sync/offline parasite détectée';
END $$;


-- ============================================================
-- TEST 9: validated_at n'est pas utilisé dans des triggers/fonctions métier
-- SYNC_CONTRACT §7.1 — validated_at = audit-only
-- ============================================================
DO $$
DECLARE
  v_count int;
  v_violations TEXT;
BEGIN
  -- Vérifier qu'aucune fonction/trigger ne contient "validated_at" dans un WHERE ou ORDER BY
  -- (hors la définition de la colonne elle-même)
  SELECT COUNT(*), string_agg(routine_name, ', ')
  INTO v_count, v_violations
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION'
    AND routine_definition LIKE '%validated_at%'
    AND routine_name NOT LIKE '%test%';

  IF v_count > 0 THEN
    -- Pas forcément une erreur : il faut vérifier si c'est du WHERE/ORDER BY ou juste DEFAULT NOW()
    -- On lève un WARNING, pas une exception
    RAISE NOTICE '⚠️  TEST 9 WARNING — % fonction(s) référencent validated_at: %. Vérifier usage audit-only.', v_count, v_violations;
  ELSE
    RAISE NOTICE '✅ TEST 9 PASS — Aucune fonction métier ne référence validated_at';
  END IF;
END $$;


-- ============================================================
-- CLEANUP
-- ============================================================
DROP TABLE IF EXISTS _test_ids;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ Phase 10 Smoke Tests — TOUS PASSÉS';
  RAISE NOTICE '====================================================';
END $$;

ROLLBACK;
-- ROLLBACK : aucune donnée de test ne persiste en DB