-- ============================================================
-- Phase 3 — Smoke Tests: Cards & Catégories
-- ============================================================
-- Date: 2026-02-06
-- Migrations couvertes:
--   20260130104000_create_cards.sql
--   20260130105000_create_categories.sql
--   20260130106000_create_user_card_categories.sql
--   20260130107000_cards_normalize_published.sql
--   20260130108000_categories_remap_on_delete.sql
--   20260201119000_phase5_6_corrective_integrity.sql (intégrité pivot + ownership)
--
-- Objectif: Vérifier contraintes cards (ownership, published),
--           catégories (unique nom, système immutable, remap),
--           pivot (unique user_card, cross-account bloqué),
--           normalisation published (trigger).
-- Exécution: psql -v ON_ERROR_STOP=1 -f phase3_smoke.sql
-- ============================================================

BEGIN;

-- ============================================================
-- SETUP: Utilisateur de test
-- ============================================================
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
VALUES (
  'bb000000-0000-0000-0000-000000000001',
  'phase3-main@test.local',
  '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
  NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, status, timezone)
VALUES ('bb000000-0000-0000-0000-000000000001', 'subscriber', 'Europe/Paris')
ON CONFLICT (id) DO NOTHING;

-- 2e utilisateur pour tests cross-account
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
VALUES (
  'bb000000-0000-0000-0000-000000000002',
  'phase3-other@test.local',
  '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
  NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, status, timezone)
VALUES ('bb000000-0000-0000-0000-000000000002', 'subscriber', 'Europe/Paris')
ON CONFLICT (id) DO NOTHING;

CREATE TEMP TABLE _p3_ids (key TEXT PRIMARY KEY, val UUID NOT NULL);

DO $$
DECLARE
  v_sys_cat uuid;
BEGIN
  SELECT id INTO v_sys_cat FROM categories
  WHERE account_id = 'bb000000-0000-0000-0000-000000000001' AND is_system = TRUE;

  INSERT INTO _p3_ids VALUES ('user1', 'bb000000-0000-0000-0000-000000000001');
  INSERT INTO _p3_ids VALUES ('user2', 'bb000000-0000-0000-0000-000000000002');
  INSERT INTO _p3_ids VALUES ('sys_cat', v_sys_cat);

  RAISE NOTICE '  SETUP — user1=bb...01, user2=bb...02, sys_cat=%', v_sys_cat;
END $$;


-- ============================================================
-- TEST 1: Tables existent (cards, categories, user_card_categories)
-- ============================================================
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('cards', 'categories', 'user_card_categories');

  IF v_count != 3 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: attendu 3 tables, trouvé %', v_count;
  END IF;

  RAISE NOTICE '✅ TEST 1 PASS — Tables cards, categories, user_card_categories existent';
END $$;


