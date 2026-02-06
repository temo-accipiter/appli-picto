-- ============================================================
-- Phase 6 — Smoke Tests: Sequences & Sequence Steps
-- ============================================================
-- Date: 2026-02-06
-- Migrations couvertes:
--   20260202122000_phase6_create_sequences.sql
--   20260202123000_phase6_create_sequence_steps.sql
--   20260202124000_phase6_add_sequence_invariants.sql
--
-- Objectif: Vérifier structure sequences/steps, UNIQUE constraints,
--           min 2 steps (deferred), ownership guards, bank delete guard,
--           position DEFERRABLE reorder, step = mother autorisé.
-- Exécution: psql -v ON_ERROR_STOP=1 -f phase6_smoke.sql
-- ============================================================

BEGIN;

-- ============================================================
-- SETUP
-- ============================================================
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
VALUES (
  'ee000000-0000-0000-0000-000000000001', 'phase6@test.local',
  '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
  NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, status, timezone)
VALUES ('ee000000-0000-0000-0000-000000000001', 'subscriber', 'Europe/Paris')
ON CONFLICT (id) DO NOTHING;

-- 2e user pour tests cross-account
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
VALUES (
  'ee000000-0000-0000-0000-000000000002', 'phase6-other@test.local',
  '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
  NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, status, timezone)
VALUES ('ee000000-0000-0000-0000-000000000002', 'subscriber', 'Europe/Paris')
ON CONFLICT (id) DO NOTHING;

CREATE TEMP TABLE _p6_ids (key TEXT PRIMARY KEY, val UUID NOT NULL);

DO $$
DECLARE
  v_card_a uuid;
  v_card_b uuid;
  v_card_c uuid;
  v_bank_card uuid;
  v_other_personal uuid;
BEGIN
  -- Cartes personal user1
  INSERT INTO cards (name, image_url, type, account_id)
  VALUES ('Card A', 'https://test.local/a.png', 'personal', 'ee000000-0000-0000-0000-000000000001')
  RETURNING id INTO v_card_a;

  INSERT INTO cards (name, image_url, type, account_id)
  VALUES ('Card B', 'https://test.local/b.png', 'personal', 'ee000000-0000-0000-0000-000000000001')
  RETURNING id INTO v_card_b;

  INSERT INTO cards (name, image_url, type, account_id)
  VALUES ('Card C', 'https://test.local/c.png', 'personal', 'ee000000-0000-0000-0000-000000000001')
  RETURNING id INTO v_card_c;

  -- Carte bank
  INSERT INTO cards (name, image_url, type, published)
  VALUES ('Bank Seq', 'https://test.local/bank-seq.png', 'bank', TRUE)
  RETURNING id INTO v_bank_card;

  -- Carte personal autre user
  INSERT INTO cards (name, image_url, type, account_id)
  VALUES ('Other Personal', 'https://test.local/other.png', 'personal', 'ee000000-0000-0000-0000-000000000002')
  RETURNING id INTO v_other_personal;

  INSERT INTO _p6_ids VALUES ('user1', 'ee000000-0000-0000-0000-000000000001');
  INSERT INTO _p6_ids VALUES ('user2', 'ee000000-0000-0000-0000-000000000002');
  INSERT INTO _p6_ids VALUES ('card_a', v_card_a);
  INSERT INTO _p6_ids VALUES ('card_b', v_card_b);
  INSERT INTO _p6_ids VALUES ('card_c', v_card_c);
  INSERT INTO _p6_ids VALUES ('bank_card', v_bank_card);
  INSERT INTO _p6_ids VALUES ('other_personal', v_other_personal);

  RAISE NOTICE '  SETUP — user1=ee...01, cards a=%,b=%,c=%, bank=%, other=%',
    v_card_a, v_card_b, v_card_c, v_bank_card, v_other_personal;
END $$;


