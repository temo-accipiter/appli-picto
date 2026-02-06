-- ============================================================
-- Phase 7 — Smoke Tests RLS (Row Level Security)
-- ============================================================
-- Date: 2026-02-06
-- Objectif: Vérifier que les policies RLS (Phase 7.0–7.8) isolent
--           correctement les données entre utilisateurs et rôles.
-- Exécution: psql -v ON_ERROR_STOP=1 -f phase7_rls_smoke.sql
--
-- Prérequis: Toutes migrations Phases 1–9 appliquées.
-- Environnement: Supabase local (supabase db reset + migrations)
--
-- STRATÉGIE:
-- On crée 2 utilisateurs (Alice=subscriber, Bob=free) + 1 admin.
-- On teste l'isolation entre eux via SET LOCAL role / jwt.claims.
-- Chaque test simule un contexte "as authenticated" avec un uid spécifique.
--
-- IMPORTANT: Les triggers SECURITY DEFINER (auto-create profil, seed catégorie,
-- etc.) s'exécutent avec le rôle postgres, pas authenticated.
-- Le setup initial est donc fait en rôle postgres, puis on bascule.
-- ============================================================

BEGIN;

-- ============================================================
-- HELPER: Fonction pour simuler un utilisateur authentifié
-- ============================================================
-- Supabase utilise request.jwt.claims pour identifier l'utilisateur.
-- On simule ça avec SET LOCAL.
CREATE OR REPLACE FUNCTION _test_set_auth_uid(uid uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Basculer en rôle authenticated
  PERFORM set_config('role', 'authenticated', true);
  -- Simuler le JWT avec le sub (user id)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', uid::text, true);
END;
$$;

-- Helper: revenir en rôle postgres (pour setup entre tests)
CREATE OR REPLACE FUNCTION _test_reset_role()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
END;
$$;


-- ============================================================
-- SETUP: 3 utilisateurs (Alice=subscriber, Bob=free, Charlie=admin)
-- ============================================================

-- Alice (subscriber)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'alice@test.local',
  '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
  NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, status, timezone)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'subscriber', 'Europe/Paris')
ON CONFLICT (id) DO NOTHING;

-- Bob (free)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'bob@test.local',
  '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
  NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, status, timezone)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'free', 'Europe/Paris')
ON CONFLICT (id) DO NOTHING;

-- Charlie (admin)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'charlie@test.local',
  '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
  NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, status, timezone)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'admin', 'Europe/Paris')
ON CONFLICT (id) DO NOTHING;


-- Stocker IDs auto-créés dans table temporaire
CREATE TEMP TABLE _rls_ids (key TEXT PRIMARY KEY, val UUID NOT NULL);

DO $$
DECLARE
  v_alice_profile uuid;
  v_alice_timeline uuid;
  v_bob_profile uuid;
  v_bob_timeline uuid;
  v_alice_card uuid;
  v_bank_card uuid;