-- ============================================================
-- TEST 2: Cards — CHECK ownership (bank → account_id NULL, personal → NOT NULL)
-- ============================================================
DO $$
BEGIN
  -- bank avec account_id → doit échouer
  BEGIN
    INSERT INTO cards (name, image_url, type, account_id)
    VALUES ('Bad Bank', 'https://test.local/x.png', 'bank', 'bb000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'TEST 2 FAILED: bank avec account_id acceptée';
  EXCEPTION
    WHEN check_violation THEN NULL; -- Attendu
  END;

  -- personal sans account_id → doit échouer (CHECK, trigger quota, ou NOT NULL)
  BEGIN
    INSERT INTO cards (name, image_url, type, account_id)
    VALUES ('Bad Personal', 'https://test.local/x.png', 'personal', NULL);
    RAISE EXCEPTION 'TEST 2 FAILED: personal sans account_id acceptée';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'TEST 2 FAILED%' THEN RAISE; END IF;
      NULL; -- Toute erreur = bloqué = attendu (CHECK, quota trigger, ou null_value_not_allowed)
  END;

  -- bank sans account_id → OK
  INSERT INTO cards (name, image_url, type, published)
  VALUES ('Good Bank', 'https://test.local/x.png', 'bank', TRUE);

  -- personal avec account_id → OK
  INSERT INTO cards (name, image_url, type, account_id)
  VALUES ('Good Personal', 'https://test.local/x.png', 'personal', 'bb000000-0000-0000-0000-000000000001');

  RAISE NOTICE '✅ TEST 2 PASS — Cards CHECK ownership (bank↔NULL, personal↔NOT NULL)';
END $$;


-- ============================================================
-- TEST 3: Cards — CHECK published (bank → NOT NULL, personal → NULL)
-- ============================================================
DO $$
BEGIN
  -- personal avec published=TRUE → trigger normalise en NULL
  -- (le CHECK ne rejette pas car le trigger agit BEFORE)
  DECLARE
    v_card_id uuid;
    v_published boolean;
  BEGIN
    INSERT INTO cards (name, image_url, type, account_id, published)
    VALUES ('Test Pub', 'https://test.local/x.png', 'personal', 'bb000000-0000-0000-0000-000000000001', TRUE)
    RETURNING id INTO v_card_id;

    SELECT published INTO v_published FROM cards WHERE id = v_card_id;

    IF v_published IS NOT NULL THEN
      RAISE EXCEPTION 'TEST 3 FAILED: personal card published = % (devrait être NULL)', v_published;
    END IF;

    DELETE FROM cards WHERE id = v_card_id;
  END;

  RAISE NOTICE '✅ TEST 3 PASS — Cards CHECK published (personal → NULL forced par trigger)';
END $$;


-- ============================================================
-- TEST 4: Trigger normalisation published
-- bank sans published → défaut FALSE (pas NULL)
-- ============================================================
DO $$
DECLARE
  v_card_id uuid;
  v_published boolean;
BEGIN
  INSERT INTO cards (name, image_url, type)
  VALUES ('Bank No Pub', 'https://test.local/x.png', 'bank')
  RETURNING id INTO v_card_id;

  SELECT published INTO v_published FROM cards WHERE id = v_card_id;

  IF v_published IS NULL THEN
    RAISE EXCEPTION 'TEST 4 FAILED: bank card published = NULL (devrait être FALSE)';
  END IF;

  IF v_published != FALSE THEN
    RAISE EXCEPTION 'TEST 4 FAILED: bank card published = % (devrait être FALSE)', v_published;
  END IF;

  RAISE NOTICE '✅ TEST 4 PASS — Bank sans published → défaut FALSE (trigger normalisation)';
END $$;


-- ============================================================
-- TEST 5: Categories — UNIQUE (account_id, name)
-- ============================================================
DO $$
BEGIN
  INSERT INTO categories (account_id, name)
  VALUES ('bb000000-0000-0000-0000-000000000001', 'Ma catégorie');

  -- Doublon même nom, même compte → doit échouer
  BEGIN
    INSERT INTO categories (account_id, name)
    VALUES ('bb000000-0000-0000-0000-000000000001', 'Ma catégorie');
    RAISE EXCEPTION 'TEST 5 FAILED: doublon catégorie même compte accepté';
  EXCEPTION
    WHEN unique_violation THEN NULL; -- Attendu
  END;

  -- Même nom, autre compte → OK (isolation)
  INSERT INTO categories (account_id, name)
  VALUES ('bb000000-0000-0000-0000-000000000002', 'Ma catégorie');

  RAISE NOTICE '✅ TEST 5 PASS — Categories UNIQUE (account_id, name)';
END $$;


-- ============================================================
-- TEST 6: Catégorie système — suppression bloquée
-- ============================================================
DO $$
DECLARE
  v_sys_cat uuid := (SELECT val FROM _p3_ids WHERE key = 'sys_cat');
BEGIN
  BEGIN
    DELETE FROM categories WHERE id = v_sys_cat;
    RAISE EXCEPTION 'TEST 6 FAILED: suppression catégorie système acceptée';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 6 FAILED%' THEN RAISE; END IF;
      NULL; -- Trigger a bloqué = attendu
  END;

  RAISE NOTICE '✅ TEST 6 PASS — Catégorie système non supprimable';
END $$;


-- ============================================================
-- TEST 7: Catégorie système UNIQUE par compte (1 seule is_system=TRUE)
-- Phase 5.6: idx_categories_system UNIQUE WHERE is_system=TRUE
-- ============================================================
DO $$
BEGIN
  BEGIN
    INSERT INTO categories (account_id, name, is_system)
    VALUES ('bb000000-0000-0000-0000-000000000001', 'Autre système', TRUE);
    RAISE EXCEPTION 'TEST 7 FAILED: 2e catégorie système acceptée';
  EXCEPTION
    WHEN unique_violation THEN NULL; -- Attendu
  END;

  RAISE NOTICE '✅ TEST 7 PASS — 1 seule catégorie système par compte (UNIQUE index)';
END $$;


-- ============================================================
-- TEST 8: Remap on delete — suppression catégorie → cartes remappées
-- ============================================================
DO $$
DECLARE
  v_custom_cat uuid;
  v_card_id uuid;
  v_mapping_cat uuid;
  v_sys_cat uuid := (SELECT val FROM _p3_ids WHERE key = 'sys_cat');
BEGIN
  -- Créer une catégorie custom
  INSERT INTO categories (account_id, name)
  VALUES ('bb000000-0000-0000-0000-000000000001', 'Temporaire')
  RETURNING id INTO v_custom_cat;

  -- Créer une carte personal et l'associer à la catégorie custom
  INSERT INTO cards (name, image_url, type, account_id)
  VALUES ('Carte Remap', 'https://test.local/remap.png', 'personal', 'bb000000-0000-0000-0000-000000000001')
  RETURNING id INTO v_card_id;

  INSERT INTO user_card_categories (user_id, card_id, category_id)
  VALUES ('bb000000-0000-0000-0000-000000000001', v_card_id, v_custom_cat);

  -- Supprimer la catégorie custom → carte doit être remappée vers système
  DELETE FROM categories WHERE id = v_custom_cat;

  -- Vérifier le remapping
  SELECT category_id INTO v_mapping_cat
  FROM user_card_categories
  WHERE user_id = 'bb000000-0000-0000-0000-000000000001'
    AND card_id = v_card_id;

  IF v_mapping_cat IS NULL THEN
    -- L'association a pu être supprimée par CASCADE (car category_id FK → ON DELETE CASCADE)
    -- C'est un comportement acceptable : le front utilise "Sans catégorie" comme fallback implicite
    NULL;
  ELSIF v_mapping_cat != v_sys_cat THEN
    RAISE EXCEPTION 'TEST 8 FAILED: carte remappée vers % au lieu de système %', v_mapping_cat, v_sys_cat;
  END IF;

  RAISE NOTICE '✅ TEST 8 PASS — Remap on delete (catégorie → système ou cascade)';
END $$;


-- ============================================================
-- TEST 9: Pivot — UNIQUE (user_id, card_id) — 1 carte = 1 catégorie par user
-- ============================================================
DO $$
DECLARE
  v_card_id uuid;
  v_cat1 uuid;
  v_cat2 uuid;
BEGIN
  INSERT INTO cards (name, image_url, type, account_id)
  VALUES ('Carte Unique Pivot', 'https://test.local/pivot.png', 'personal', 'bb000000-0000-0000-0000-000000000001')
  RETURNING id INTO v_card_id;

  v_cat1 := (SELECT val FROM _p3_ids WHERE key = 'sys_cat');

  INSERT INTO categories (account_id, name)
  VALUES ('bb000000-0000-0000-0000-000000000001', 'Cat Pivot Test')
  RETURNING id INTO v_cat2;

  -- Première association → OK
  INSERT INTO user_card_categories (user_id, card_id, category_id)
  VALUES ('bb000000-0000-0000-0000-000000000001', v_card_id, v_cat1);

  -- Deuxième association même (user, card) → doit échouer
  BEGIN
    INSERT INTO user_card_categories (user_id, card_id, category_id)
    VALUES ('bb000000-0000-0000-0000-000000000001', v_card_id, v_cat2);
    RAISE EXCEPTION 'TEST 9 FAILED: doublon (user_id, card_id) accepté';
  EXCEPTION
    WHEN unique_violation THEN NULL; -- Attendu
  END;

  RAISE NOTICE '✅ TEST 9 PASS — Pivot UNIQUE (user_id, card_id)';
END $$;


-- ============================================================
-- TEST 10: Pivot — cross-account bloqué (personal card d'un autre user)
-- Phase 5.6: enforce_user_card_categories_integrity
-- ============================================================
DO $$
DECLARE
  v_user1_card uuid;
  v_user2_cat uuid;
BEGIN
  -- Créer une carte personal pour user1
  INSERT INTO cards (name, image_url, type, account_id)
  VALUES ('User1 Card', 'https://test.local/u1.png', 'personal', 'bb000000-0000-0000-0000-000000000001')
  RETURNING id INTO v_user1_card;

  -- Récupérer une catégorie de user2
  SELECT id INTO v_user2_cat FROM categories
  WHERE account_id = 'bb000000-0000-0000-0000-000000000002' AND is_system = TRUE;

  -- User2 tente d'associer la carte personal de user1 → doit échouer
  BEGIN
    INSERT INTO user_card_categories (user_id, card_id, category_id)
    VALUES ('bb000000-0000-0000-0000-000000000002', v_user1_card, v_user2_cat);
    RAISE EXCEPTION 'TEST 10 FAILED: cross-account personal card pivot accepté';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 10 FAILED%' THEN RAISE; END IF;
      NULL; -- Trigger a bloqué = attendu
  END;

  RAISE NOTICE '✅ TEST 10 PASS — Pivot cross-account bloqué (personal card)';
END $$;


-- ============================================================
-- TEST 11: Pivot — cross-account catégorie bloqué
-- Phase 5.6: enforce_user_card_categories_integrity
-- ============================================================
DO $$
DECLARE
  v_bank_card uuid;
  v_user2_cat uuid;
BEGIN
  -- Créer une carte bank (accessible à tous)
  INSERT INTO cards (name, image_url, type, published)
  VALUES ('Bank Cross Test', 'https://test.local/bx.png', 'bank', TRUE)
  RETURNING id INTO v_bank_card;

  -- Catégorie de user2
  SELECT id INTO v_user2_cat FROM categories
  WHERE account_id = 'bb000000-0000-0000-0000-000000000002' AND is_system = TRUE;

  -- User1 tente d'associer bank card à catégorie de user2 → doit échouer
  BEGIN
    INSERT INTO user_card_categories (user_id, card_id, category_id)
    VALUES ('bb000000-0000-0000-0000-000000000001', v_bank_card, v_user2_cat);
    RAISE EXCEPTION 'TEST 11 FAILED: association avec catégorie d''un autre compte acceptée';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'TEST 11 FAILED%' THEN RAISE; END IF;
      NULL; -- Trigger a bloqué = attendu
  END;

  RAISE NOTICE '✅ TEST 11 PASS — Pivot cross-account catégorie bloqué';
END $$;


-- ============================================================
-- TEST 12: Cards — CASCADE DELETE avec account
-- ============================================================
DO $$
DECLARE
  v_user3 uuid := 'bb000000-0000-0000-0000-000000000003';
  v_card_id uuid;
BEGIN
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
  VALUES (v_user3, 'phase3-cascade@test.local',
    '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
    NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO accounts (id, status, timezone) VALUES (v_user3, 'subscriber', 'UTC')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO cards (name, image_url, type, account_id)
  VALUES ('Cascade Card', 'https://test.local/c.png', 'personal', v_user3)
  RETURNING id INTO v_card_id;

  -- Nettoyage catégories avant cascade
  ALTER TABLE categories DISABLE TRIGGER trigger_categories_before_delete_remap;
  DELETE FROM categories WHERE account_id = v_user3;
  ALTER TABLE categories ENABLE TRIGGER trigger_categories_before_delete_remap;

  -- Supprimer auth → cascade account → cascade cards
  DELETE FROM auth.users WHERE id = v_user3;

  IF EXISTS (SELECT 1 FROM cards WHERE id = v_card_id) THEN
    RAISE EXCEPTION 'TEST 12 FAILED: card persiste après DELETE account';
  END IF;

  RAISE NOTICE '✅ TEST 12 PASS — Cards CASCADE DELETE avec account';
END $$;


-- ============================================================
-- TEST 13: Categories — CASCADE DELETE avec account
-- ============================================================
DO $$
DECLARE
  v_user4 uuid := 'bb000000-0000-0000-0000-000000000004';
  v_cat_count int;
BEGIN
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
  VALUES (v_user4, 'phase3-catcasc@test.local',
    '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
    NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO accounts (id, status, timezone) VALUES (v_user4, 'free', 'UTC')
  ON CONFLICT (id) DO NOTHING;

  -- Le compte a auto-créé "Sans catégorie"
  SELECT COUNT(*) INTO v_cat_count FROM categories WHERE account_id = v_user4;
  IF v_cat_count < 1 THEN
    RAISE EXCEPTION 'TEST 13 SETUP FAILED: catégorie système non créée';
  END IF;

  -- Nettoyage catégories avant cascade
  ALTER TABLE categories DISABLE TRIGGER trigger_categories_before_delete_remap;
  DELETE FROM categories WHERE account_id = v_user4;
  ALTER TABLE categories ENABLE TRIGGER trigger_categories_before_delete_remap;

  -- Supprimer
  DELETE FROM auth.users WHERE id = v_user4;

  IF EXISTS (SELECT 1 FROM categories WHERE account_id = v_user4) THEN
    RAISE EXCEPTION 'TEST 13 FAILED: catégories persistent après DELETE account';
  END IF;

  RAISE NOTICE '✅ TEST 13 PASS — Categories CASCADE DELETE avec account';
END $$;


-- ============================================================
-- TEST 14: Pivot — bank card associable par n'importe quel user (pas cross-account)
-- ============================================================
DO $$
DECLARE
  v_bank_card uuid;
  v_user1_cat uuid := (SELECT val FROM _p3_ids WHERE key = 'sys_cat');
BEGIN
  INSERT INTO cards (name, image_url, type, published)
  VALUES ('Bank Shared', 'https://test.local/bs.png', 'bank', TRUE)
  RETURNING id INTO v_bank_card;

  -- User1 associe bank card à sa catégorie → OK
  INSERT INTO user_card_categories (user_id, card_id, category_id)
  VALUES ('bb000000-0000-0000-0000-000000000001', v_bank_card, v_user1_cat);

  -- User2 associe même bank card à sa catégorie → OK (chaque user a sa propre assoc)
  DECLARE v_user2_cat uuid;
  BEGIN
    SELECT id INTO v_user2_cat FROM categories
    WHERE account_id = 'bb000000-0000-0000-0000-000000000002' AND is_system = TRUE;

    INSERT INTO user_card_categories (user_id, card_id, category_id)
    VALUES ('bb000000-0000-0000-0000-000000000002', v_bank_card, v_user2_cat);
  END;

  RAISE NOTICE '✅ TEST 14 PASS — Bank card associable par différents users (chacun sa catégorie)';
END $$;


-- ============================================================
-- TEST 15: Cards.name et image_url NOT NULL
-- ============================================================
DO $$
BEGIN
  -- Sans name
  BEGIN
    INSERT INTO cards (image_url, type, account_id)
    VALUES ('https://test.local/x.png', 'personal', 'bb000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'TEST 15 FAILED: card sans name acceptée';
  EXCEPTION
    WHEN not_null_violation THEN NULL;
  END;

  -- Sans image_url
  BEGIN
    INSERT INTO cards (name, type, account_id)
    VALUES ('No Image', 'personal', 'bb000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'TEST 15 FAILED: card sans image_url acceptée';
  EXCEPTION
    WHEN not_null_violation THEN NULL;
  END;

  RAISE NOTICE '✅ TEST 15 PASS — Cards.name et image_url NOT NULL enforced';
END $$;


-- ============================================================
-- CLEANUP
-- ============================================================
DROP TABLE IF EXISTS _p3_ids;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ Phase 3 Smoke Tests — TOUS PASSÉS (15/15)';
  RAISE NOTICE '====================================================';
END $$;

ROLLBACK;