-- ============================================================
-- TEST 1: Tables existent
-- ============================================================
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name IN ('sequences', 'sequence_steps');

  IF v_count != 2 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: attendu 2 tables, trouvé %', v_count;
  END IF;

  RAISE NOTICE '✅ TEST 1 PASS — Tables sequences, sequence_steps existent';
END $$;


-- ============================================================
-- TEST 2: Séquence valide avec 2 steps (min 2 strict)
-- ============================================================
DO $$
DECLARE
  v_seq uuid;
  v_card_a uuid := (SELECT val FROM _p6_ids WHERE key = 'card_a');
  v_card_b uuid := (SELECT val FROM _p6_ids WHERE key = 'card_b');
BEGIN
  -- Transaction complète: sequence + 2 steps → doit passer
  INSERT INTO sequences (account_id, mother_card_id)
  VALUES ('ee000000-0000-0000-0000-000000000001', v_card_a)
  RETURNING id INTO v_seq;

  INSERT INTO sequence_steps (sequence_id, step_card_id, position)
  VALUES (v_seq, v_card_a, 0);

  INSERT INTO sequence_steps (sequence_id, step_card_id, position)
  VALUES (v_seq, v_card_b, 1);

  INSERT INTO _p6_ids VALUES ('seq1', v_seq) ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;

  RAISE NOTICE '✅ TEST 2 PASS — Séquence valide avec 2 steps';
END $$;


-- ============================================================
-- TEST 3: Min 2 steps — séquence avec 1 seul step échoue au commit
-- (constraint trigger DEFERRED)
-- ============================================================
DO $$
DECLARE
  v_seq uuid;
  v_card_c uuid := (SELECT val FROM _p6_ids WHERE key = 'card_c');
  v_rejected boolean := FALSE;
BEGIN
  BEGIN
    INSERT INTO sequences (account_id, mother_card_id)
    VALUES ('ee000000-0000-0000-0000-000000000001', v_card_c)
    RETURNING id INTO v_seq;

    INSERT INTO sequence_steps (sequence_id, step_card_id, position)
    VALUES (v_seq, v_card_c, 0);

    -- Force évaluation des constraint triggers deferred
    SET CONSTRAINTS ALL IMMEDIATE;

    -- Si on arrive ici, le test a échoué
    v_rejected := FALSE;
  EXCEPTION
    WHEN raise_exception THEN
      v_rejected := TRUE;
  END;

  -- Remettre les contraintes en mode deferred pour la suite
  SET CONSTRAINTS ALL DEFERRED;

  IF NOT v_rejected THEN
    RAISE EXCEPTION 'TEST 3 FAILED: séquence avec 1 step acceptée';
  END IF;

  RAISE NOTICE '✅ TEST 3 PASS — Min 2 steps: séquence avec 1 step rejetée';
END $$;


-- ============================================================
-- TEST 4: Suppression step quand count=2 → bloquée (passerait à 1)
-- ============================================================
DO $$
DECLARE
  v_seq uuid := (SELECT val FROM _p6_ids WHERE key = 'seq1');
  v_step_to_delete uuid;
  v_rejected boolean := FALSE;
BEGIN
  SELECT id INTO v_step_to_delete FROM sequence_steps
  WHERE sequence_id = v_seq LIMIT 1;

  BEGIN
    DELETE FROM sequence_steps WHERE id = v_step_to_delete;

    SET CONSTRAINTS ALL IMMEDIATE;

    v_rejected := FALSE;
  EXCEPTION
    WHEN raise_exception THEN
      v_rejected := TRUE;
  END;

  SET CONSTRAINTS ALL DEFERRED;

  IF NOT v_rejected THEN
    RAISE EXCEPTION 'TEST 4 FAILED: suppression step acceptée (passerait à 1)';
  END IF;

  RAISE NOTICE '✅ TEST 4 PASS — Suppression step quand count=2 bloquée';
END $$;


-- ============================================================
-- TEST 5: UNIQUE (account_id, mother_card_id) — pas de doublon séquence
-- ============================================================
DO $$
DECLARE
  v_card_a uuid := (SELECT val FROM _p6_ids WHERE key = 'card_a');
