-- Migration: Import Visitor timelines + slots → nouveau compte
-- Date: 2026-04-01
--
-- Contexte:
-- Lors du passage Visitor → compte authentifié, les slots locaux (IndexedDB)
-- doivent être importés dans la timeline du profil enfant auto-créé.
--
-- Problème architectural:
-- 3 triggers forment un deadlock pour l'import atomique :
--   - slots_enforce_single_reward  : bloque INSERT d'un 2e reward
--   - slots_enforce_min_step       : bloque DELETE du dernier step
--   - slots_enforce_min_reward     : bloque DELETE du dernier reward
--
-- Solution: pattern GUC local (app.bypass_slot_guards), transactionnel et
-- thread-safe. Les 3 triggers vérifient ce flag avant d'appliquer leurs
-- invariants. set_config(..., true) = LOCAL : reset automatique en fin de
-- transaction. Aucune autre session n'est affectée.
--
-- A2 (device_id): géré nativement par useDeviceRegistration (hook existant).
-- Aucune migration supplémentaire nécessaire.
--
-- Format JSON attendu pour import_visitor_timelines_slots_batch:
-- {
--   "slots": [
--     { "kind": "step",   "position": 0, "card_id": "uuid", "tokens": 3 },
--     { "kind": "step",   "position": 1, "card_id": null,   "tokens": 0 },
--     { "kind": "reward", "position": 2, "card_id": null,   "tokens": null }
--   ]
-- }

BEGIN;

-- ============================================================
-- PARTIE 1 : Bypass transactionnel sur les 3 triggers de garde
-- ============================================================

-- 1a. slots_enforce_min_reward
CREATE OR REPLACE FUNCTION public.slots_enforce_min_reward()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  reward_count      INTEGER;
  is_cascade_context BOOLEAN;
BEGIN
  -- Bypass pour import Visitor (app.bypass_slot_guards = true, LOCAL à la transaction)
  IF current_setting('app.bypass_slot_guards', true) = 'true' THEN
    RETURN OLD;
  END IF;

  -- Détecter cascade (suppression timeline/profil/compte)
  SELECT EXISTS(SELECT 1 FROM timelines WHERE id = OLD.timeline_id)
    INTO is_cascade_context;
  IF NOT is_cascade_context THEN
    RETURN OLD;
  END IF;

  IF OLD.kind = 'reward' THEN
    SELECT COUNT(*) INTO reward_count
    FROM slots
    WHERE timeline_id = OLD.timeline_id
      AND kind = 'reward'
      AND id != OLD.id;

    IF reward_count = 0 THEN
      RAISE EXCEPTION
        'Impossible de supprimer le dernier slot Récompense de la timeline (id: %). '
        'Une timeline doit toujours contenir au moins 1 slot Récompense (peut être vide).',
        OLD.timeline_id;
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

-- 1b. slots_enforce_min_step
CREATE OR REPLACE FUNCTION public.slots_enforce_min_step()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  step_count        INTEGER;
  is_cascade_context BOOLEAN;
BEGIN
  IF current_setting('app.bypass_slot_guards', true) = 'true' THEN
    RETURN OLD;
  END IF;

  SELECT EXISTS(SELECT 1 FROM timelines WHERE id = OLD.timeline_id)
    INTO is_cascade_context;
  IF NOT is_cascade_context THEN
    RETURN OLD;
  END IF;

  IF OLD.kind = 'step' THEN
    SELECT COUNT(*) INTO step_count
    FROM slots
    WHERE timeline_id = OLD.timeline_id
      AND kind = 'step'
      AND id != OLD.id;

    IF step_count = 0 THEN
      RAISE EXCEPTION
        'Impossible de supprimer le dernier slot Étape de la timeline (id: %). '
        'Une timeline doit contenir au minimum 1 slot Étape.',
        OLD.timeline_id;
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