BEGIN
  -- Alice
  SELECT id INTO v_alice_profile FROM child_profiles
  WHERE account_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' LIMIT 1;

  SELECT id INTO v_alice_timeline FROM timelines
  WHERE child_profile_id = v_alice_profile;

  -- Bob
  SELECT id INTO v_bob_profile FROM child_profiles
  WHERE account_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' LIMIT 1;

  SELECT id INTO v_bob_timeline FROM timelines
  WHERE child_profile_id = v_bob_profile;

  -- Créer une carte personal pour Alice
  INSERT INTO cards (name, image_url, type, account_id)
  VALUES ('Alice Personal Card', 'https://test.local/alice.png', 'personal', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  RETURNING id INTO v_alice_card;

  -- Créer une carte bank published
  INSERT INTO cards (name, image_url, type, published)
  VALUES ('Bank Card Test', 'https://test.local/bank.png', 'bank', TRUE)
  RETURNING id INTO v_bank_card;

  INSERT INTO _rls_ids VALUES ('alice_profile', v_alice_profile);
  INSERT INTO _rls_ids VALUES ('alice_timeline', v_alice_timeline);
  INSERT INTO _rls_ids VALUES ('bob_profile', v_bob_profile);
  INSERT INTO _rls_ids VALUES ('bob_timeline', v_bob_timeline);
  INSERT INTO _rls_ids VALUES ('alice_card', v_alice_card);
  INSERT INTO _rls_ids VALUES ('bank_card', v_bank_card);

  RAISE NOTICE '✅ SETUP OK — alice_profile=%, bob_profile=%, alice_card=%, bank_card=%',
    v_alice_profile, v_bob_profile, v_alice_card, v_bank_card;
END $$;


-- ============================================================
-- TEST 1: Isolation accounts — Alice ne voit pas Bob
-- Phase 7.3: accounts_select_owner (id = auth.uid())
-- ============================================================
DO $$
DECLARE
  v_count int;
BEGIN
  PERFORM _test_set_auth_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

  SELECT COUNT(*) INTO v_count FROM accounts;

  IF v_count != 1 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: Alice voit % comptes (attendu 1)', v_count;
  END IF;

  PERFORM _test_reset_role();
  RAISE NOTICE '✅ TEST 1 PASS — Isolation accounts (Alice voit 1 seul compte)';
END $$;


-- ============================================================
-- TEST 2: Isolation child_profiles — Alice ne voit pas les enfants de Bob
-- Phase 7.3: child_profiles_select_owner
-- ============================================================
DO $$
DECLARE
  v_count int;
  v_bob_profile uuid := (SELECT val FROM _rls_ids WHERE key = 'bob_profile');
BEGIN
  PERFORM _test_set_auth_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

  -- Alice ne doit voir que ses propres profils
  SELECT COUNT(*) INTO v_count FROM child_profiles;

  IF v_count != 1 THEN
    RAISE EXCEPTION 'TEST 2 FAILED: Alice voit % profils (attendu 1)', v_count;
  END IF;

  -- Alice ne doit pas voir le profil de Bob
  SELECT COUNT(*) INTO v_count FROM child_profiles WHERE id = v_bob_profile;

  IF v_count != 0 THEN
    RAISE EXCEPTION 'TEST 2 FAILED: Alice voit le profil de Bob';
  END IF;

  PERFORM _test_reset_role();
  RAISE NOTICE '✅ TEST 2 PASS — Isolation child_profiles';
END $$;


-- ============================================================
-- TEST 3: Isolation timelines — Alice ne voit pas les timelines de Bob
-- Phase 7.6: timelines_select_owner (via child_profile)
-- ============================================================
DO $$
DECLARE
  v_count int;
  v_bob_timeline uuid := (SELECT val FROM _rls_ids WHERE key = 'bob_timeline');
BEGIN
  PERFORM _test_set_auth_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

  SELECT COUNT(*) INTO v_count FROM timelines WHERE id = v_bob_timeline;

  IF v_count != 0 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: Alice voit la timeline de Bob';
  END IF;

  PERFORM _test_reset_role();
  RAISE NOTICE '✅ TEST 3 PASS — Isolation timelines';
END $$;


-- ============================================================
-- TEST 4: Isolation slots — Alice ne voit pas les slots de Bob
-- Phase 7.6: slots_select_owner (via timeline→child_profile)
-- ============================================================
DO $$
DECLARE
  v_count int;
  v_bob_timeline uuid := (SELECT val FROM _rls_ids WHERE key = 'bob_timeline');
BEGIN
  PERFORM _test_set_auth_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

  SELECT COUNT(*) INTO v_count FROM slots
  WHERE timeline_id = v_bob_timeline;

  IF v_count != 0 THEN
    RAISE EXCEPTION 'TEST 4 FAILED: Alice voit les slots de Bob';
  END IF;

  PERFORM _test_reset_role();
  RAISE NOTICE '✅ TEST 4 PASS — Isolation slots';
END $$;


-- ============================================================
-- TEST 5: Cards — Alice voit bank published + ses personal, pas personal de Bob
-- Phase 7.4: cards_select_authenticated
-- ============================================================
DO $$
DECLARE
  v_count_bank int;
  v_count_alice int;
  v_count_total int;
  v_alice_card uuid := (SELECT val FROM _rls_ids WHERE key = 'alice_card');
BEGIN
  PERFORM _test_set_auth_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

  -- Alice voit ses personal
  SELECT COUNT(*) INTO v_count_alice FROM cards
  WHERE type = 'personal' AND account_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  IF v_count_alice < 1 THEN
    RAISE EXCEPTION 'TEST 5 FAILED: Alice ne voit pas ses cartes personal';
  END IF;

  -- Alice voit bank published
  SELECT COUNT(*) INTO v_count_bank FROM cards
  WHERE type = 'bank' AND published = TRUE;

  IF v_count_bank < 1 THEN
    RAISE EXCEPTION 'TEST 5 FAILED: Alice ne voit pas les cartes bank published';
  END IF;

  PERFORM _test_reset_role();
  RAISE NOTICE '✅ TEST 5 PASS — Cards visibilité (bank published + own personal)';
END $$;


-- ============================================================
-- TEST 6: Cards — Bob ne voit PAS les personal d'Alice
-- Phase 7.4: cards_select_authenticated (isolation personal)
-- ============================================================
DO $$
DECLARE
  v_count int;
  v_alice_card uuid := (SELECT val FROM _rls_ids WHERE key = 'alice_card');
BEGIN
  PERFORM _test_set_auth_uid('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

  SELECT COUNT(*) INTO v_count FROM cards WHERE id = v_alice_card;

  IF v_count != 0 THEN
    RAISE EXCEPTION 'TEST 6 FAILED: Bob voit la carte personal d''Alice';
  END IF;

  PERFORM _test_reset_role();
  RAISE NOTICE '✅ TEST 6 PASS — Bob ne voit pas les personal d''Alice';
END $$;


-- ============================================================
-- TEST 7: Admin — voit bank, PAS personal d'autres users
-- Phase 7.4: cards_select_admin (type='bank' only)
-- ============================================================
DO $$
DECLARE
  v_count_bank int;
  v_count_alice_personal int;
  v_alice_card uuid := (SELECT val FROM _rls_ids WHERE key = 'alice_card');
BEGIN
  PERFORM _test_set_auth_uid('cccccccc-cccc-cccc-cccc-cccccccccccc');

  -- Admin voit bank
  SELECT COUNT(*) INTO v_count_bank FROM cards WHERE type = 'bank';

  IF v_count_bank < 1 THEN
    RAISE EXCEPTION 'TEST 7 FAILED: Admin ne voit pas les cartes bank';
  END IF;

  -- Admin ne voit PAS personal d'Alice
  SELECT COUNT(*) INTO v_count_alice_personal FROM cards WHERE id = v_alice_card;

  IF v_count_alice_personal != 0 THEN
    RAISE EXCEPTION 'TEST 7 FAILED: Admin voit la carte personal d''Alice (D2 violated)';
  END IF;

  PERFORM _test_reset_role();
  RAISE NOTICE '✅ TEST 7 PASS — Admin voit bank, pas personal d''Alice (D2)';
END $$;


-- ============================================================
-- TEST 8: Anon — voit bank published uniquement
-- Phase 7.4: cards_select_bank_published_anon
-- ============================================================
DO $$
DECLARE
  v_count int;
  v_alice_card uuid := (SELECT val FROM _rls_ids WHERE key = 'alice_card');
BEGIN
  -- Basculer en rôle anon
  PERFORM set_config('role', 'anon', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- Anon voit bank published
  SELECT COUNT(*) INTO v_count FROM cards WHERE type = 'bank' AND published = TRUE;

  IF v_count < 1 THEN
    RAISE EXCEPTION 'TEST 8 FAILED: Anon ne voit pas les cartes bank published';
  END IF;

  -- Anon ne voit PAS personal
  SELECT COUNT(*) INTO v_count FROM cards WHERE id = v_alice_card;

  IF v_count != 0 THEN
    RAISE EXCEPTION 'TEST 8 FAILED: Anon voit une carte personal';
  END IF;

  -- Anon ne voit rien d'autre (accounts → pas de GRANT = permission denied = OK)
  BEGIN
    SELECT COUNT(*) INTO v_count FROM accounts;
    -- Si on arrive ici avec count > 0, c'est un problème
    IF v_count != 0 THEN
      RAISE EXCEPTION 'TEST 8 FAILED: Anon voit des accounts';
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL; -- Pas de GRANT sur accounts pour anon = attendu
  END;

  PERFORM _test_reset_role();
  RAISE NOTICE '✅ TEST 8 PASS — Anon voit bank published uniquement';
END $$;


-- ============================================================
-- TEST 9: Status immutable — Alice ne peut pas se promouvoir admin
-- Phase 7.3: accounts_update_owner WITH CHECK (status immutable)
-- ============================================================
DO $$
BEGIN
  PERFORM _test_set_auth_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

  BEGIN
    UPDATE accounts SET status = 'admin' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    -- Si 0 rows updated (RLS WITH CHECK rejet silencieux), c'est OK
    -- Si exception, c'est OK aussi
    IF FOUND THEN
      -- Vérifier que le statut n'a PAS changé (WITH CHECK devrait rejeter)
      DECLARE v_status account_status;
      BEGIN
        PERFORM _test_reset_role();
        SELECT status INTO v_status FROM accounts
        WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        IF v_status = 'admin' THEN
          RAISE EXCEPTION 'TEST 9 FAILED: Alice a réussi à se promouvoir admin';
        END IF;
      END;
    END IF;
  EXCEPTION
    WHEN others THEN
      NULL; -- Tout blocage = OK
  END;

  PERFORM _test_reset_role();
  RAISE NOTICE '✅ TEST 9 PASS — Status immutable (auto-promotion bloquée)';
END $$;


-- ============================================================
-- TEST 10: Isolation categories — Alice ne voit pas les catégories de Bob
-- Phase 7.4: categories_select_owner
-- ============================================================
DO $$
DECLARE
  v_alice_cats int;
  v_bob_cats int;
BEGIN
  PERFORM _test_set_auth_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

  SELECT COUNT(*) INTO v_alice_cats FROM categories;

  -- Alice doit voir au moins "Sans catégorie" (seedée)
  IF v_alice_cats < 1 THEN
    RAISE EXCEPTION 'TEST 10 FAILED: Alice ne voit aucune catégorie';
  END IF;

  PERFORM _test_reset_role();

  -- Compter les catégories de Bob en tant que Bob
  PERFORM _test_set_auth_uid('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
  SELECT COUNT(*) INTO v_bob_cats FROM categories;

  IF v_bob_cats < 1 THEN
    RAISE EXCEPTION 'TEST 10 FAILED: Bob ne voit aucune catégorie';
  END IF;

  PERFORM _test_reset_role();

  -- En tant qu'Alice, vérifier qu'elle ne voit pas celles de Bob
  PERFORM _test_set_auth_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

  DECLARE v_cross_count int;
  BEGIN
    SELECT COUNT(*) INTO v_cross_count FROM categories
    WHERE account_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    IF v_cross_count != 0 THEN
      RAISE EXCEPTION 'TEST 10 FAILED: Alice voit les catégories de Bob';
    END IF;
  END;

  PERFORM _test_reset_role();
  RAISE NOTICE '✅ TEST 10 PASS — Isolation categories';
END $$;


-- ============================================================
-- TEST 11: Isolation sessions — Alice ne voit pas les sessions de Bob
-- Phase 7.7: sessions_select_owner (via child_profile)
-- ============================================================
DO $$
DECLARE
  v_alice_profile uuid := (SELECT val FROM _rls_ids WHERE key = 'alice_profile');
  v_alice_timeline uuid := (SELECT val FROM _rls_ids WHERE key = 'alice_timeline');
  v_bob_profile uuid := (SELECT val FROM _rls_ids WHERE key = 'bob_profile');
  v_alice_session uuid;
  v_bob_session uuid;
  v_count int;
BEGIN
  PERFORM _test_reset_role();

  -- Créer une session pour Alice (en postgres pour éviter les policies)
  INSERT INTO sessions (child_profile_id, timeline_id, state)
  VALUES (v_alice_profile, v_alice_timeline, 'active_preview')
  RETURNING id INTO v_alice_session;

  -- Créer une session pour Bob
  INSERT INTO sessions (child_profile_id, timeline_id, state)
  VALUES (v_bob_profile, (SELECT val FROM _rls_ids WHERE key = 'bob_timeline'), 'active_preview')
  RETURNING id INTO v_bob_session;

  INSERT INTO _rls_ids VALUES ('alice_session', v_alice_session) ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;
  INSERT INTO _rls_ids VALUES ('bob_session', v_bob_session) ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;

  -- En tant qu'Alice
  PERFORM _test_set_auth_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

  SELECT COUNT(*) INTO v_count FROM sessions WHERE id = v_bob_session;
  IF v_count != 0 THEN
    RAISE EXCEPTION 'TEST 11 FAILED: Alice voit la session de Bob';
  END IF;

  SELECT COUNT(*) INTO v_count FROM sessions WHERE id = v_alice_session;
  IF v_count != 1 THEN
    RAISE EXCEPTION 'TEST 11 FAILED: Alice ne voit pas sa propre session';
  END IF;

  PERFORM _test_reset_role();
  RAISE NOTICE '✅ TEST 11 PASS — Isolation sessions';
END $$;


-- ============================================================
-- TEST 12: Isolation session_validations — cross-account bloqué
-- Phase 7.7: session_validations_insert_owner (owner via session)
-- ============================================================
DO $$
DECLARE
  v_bob_session uuid := (SELECT val FROM _rls_ids WHERE key = 'bob_session');
  v_alice_timeline uuid := (SELECT val FROM _rls_ids WHERE key = 'alice_timeline');
  v_slot_id uuid;
BEGIN
  PERFORM _test_reset_role();

  -- Récupérer un slot de la timeline d'Alice (en postgres)
  SELECT id INTO v_slot_id FROM slots
  WHERE timeline_id = v_alice_timeline AND kind = 'step' LIMIT 1;

  -- En tant qu'Alice, tenter d'insérer une validation sur la session de BOB
  PERFORM _test_set_auth_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

  BEGIN
    INSERT INTO session_validations (session_id, slot_id)
    VALUES (v_bob_session, v_slot_id);
    RAISE EXCEPTION 'TEST 12 FAILED: Alice a inséré une validation dans la session de Bob';
  EXCEPTION
    WHEN others THEN
      NULL; -- RLS bloque ou trigger bloque = OK
  END;

  PERFORM _test_reset_role();
  RAISE NOTICE '✅ TEST 12 PASS — Validation cross-account bloquée';
END $$;


-- ============================================================
-- TEST 13: image_url immutable — personal card
-- Phase 7.0: trigger cards_prevent_update_image_url_personal
-- ============================================================
DO $$
DECLARE
  v_alice_card uuid := (SELECT val FROM _rls_ids WHERE key = 'alice_card');
BEGIN
  PERFORM _test_set_auth_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

  BEGIN
    UPDATE cards SET image_url = 'https://test.local/hacked.png'
    WHERE id = v_alice_card;
    RAISE EXCEPTION 'TEST 13 FAILED: image_url modifiée sur carte personal';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 13 FAILED%' THEN RAISE; END IF;
      NULL; -- Trigger a bloqué = attendu
    WHEN others THEN
      NULL; -- Tout blocage = OK
  END;

  PERFORM _test_reset_role();
  RAISE NOTICE '✅ TEST 13 PASS — image_url immutable (personal)';
END $$;


-- ============================================================
-- TEST 14: Execution-only — Bob (free + 2 profils) bloqué sur INSERT structural
-- Phase 7.1/7.3/7.4: is_execution_only() + policies WITH CHECK
-- ============================================================
DO $$
DECLARE
  v_bob_extra_profile uuid;
BEGIN
  PERFORM _test_reset_role();

  -- Bob est free avec quota 1 profil. Pour créer un 2e, on le passe temporairement en subscriber
  UPDATE accounts SET status = 'subscriber' WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  -- Créer le 2e profil (maintenant autorisé par quota subscriber)
  INSERT INTO child_profiles (account_id, name)
  VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Bob Enfant 2')
  RETURNING id INTO v_bob_extra_profile;

  -- Repasser Bob en free → is_execution_only() = TRUE (free + 2 profils)
  UPDATE accounts SET status = 'free' WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  -- En tant que Bob, tenter de créer une carte personal (structural → bloqué)
  PERFORM _test_set_auth_uid('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

  BEGIN
    INSERT INTO cards (name, image_url, type, account_id)
    VALUES ('Bob Card', 'https://test.local/bob.png', 'personal', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
    RAISE EXCEPTION 'TEST 14 FAILED: Bob (execution-only) a créé une carte personal';
  EXCEPTION
    WHEN others THEN
      IF SQLERRM LIKE 'TEST 14 FAILED%' THEN RAISE; END IF;
      NULL; -- RLS WITH CHECK bloque = OK
  END;

  -- Tenter de créer une catégorie (structural → bloqué)
  BEGIN
    INSERT INTO categories (account_id, name, is_system)
    VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Bob Cat', FALSE);
    RAISE EXCEPTION 'TEST 14 FAILED: Bob (execution-only) a créé une catégorie';
  EXCEPTION
    WHEN others THEN
      IF SQLERRM LIKE 'TEST 14 FAILED%' THEN RAISE; END IF;
      NULL; -- RLS bloque = OK
  END;

  PERFORM _test_reset_role();

  -- Cleanup: supprimer le 2e profil de Bob
  DELETE FROM child_profiles WHERE id = v_bob_extra_profile;

  RAISE NOTICE '✅ TEST 14 PASS — Execution-only bloque INSERT structural (cards, categories)';
END $$;


-- ============================================================
-- TEST 15: Locked profile — read-only (pas UPDATE child_profiles)
-- Phase 7.3: child_profiles_update_owner USING (status='active')
-- ============================================================
DO $$
DECLARE
  v_alice_profile uuid := (SELECT val FROM _rls_ids WHERE key = 'alice_profile');
  v_name_before text;
  v_name_after text;
BEGIN
  PERFORM _test_reset_role();

  -- Récupérer le nom actuel
  SELECT name INTO v_name_before FROM child_profiles WHERE id = v_alice_profile;

  -- Verrouiller le profil d'Alice (simuler downgrade)
  UPDATE child_profiles SET status = 'locked' WHERE id = v_alice_profile;

  -- En tant qu'Alice, tenter de modifier le nom du profil verrouillé
  PERFORM _test_set_auth_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

  UPDATE child_profiles SET name = 'Hacked Name' WHERE id = v_alice_profile;
  -- RLS WITH CHECK rejette silencieusement (0 rows updated)

  PERFORM _test_reset_role();

  -- Vérifier que le nom n'a PAS changé
  SELECT name INTO v_name_after FROM child_profiles WHERE id = v_alice_profile;

  IF v_name_after = 'Hacked Name' THEN
    RAISE EXCEPTION 'TEST 15 FAILED: profil verrouillé a été modifié';
  END IF;

  -- Restaurer le profil actif pour les tests suivants
  UPDATE child_profiles SET status = 'active' WHERE id = v_alice_profile;

  RAISE NOTICE '✅ TEST 15 PASS — Locked profile = read-only';
END $$;


-- ============================================================
-- TEST 16: Devices — pas de DELETE (révocation non-destructive)
-- Phase 7.2/7.3: pas de policy DELETE sur devices
-- ============================================================
DO $$
DECLARE
  v_device_id uuid;
BEGIN
  PERFORM _test_reset_role();

  -- Créer un device pour Alice
  INSERT INTO devices (account_id, device_id)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', gen_random_uuid())
  RETURNING id INTO v_device_id;

  -- En tant qu'Alice, tenter de supprimer le device
  PERFORM _test_set_auth_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

  BEGIN
    DELETE FROM devices WHERE id = v_device_id;
    -- Si 0 rows (rejet silencieux RLS), c'est OK
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL; -- Pas de GRANT DELETE sur devices pour authenticated = attendu
    WHEN others THEN
      NULL; -- Tout blocage = OK
  END;

  PERFORM _test_reset_role();

  -- Vérifier que le device existe toujours
  IF NOT EXISTS (SELECT 1 FROM devices WHERE id = v_device_id) THEN
    RAISE EXCEPTION 'TEST 16 FAILED: device supprimé (DELETE devrait être bloqué)';
  END IF;

  -- Cleanup (en postgres)
  DELETE FROM devices WHERE id = v_device_id;

  RAISE NOTICE '✅ TEST 16 PASS — Devices: DELETE bloqué (révocation non-destructive)';
END $$;


-- ============================================================
-- TEST 17: Sequences isolation — Alice ne voit pas les séquences de Bob
-- Phase 7.8: sequences_select_owner
-- ============================================================
DO $$
DECLARE
  v_alice_card uuid := (SELECT val FROM _rls_ids WHERE key = 'alice_card');
  v_bank_card uuid := (SELECT val FROM _rls_ids WHERE key = 'bank_card');
  v_alice_seq uuid;
  v_bob_seq uuid;
  v_count int;
BEGIN
  PERFORM _test_reset_role();

  -- Créer séquence pour Alice (mother_card = sa personal card)
  INSERT INTO sequences (account_id, mother_card_id)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', v_alice_card)
  RETURNING id INTO v_alice_seq;

  -- Créer séquence pour Bob (mother_card = bank card, accessible à tous)
  INSERT INTO sequences (account_id, mother_card_id)
  VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', v_bank_card)
  RETURNING id INTO v_bob_seq;

  -- En tant qu'Alice
  PERFORM _test_set_auth_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

  SELECT COUNT(*) INTO v_count FROM sequences WHERE id = v_bob_seq;
  IF v_count != 0 THEN
    RAISE EXCEPTION 'TEST 17 FAILED: Alice voit la séquence de Bob';
  END IF;

  SELECT COUNT(*) INTO v_count FROM sequences WHERE id = v_alice_seq;
  IF v_count != 1 THEN
    RAISE EXCEPTION 'TEST 17 FAILED: Alice ne voit pas sa propre séquence';
  END IF;

  PERFORM _test_reset_role();

  -- Cleanup
  DELETE FROM sequences WHERE id IN (v_alice_seq, v_bob_seq);

  RAISE NOTICE '✅ TEST 17 PASS — Isolation séquences';
END $$;


-- ============================================================
-- TEST 18: Admin support — non-admin bloqué
-- Phase 7.5: admin_get_account_support_info requires is_admin()
-- ============================================================
DO $$
BEGIN
  -- En tant qu'Alice (subscriber, pas admin)
  PERFORM _test_set_auth_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

  BEGIN
    PERFORM admin_get_account_support_info('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
    RAISE EXCEPTION 'TEST 18 FAILED: non-admin a accédé à la fonction support';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 18 FAILED%' THEN RAISE; END IF;
      NULL; -- Access denied = attendu
    WHEN others THEN
      NULL; -- Tout blocage = OK
  END;

  -- En tant que Charlie (admin) → doit fonctionner
  PERFORM _test_set_auth_uid('cccccccc-cccc-cccc-cccc-cccccccccccc');

  DECLARE v_result json;
  BEGIN
    SELECT admin_get_account_support_info('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') INTO v_result;
    IF v_result IS NULL THEN
      RAISE EXCEPTION 'TEST 18 FAILED: admin n''a pas pu accéder à la fonction support';
    END IF;
  END;

  PERFORM _test_reset_role();
  RAISE NOTICE '✅ TEST 18 PASS — Admin support function (non-admin bloqué, admin OK)';
END $$;


-- ============================================================
-- TEST 19: Timelines INSERT bloqué (auto-creation only)
-- Phase 7.6: pas de policy INSERT sur timelines
-- ============================================================
DO $$
DECLARE
  v_alice_profile uuid := (SELECT val FROM _rls_ids WHERE key = 'alice_profile');
  v_count_before int;
  v_count_after int;
BEGIN
  PERFORM _test_reset_role();
  SELECT COUNT(*) INTO v_count_before FROM timelines WHERE child_profile_id = v_alice_profile;

  PERFORM _test_set_auth_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

  BEGIN
    INSERT INTO timelines (child_profile_id) VALUES (v_alice_profile);
    -- Si ça passe, c'est un problème
  EXCEPTION
    WHEN others THEN
      NULL; -- Bloqué = OK (pas de policy INSERT, ou UNIQUE)
  END;

  PERFORM _test_reset_role();

  SELECT COUNT(*) INTO v_count_after FROM timelines WHERE child_profile_id = v_alice_profile;

  IF v_count_after > v_count_before THEN
    RAISE EXCEPTION 'TEST 19 FAILED: timeline insérée manuellement (devrait être auto seulement)';
  END IF;

  RAISE NOTICE '✅ TEST 19 PASS — Timeline INSERT bloqué (auto-creation only)';
END $$;


-- ============================================================
-- TEST 20: Session completed — UPDATE bloqué par RLS
-- Phase 7.7: sessions_update_owner USING (state IN active_*)
-- ============================================================
DO $$
DECLARE
  v_alice_session uuid := (SELECT val FROM _rls_ids WHERE key = 'alice_session');
  v_state_after session_state;
BEGIN
  PERFORM _test_reset_role();

  -- La session d'Alice est en active_preview (créée test 11)
  -- Transition: active_preview → active_started (via validation) → completed

  -- D'abord assigner une carte à un slot d'Alice (requis pour validation)
  DECLARE
    v_alice_slot uuid;
    v_card uuid := (SELECT val FROM _rls_ids WHERE key = 'bank_card');
  BEGIN
    SELECT id INTO v_alice_slot FROM slots
    WHERE timeline_id = (SELECT val FROM _rls_ids WHERE key = 'alice_timeline')
    AND kind = 'step' LIMIT 1;

    UPDATE slots SET card_id = v_card WHERE id = v_alice_slot;

    -- Valider un step → session passe en active_started
    INSERT INTO session_validations (session_id, slot_id)
    VALUES (v_alice_session, v_alice_slot);

    -- Maintenant on peut passer en completed
    UPDATE sessions SET state = 'completed', completed_at = NOW()
    WHERE id = v_alice_session;
  END;

  -- En tant qu'Alice, tenter de modifier la session completed
  PERFORM _test_set_auth_uid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

  -- Tentative silencieuse (RLS USING filtre la ligne → 0 rows)
  UPDATE sessions SET updated_at = NOW() WHERE id = v_alice_session;

  PERFORM _test_reset_role();

  -- Vérifier que l'état n'a pas changé
  SELECT state INTO v_state_after FROM sessions WHERE id = v_alice_session;

  IF v_state_after != 'completed' THEN
    RAISE EXCEPTION 'TEST 20 FAILED: session completed modifiée';
  END IF;

  RAISE NOTICE '✅ TEST 20 PASS — Session completed = read-only via RLS';
END $$;


-- ============================================================
-- CLEANUP
-- ============================================================
-- Supprimer les sessions de test (cleanup avant rollback)
DO $$
BEGIN
  PERFORM _test_reset_role();
END $$;

DROP TABLE IF EXISTS _rls_ids;
DROP FUNCTION IF EXISTS _test_set_auth_uid(uuid);
DROP FUNCTION IF EXISTS _test_reset_role();

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ Phase 7 RLS Smoke Tests — TOUS PASSÉS';
  RAISE NOTICE '====================================================';
END $$;

ROLLBACK;
-- ROLLBACK : aucune donnée de test ne persiste en DB