BEGIN
  -- seq1 utilise déjà (user1, card_a)
  BEGIN
    INSERT INTO sequences (account_id, mother_card_id)
    VALUES ('ee000000-0000-0000-0000-000000000001', v_card_a);
    RAISE EXCEPTION 'TEST 5 FAILED: doublon séquence (account, mother) accepté';
  EXCEPTION
    WHEN unique_violation THEN NULL; -- Attendu
  END;

  RAISE NOTICE '✅ TEST 5 PASS — UNIQUE (account_id, mother_card_id)';
END $$;


-- ============================================================
-- TEST 6: UNIQUE (sequence_id, step_card_id) — pas de carte dupliquée
-- ============================================================
DO $$
DECLARE
  v_seq uuid := (SELECT val FROM _p6_ids WHERE key = 'seq1');
  v_card_a uuid := (SELECT val FROM _p6_ids WHERE key = 'card_a');
BEGIN
  -- card_a est déjà step dans seq1
  BEGIN
    INSERT INTO sequence_steps (sequence_id, step_card_id, position)
    VALUES (v_seq, v_card_a, 99);
    RAISE EXCEPTION 'TEST 6 FAILED: doublon step_card accepté';
  EXCEPTION
    WHEN unique_violation THEN NULL; -- Attendu
  END;

  RAISE NOTICE '✅ TEST 6 PASS — UNIQUE (sequence_id, step_card_id)';
END $$;


-- ============================================================
-- TEST 7: Ownership guard — mother_card personal cross-account bloqué
-- ============================================================
DO $$
DECLARE
  v_other uuid := (SELECT val FROM _p6_ids WHERE key = 'other_personal');
BEGIN
  BEGIN
    INSERT INTO sequences (account_id, mother_card_id)
    VALUES ('ee000000-0000-0000-0000-000000000001', v_other);
    RAISE EXCEPTION 'TEST 7 FAILED: mother_card cross-account acceptée';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 7 FAILED%' THEN RAISE; END IF;
      NULL; -- Ownership guard bloque = attendu
  END;

  RAISE NOTICE '✅ TEST 7 PASS — Ownership guard mother_card (cross-account bloqué)';
END $$;


-- ============================================================
-- TEST 8: Ownership guard — step_card personal cross-account bloqué
-- ============================================================
DO $$
DECLARE
  v_bank uuid := (SELECT val FROM _p6_ids WHERE key = 'bank_card');
  v_other uuid := (SELECT val FROM _p6_ids WHERE key = 'other_personal');
  v_card_c uuid := (SELECT val FROM _p6_ids WHERE key = 'card_c');
  v_seq uuid;
  v_rejected boolean := FALSE;
BEGIN
  BEGIN
    INSERT INTO sequences (account_id, mother_card_id)
    VALUES ('ee000000-0000-0000-0000-000000000001', v_bank)
    RETURNING id INTO v_seq;

    -- Ajouter step avec personal d'un AUTRE user → bloqué
    INSERT INTO sequence_steps (sequence_id, step_card_id, position)
    VALUES (v_seq, v_other, 0);

    v_rejected := FALSE;
  EXCEPTION
    WHEN raise_exception THEN
      v_rejected := TRUE;
  END;

  IF NOT v_rejected THEN
    RAISE EXCEPTION 'TEST 8 FAILED: step_card cross-account acceptée';
  END IF;

  RAISE NOTICE '✅ TEST 8 PASS — Ownership guard step_card (cross-account bloqué)';
END $$;


-- ============================================================
-- TEST 9: Bank card mother autorisée pour tout account
-- ============================================================
DO $$
DECLARE
  v_bank uuid := (SELECT val FROM _p6_ids WHERE key = 'bank_card');
  v_card_a uuid := (SELECT val FROM _p6_ids WHERE key = 'card_a');
  v_card_c uuid := (SELECT val FROM _p6_ids WHERE key = 'card_c');
  v_seq uuid;
