-- ============================================================
-- Phase 1 — Smoke Tests: Extensions & Enums
-- ============================================================
-- Date: 2026-02-06
-- Migration couverte: 20260130100000_create_extensions_enums.sql
-- Objectif: Vérifier que les extensions et types enum existent
--           avec les bonnes valeurs.
-- Exécution: psql -v ON_ERROR_STOP=1 -f phase1_smoke.sql
--
-- Prérequis: Migrations Phase 1 appliquées.
-- ============================================================

BEGIN;

-- ============================================================
-- TEST 1: Extension pgcrypto disponible
-- gen_random_uuid() doit fonctionner
-- ============================================================
DO $$
DECLARE
  v_uuid uuid;
BEGIN
  v_uuid := gen_random_uuid();

  IF v_uuid IS NULL THEN
    RAISE EXCEPTION 'TEST 1 FAILED: gen_random_uuid() retourne NULL';
  END IF;

  RAISE NOTICE '✅ TEST 1 PASS — Extension pgcrypto active (gen_random_uuid OK)';
END $$;


-- ============================================================
-- TEST 2: 5 enums existent dans pg_type
-- ============================================================
DO $$
DECLARE
  v_count int;
  v_missing text;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_type
  WHERE typname IN (
    'account_status',
    'child_profile_status',
    'card_type',
    'slot_kind',
    'session_state'
  );

  IF v_count != 5 THEN
    SELECT string_agg(expected, ', ') INTO v_missing
    FROM (
      VALUES ('account_status'), ('child_profile_status'), ('card_type'), ('slot_kind'), ('session_state')
    ) AS t(expected)
    WHERE expected NOT IN (SELECT typname FROM pg_type);

    RAISE EXCEPTION 'TEST 2 FAILED: attendu 5 enums, trouvé %. Manquants: %', v_count, v_missing;
  END IF;

  RAISE NOTICE '✅ TEST 2 PASS — 5 enums présents dans pg_type';
END $$;


-- ============================================================
-- TEST 3: account_status — valeurs exactes (free, subscriber, admin)
-- Visitor n'existe PAS en DB (contrat produit: local-only)
-- ============================================================
DO $$
DECLARE
  v_values text[];
BEGIN
  SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)
  INTO v_values
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'account_status';

  IF v_values != ARRAY['free', 'subscriber', 'admin'] THEN
    RAISE EXCEPTION 'TEST 3 FAILED: account_status = %, attendu {free,subscriber,admin}', v_values;
  END IF;

  RAISE NOTICE '✅ TEST 3 PASS — account_status = {free, subscriber, admin}';
END $$;


-- ============================================================
-- TEST 4: account_status — Visitor absent (contrat critique)
-- PRODUCT_MODEL: Visitor n'existe PAS en DB (local-only jusqu'au signup)
-- ============================================================
DO $$
DECLARE
  v_has_visitor boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'account_status' AND e.enumlabel = 'visitor'
  ) INTO v_has_visitor;

  IF v_has_visitor THEN
    RAISE EXCEPTION 'TEST 4 FAILED: account_status contient "visitor" (interdit — Visitor = local-only)';
  END IF;

  RAISE NOTICE '✅ TEST 4 PASS — Visitor absent de account_status (local-only, contrat respecté)';
END $$;


-- ============================================================
-- TEST 5: child_profile_status — valeurs exactes (active, locked)
-- ============================================================
DO $$
DECLARE
  v_values text[];
BEGIN
  SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)
  INTO v_values
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'child_profile_status';

  IF v_values != ARRAY['active', 'locked'] THEN
    RAISE EXCEPTION 'TEST 5 FAILED: child_profile_status = %, attendu {active,locked}', v_values;
  END IF;

  RAISE NOTICE '✅ TEST 5 PASS — child_profile_status = {active, locked}';
END $$;


-- ============================================================
-- TEST 6: card_type — valeurs exactes (bank, personal)
-- ============================================================
DO $$
DECLARE
  v_values text[];
BEGIN
  SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)
  INTO v_values
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'card_type';

  IF v_values != ARRAY['bank', 'personal'] THEN
    RAISE EXCEPTION 'TEST 6 FAILED: card_type = %, attendu {bank,personal}', v_values;
  END IF;

  RAISE NOTICE '✅ TEST 6 PASS — card_type = {bank, personal}';
END $$;


-- ============================================================
-- TEST 7: slot_kind — valeurs exactes (step, reward)
-- ============================================================
DO $$
DECLARE
  v_values text[];
BEGIN
  SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)
  INTO v_values
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'slot_kind';

  IF v_values != ARRAY['step', 'reward'] THEN
    RAISE EXCEPTION 'TEST 7 FAILED: slot_kind = %, attendu {step,reward}', v_values;
  END IF;

  RAISE NOTICE '✅ TEST 7 PASS — slot_kind = {step, reward}';
END $$;


-- ============================================================
-- TEST 8: session_state — valeurs exactes (active_preview, active_started, completed)
-- ============================================================
DO $$
DECLARE
  v_values text[];
BEGIN
  SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)
  INTO v_values
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'session_state';

  IF v_values != ARRAY['active_preview', 'active_started', 'completed'] THEN
    RAISE EXCEPTION 'TEST 8 FAILED: session_state = %, attendu {active_preview,active_started,completed}', v_values;
  END IF;

  RAISE NOTICE '✅ TEST 8 PASS — session_state = {active_preview, active_started, completed}';
END $$;


-- ============================================================
-- CLEANUP
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ Phase 1 Smoke Tests — TOUS PASSÉS (8/8)';
  RAISE NOTICE '====================================================';
END $$;

ROLLBACK;