-- 1c. slots_enforce_single_reward
CREATE OR REPLACE FUNCTION public.slots_enforce_single_reward()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  IF current_setting('app.bypass_slot_guards', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.kind = 'reward' THEN
      SELECT EXISTS (
        SELECT 1 FROM slots
        WHERE timeline_id = NEW.timeline_id AND kind = 'reward'
      ) INTO v_exists;
      IF v_exists THEN
        RAISE EXCEPTION
          'Invariant violation: timeline % already has a reward slot',
          NEW.timeline_id
          USING HINT = 'Only one reward slot is allowed per timeline';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.kind = 'reward' THEN
      IF NEW.kind <> 'reward' THEN
        RAISE EXCEPTION
          'Invariant violation: reward slot cannot change kind (slot_id=%)', OLD.id;
      END IF;
      IF NEW.timeline_id <> OLD.timeline_id THEN
        RAISE EXCEPTION
          'Invariant violation: reward slot cannot change timeline_id (slot_id=%)', OLD.id;
      END IF;
      RETURN NEW;
    END IF;

    IF NEW.kind = 'reward' THEN
      SELECT EXISTS (
        SELECT 1 FROM slots
        WHERE timeline_id = NEW.timeline_id
          AND kind = 'reward'
          AND id <> NEW.id
      ) INTO v_exists;
      IF v_exists THEN
        RAISE EXCEPTION
          'Invariant violation: timeline % already has a reward slot',
          NEW.timeline_id
          USING HINT = 'Only one reward slot is allowed per timeline';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================
-- PARTIE 2 : RPC import_visitor_timelines_slots_batch
-- ============================================================

CREATE OR REPLACE FUNCTION public.import_visitor_timelines_slots_batch(
  p_slots_json JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id   UUID;
  v_timeline_id  UUID;
  v_slot         JSONB;
  v_kind         public.slot_kind;
  v_position     INTEGER;
  v_card_id      UUID;
  v_tokens       INTEGER;
  v_count        INTEGER := 0;
  v_step_count   INTEGER;
  v_reward_count INTEGER;
BEGIN
  -- 1. Authentification
  v_account_id := auth.uid();
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: import_visitor_timelines_slots_batch'
      USING ERRCODE = '42501',
            HINT    = 'Sign in with an authenticated account.';
  END IF;

  -- 2. Validation JSON
  IF p_slots_json IS NULL OR NOT (p_slots_json ? 'slots') THEN
    RAISE EXCEPTION 'Invalid JSON: slots array required'
      USING ERRCODE = '22023';
  END IF;

  -- 3. Tableau vide → succès sans modification
  IF jsonb_array_length(p_slots_json->'slots') = 0 THEN
    RETURN jsonb_build_object(
      'success',         true,
      'imported_count',  0,
      'message',        'no_slots_to_import'
    );
  END IF;

  -- 4. Validation métier : au moins 1 step + exactement 1 reward
  SELECT
    COUNT(*) FILTER (WHERE (s->>'kind') = 'step'),
    COUNT(*) FILTER (WHERE (s->>'kind') = 'reward')
  INTO v_step_count, v_reward_count
  FROM jsonb_array_elements(p_slots_json->'slots') s;

  IF v_step_count < 1 THEN
    RAISE EXCEPTION 'Payload invalide: au moins 1 slot Étape requis'
      USING ERRCODE = '22023';
  END IF;

  IF v_reward_count <> 1 THEN
    RAISE EXCEPTION 'Payload invalide: exactement 1 slot Récompense requis (reçu: %)',
      v_reward_count
      USING ERRCODE = '22023';
  END IF;

  -- 5. Trouver la timeline du profil enfant actif (premier créé)
  SELECT t.id INTO v_timeline_id
  FROM public.timelines t
  JOIN public.child_profiles cp ON cp.id = t.child_profile_id
  WHERE cp.account_id = v_account_id
    AND cp.status = 'active'
  ORDER BY cp.created_at ASC
  LIMIT 1;

  IF v_timeline_id IS NULL THEN
    RAISE EXCEPTION 'Aucun profil enfant actif trouvé pour ce compte'
      USING ERRCODE = '22023';
  END IF;

  -- 6. Activer le bypass transactionnel (reset auto en fin de transaction)
  PERFORM set_config('app.bypass_slot_guards', 'true', true);

  -- 7. Supprimer les slots auto-créés existants (minimal step + reward)
  DELETE FROM public.slots WHERE timeline_id = v_timeline_id;

  -- 8. Insérer les slots Visitor
  FOR v_slot IN
    SELECT * FROM jsonb_array_elements(p_slots_json->'slots')
  LOOP
    v_kind     := (v_slot->>'kind')::public.slot_kind;
    v_position := (v_slot->>'position')::INTEGER;
    v_card_id  := (v_slot->>'card_id')::UUID;    -- NULL si JSON null
    v_tokens   := (v_slot->>'tokens')::INTEGER;  -- NULL si JSON null

    -- Validation individuelle
    IF v_kind IS NULL OR v_position IS NULL OR v_position < 0 THEN
      RAISE EXCEPTION 'Slot invalide: kind et position >= 0 requis'
        USING ERRCODE = '22023';
    END IF;

    IF v_kind = 'step' AND (v_tokens IS NULL OR v_tokens < 0 OR v_tokens > 5) THEN
      RAISE EXCEPTION 'Slot step invalide: tokens doit être 0-5 (reçu: %)', v_tokens
        USING ERRCODE = '22023';
    END IF;

    IF v_kind = 'reward' AND v_tokens IS NOT NULL THEN
      RAISE EXCEPTION 'Slot reward invalide: tokens doit être NULL'
        USING ERRCODE = '22023';
    END IF;

    -- INSERT avec fallback card_id = NULL si la carte a été supprimée (FK violation)
    -- Toute autre erreur remonte normalement (contrainte, position dupliquée, etc.)
    BEGIN
      INSERT INTO public.slots (timeline_id, kind, position, card_id, tokens)
      VALUES (v_timeline_id, v_kind, v_position, v_card_id, v_tokens);
    EXCEPTION
      WHEN foreign_key_violation THEN
        -- Carte supprimée depuis la session Visitor → slot importé vide
        INSERT INTO public.slots (timeline_id, kind, position, card_id, tokens)
        VALUES (v_timeline_id, v_kind, v_position, NULL, v_tokens);
    END;

    v_count := v_count + 1;
  END LOOP;

  -- 9. Résultat
  RETURN jsonb_build_object(
    'success',        true,
    'imported_count', v_count,
    'timeline_id',    v_timeline_id
  );

END;
$$;

COMMENT ON FUNCTION public.import_visitor_timelines_slots_batch(JSONB) IS
'Import atomique des slots Visitor (IndexedDB) vers la timeline du nouveau compte.
 - Remplace les slots auto-créés par les slots Visitor.
 - Bypass transactionnel des guards via app.bypass_slot_guards (LOCAL à la transaction).
 - Carte supprimée : slot importé avec card_id = NULL (contrat §7.3).
 - SECURITY INVOKER : utilise les RLS existantes de l''utilisateur authentifié.';

GRANT EXECUTE ON FUNCTION public.import_visitor_timelines_slots_batch(JSONB) TO authenticated;

-- ============================================================
-- SMOKE TESTS
-- ============================================================
DO $$
DECLARE
  v_ok BOOLEAN;
BEGIN
  -- Test 1 : bypass inactif par défaut
  v_ok := (current_setting('app.bypass_slot_guards', true) IS DISTINCT FROM 'true');
  ASSERT v_ok, 'FAIL: bypass doit être inactif par défaut';

  -- Test 2 : set_config local fonctionne
  PERFORM set_config('app.bypass_slot_guards', 'true', true);
  v_ok := (current_setting('app.bypass_slot_guards', true) = 'true');
  ASSERT v_ok, 'FAIL: set_config local doit activer le bypass';

  -- Test 3 : RPC existe dans pg_proc
  v_ok := EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'import_visitor_timelines_slots_batch'
  );
  ASSERT v_ok, 'FAIL: RPC import_visitor_timelines_slots_batch doit exister';

  -- Test 4 : les 3 fonctions trigger modifiées existent
  v_ok := (
    SELECT COUNT(*) = 3 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'slots_enforce_min_reward',
        'slots_enforce_min_step',
        'slots_enforce_single_reward'
      )
  );
  ASSERT v_ok, 'FAIL: les 3 trigger functions doivent exister';

  RAISE NOTICE 'Smoke tests PASS: import_visitor_timelines_slots_batch OK';
END;
$$;

COMMIT;