BEGIN
  BEGIN
    INSERT INTO sequences (account_id, mother_card_id)
    VALUES ('ee000000-0000-0000-0000-000000000001', v_bank)
    RETURNING id INTO v_seq;

    INSERT INTO sequence_steps (sequence_id, step_card_id, position) VALUES (v_seq, v_card_a, 0);
    INSERT INTO sequence_steps (sequence_id, step_card_id, position) VALUES (v_seq, v_card_c, 1);

    RAISE NOTICE '✅ TEST 9 PASS — Bank card mother autorisée';

    -- Cleanup: supprimer la séquence pour ne pas polluer les tests suivants
    DELETE FROM sequences WHERE id = v_seq;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'TEST 9 FAILED: bank card mother rejetée: %', SQLERRM;
  END;
END $$;


-- ============================================================
-- TEST 10: step = mother autorisé (carte mère peut être étape)
-- ============================================================
DO $$
DECLARE
  v_seq uuid := (SELECT val FROM _p6_ids WHERE key = 'seq1');
  v_card_a uuid := (SELECT val FROM _p6_ids WHERE key = 'card_a');
  v_step_a_exists boolean;
BEGIN
  -- seq1 mother = card_a, et card_a est aussi step → déjà le cas depuis TEST 2
  SELECT EXISTS (
    SELECT 1 FROM sequence_steps
    WHERE sequence_id = v_seq AND step_card_id = v_card_a
  ) INTO v_step_a_exists;

  IF NOT v_step_a_exists THEN
    RAISE EXCEPTION 'TEST 10 FAILED: card_a n''est pas step dans sa propre séquence';
  END IF;

  RAISE NOTICE '✅ TEST 10 PASS — step = mother autorisé';
END $$;


-- ============================================================
-- TEST 11: Position DEFERRABLE — swap transactionnel
-- ============================================================
DO $$
DECLARE
  v_seq uuid := (SELECT val FROM _p6_ids WHERE key = 'seq1');
  v_step_0 uuid;
  v_step_1 uuid;
  v_pos_0_after int;
  v_pos_1_after int;
BEGIN
  SELECT id INTO v_step_0 FROM sequence_steps WHERE sequence_id = v_seq AND position = 0;
  SELECT id INTO v_step_1 FROM sequence_steps WHERE sequence_id = v_seq AND position = 1;

  -- Swap positions (DEFERRABLE INITIALLY DEFERRED permet ça)
  UPDATE sequence_steps SET position = 1 WHERE id = v_step_0;
  UPDATE sequence_steps SET position = 0 WHERE id = v_step_1;

  SELECT position INTO v_pos_0_after FROM sequence_steps WHERE id = v_step_0;
  SELECT position INTO v_pos_1_after FROM sequence_steps WHERE id = v_step_1;

  IF v_pos_0_after != 1 OR v_pos_1_after != 0 THEN
    RAISE EXCEPTION 'TEST 11 FAILED: swap échoué (pos=%, %)', v_pos_0_after, v_pos_1_after;
  END IF;

  -- Remettre
  UPDATE sequence_steps SET position = 0 WHERE id = v_step_0;
  UPDATE sequence_steps SET position = 1 WHERE id = v_step_1;

  RAISE NOTICE '✅ TEST 11 PASS — Position DEFERRABLE swap transactionnel';
END $$;


-- ============================================================
-- TEST 12: Bank card delete guard — bloqué si référencée dans séquence
-- ============================================================
DO $$
DECLARE
  v_bank uuid;
  v_card_a uuid := (SELECT val FROM _p6_ids WHERE key = 'card_a');
  v_card_b uuid := (SELECT val FROM _p6_ids WHERE key = 'card_b');
  v_seq uuid;
  v_rejected boolean := FALSE;
BEGIN
  -- Créer une bank card spécifique
  INSERT INTO cards (name, image_url, type, published)
  VALUES ('Bank Guard Test', 'https://test.local/guard.png', 'bank', TRUE)
  RETURNING id INTO v_bank;

  BEGIN
    INSERT INTO sequences (account_id, mother_card_id)
    VALUES ('ee000000-0000-0000-0000-000000000001', v_bank)
    RETURNING id INTO v_seq;

    INSERT INTO sequence_steps (sequence_id, step_card_id, position) VALUES (v_seq, v_card_a, 0);
    INSERT INTO sequence_steps (sequence_id, step_card_id, position) VALUES (v_seq, v_card_b, 1);

    -- Tenter de supprimer la bank card mother → bloqué
    DELETE FROM cards WHERE id = v_bank;

    v_rejected := FALSE;
  EXCEPTION
    WHEN raise_exception THEN
      v_rejected := TRUE;
  END;

  IF NOT v_rejected THEN
    RAISE EXCEPTION 'TEST 12 FAILED: bank card référencée supprimée';
  END IF;

  RAISE NOTICE '✅ TEST 12 PASS — Bank card delete guard (référencée → bloqué)';
END $$;


-- ============================================================
-- TEST 13: CASCADE DELETE sequences avec account
-- ============================================================
DO $$
DECLARE
  v_user3 uuid := 'ee000000-0000-0000-0000-000000000003';
  v_card uuid;
  v_card2 uuid;
  v_seq uuid;
BEGIN
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
  VALUES (v_user3, 'phase6-cascade@test.local',
    '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
    NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO accounts (id, status, timezone) VALUES (v_user3, 'subscriber', 'UTC')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO cards (name, image_url, type, account_id)
  VALUES ('Cascade Card 1', 'https://test.local/cc1.png', 'personal', v_user3)
  RETURNING id INTO v_card;

  INSERT INTO cards (name, image_url, type, account_id)
  VALUES ('Cascade Card 2', 'https://test.local/cc2.png', 'personal', v_user3)
  RETURNING id INTO v_card2;

  INSERT INTO sequences (account_id, mother_card_id)
  VALUES (v_user3, v_card) RETURNING id INTO v_seq;

  INSERT INTO sequence_steps (sequence_id, step_card_id, position) VALUES (v_seq, v_card, 0);
  INSERT INTO sequence_steps (sequence_id, step_card_id, position) VALUES (v_seq, v_card2, 1);

  -- Nettoyage catégories avant cascade
  ALTER TABLE categories DISABLE TRIGGER trigger_categories_before_delete_remap;
  DELETE FROM categories WHERE account_id = v_user3;
  ALTER TABLE categories ENABLE TRIGGER trigger_categories_before_delete_remap;

  DELETE FROM auth.users WHERE id = v_user3;

  IF EXISTS (SELECT 1 FROM sequences WHERE id = v_seq) THEN
    RAISE EXCEPTION 'TEST 13 FAILED: séquence persiste après DELETE account';
  END IF;

  RAISE NOTICE '✅ TEST 13 PASS — CASCADE DELETE sequences avec account';
END $$;


-- ============================================================
-- TEST 14: sequence_steps.position >= 0
-- ============================================================
DO $$
DECLARE
  v_seq uuid := (SELECT val FROM _p6_ids WHERE key = 'seq1');
  v_card_c uuid := (SELECT val FROM _p6_ids WHERE key = 'card_c');
BEGIN
  BEGIN
    INSERT INTO sequence_steps (sequence_id, step_card_id, position)
    VALUES (v_seq, v_card_c, -1);
    RAISE EXCEPTION 'TEST 14 FAILED: position négative acceptée';
  EXCEPTION
    WHEN check_violation THEN NULL; -- Attendu
  END;

  RAISE NOTICE '✅ TEST 14 PASS — sequence_steps.position >= 0';
END $$;


-- ============================================================
-- CLEANUP
-- ============================================================
DROP TABLE IF EXISTS _p6_ids;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ Phase 6 Smoke Tests — TOUS PASSÉS (14/14)';
  RAISE NOTICE '====================================================';
END $$;

ROLLBACK;